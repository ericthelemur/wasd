import { Server } from 'socket.io';
import { io } from 'socket.io-client';

import { ClientToServerEvents, ServerToClientEvents } from '@nodecg/types/types/socket-protocol';

import { externalServer } from './htmlproxy';

const ioServer = new Server(externalServer);


// Create new socket to actual server, keep one spare for speed of connection
let index = 1;
function createIO() {
    const i = index;
    index++;
    const socket = io("ws://localhost:9090", { reconnectionDelayMax: 1000, reconnectionAttempts: 3, query: {token: "aaa2e21f-e092-45ff-a350-722ce9fc652d" }, forceNew: true });
    socket.on("connected", () => console.log(`[${i}] connected`));
    socket.on("disconnect", () => console.log(`[${i}] disconnect`));
    socket.onAny((e, ...args) => console.log(`[${i}] ${e} ${args}`));
    return socket;
}

let existing = createIO();

ioServer.on("connection", (cs) => {
    const clientSocket = cs;
    const upstream = existing;
    existing = createIO();


    // Only forward specific events TODO move to replicant
    const allowed = {
        "replicants": {
            "^.*:login$": "B",
            "^tiltify:.*$": "R",
            "tiltify*:webhookLogin$": "B",
            "^donos:donoSettings:.*$": "RW",
            "^mixer:.*": "R",
            "^nodecg-speedcontrol:(runDataActiveRun|timer)": "R"
        },
        "messages": {
            "^tiltify:.*$": "RW",
            "^.*:(dis)?connect$": "B",
            // /^connected$/        // connected is blocked from being called by external, but will still receive
            "^mixer:message$": "R",
            "^mixer:(setMute|setTalkback|setTechMuted)$": "RW",
            "^nodecg-speedcontrol:timer(Start|Stop|Pause)": "W"
        }
    }

    const safeRooms = ["wasd"];

    const repVals: [RegExp, string][] = Object.entries(allowed.replicants).map(([r, rwb]) => [new RegExp(r), rwb.toUpperCase()]);
    const readReplicants = repVals.filter(([r, rwb]) => rwb.includes("R")).map(([r, rwb]) => r);
    const writeReplicants = repVals.filter(([r, rwb]) => rwb.includes("W")).map(([r, rwb]) => r);
    const replicantBlacklist = repVals.filter(([r, rwb]) => rwb.includes("B")).map(([r, rwb]) => r);

    const msgVals: [RegExp, string][] = Object.entries(allowed.messages).map(([m, rwb]) => [new RegExp(m), rwb.toUpperCase()]);
    const readMessages = msgVals.filter(([m, rwb]) => rwb.includes("R")).map(([m, rwb]) => m);
    const writeMessages = msgVals.filter(([m, rwb]) => rwb.includes("W")).map(([m, rwb]) => m);
    const messageBlacklist = msgVals.filter(([m, rwb]) => rwb.includes("B")).map(([m, rwb]) => m);

    function reListMatch(value: string, list: RegExp[], blacklist: RegExp[]=[]) {
        // If value matches one of list, but none of blacklist
        return list.some(re => re.test(value)) && !blacklist.some(re => re.test(value));
    }


    // Forward events client to server
    clientSocket.onAny((event: keyof ClientToServerEvents, r: any, cb: (...resp: any[]) => void) => {
        console.log("C->S", event, r, cb);
        if (shouldProxyCtoS(event, r)) {
            upstream.emit(event, r, (...resp: any) => { 
                console.log("C->S R", resp);
                cb(...resp);
            });
        }
    });

    type Arg<T extends keyof ClientToServerEvents> = Parameters<ClientToServerEvents[T]>[0];
    function shouldProxyCtoS<T extends keyof ClientToServerEvents>(event: T, request: Arg<T>) {
        // Allow set replicants/messages - both have blacklists to hide login information

        if (event == "joinRoom") {  // joinRoom event - start of any replicant messaging
            const r = request as Arg<"joinRoom">;
            return safeRooms.includes(r) || reListMatch(r.replace("replicant:", ""), readReplicants, replicantBlacklist);
        } else if (event == "replicant:declare") {  // declare replicant event - fetches the replicant value
            const r = request as Arg<"replicant:declare">;
            return reListMatch(`${r.namespace}:${r.name}`, readReplicants, replicantBlacklist);
        } else if (event == "replicant:proposeOperations") {  // propose change to replicant (propose as may be rejected)
            const r = request as Arg<"replicant:proposeOperations">;
            return reListMatch(`${r.namespace}:${r.name}`, writeReplicants, replicantBlacklist);
        } else if (event == "message") {  // NodeCG message
            const r = request as Arg<"message">;
            return reListMatch(`${r.bundleName}:${r.messageName}`, writeMessages, messageBlacklist.concat([/^connected$/])); // Exclude external from sending connected (but can receive)
        }
        return false;
    }


    // Forward events server to client
    upstream.onAny((event: keyof ServerToClientEvents, r: any) => {
        console.log("S->C", event, r);
        if (shouldProxyStoC(event, r)) {
            clientSocket.emit(event, r);
        }
    });

    type ArgStoC<T extends keyof ServerToClientEvents> = Parameters<ServerToClientEvents[T]>[0];
    function shouldProxyStoC<T extends keyof ServerToClientEvents>(event: T, args: ArgStoC<T>) {
        if (event == "replicant:operations") {
            const r = args as ArgStoC<"replicant:operations">;
            return reListMatch(`${r.namespace}:${r.name}`, readReplicants, replicantBlacklist);
        } else if (event == "message") {
            const r = args as ArgStoC<"message">;
            return reListMatch(`${r.bundleName}:${r.messageName}`, readMessages);
        }
        return false;
    }


    // Proxy error & disconnect
    upstream.on("error", (e) => {
        console.log("Upstream error", e);
        upstream.disconnect();
        (clientSocket as any).disconnect();
    })

    clientSocket.on("error", (e) => {
        console.log("Client error", e);
        upstream.disconnect();
        (clientSocket as any).disconnect();
    });

    upstream.on("disconnect", (e) => {
        console.log("Upstream disconnect", e);
        upstream.disconnect();
        (clientSocket as any).disconnect();
    })

    clientSocket.on("disconnect", (e) => {
        console.log("Client disconnect", e);
        upstream.disconnect();
        (clientSocket as any).disconnect();
    });
});