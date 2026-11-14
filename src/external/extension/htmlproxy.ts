import cookie from 'cookie';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import http from 'http';
import HTTPProxy from 'http-proxy';
import mime from 'mime';
import path from 'path';
import { pipeline } from 'stream/promises';
import url from 'url';

import { rootPaths } from '@nodecg/internal-util';

import { getNodeCG } from '../../common/utils';
import { checkAuth } from './auth';

const nodecg = getNodeCG();
const log = new nodecg.Logger("external");

// const proxy = HTTPProxy.createProxyServer({
//   target: 'http://localhost:9090',
//   ws: false
// });

export const pathsFromNodeCG = [
    /^\/socket.io\/*/,
    /^\/socket.js$/,
    /^\/api.js$/
]

// Check auth, if successful, assign token cookie
async function handleAuthCookies(req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage>) {
    if (req.url) {
        const { key, url, source, error } = await checkAuth(req);
        if (error) log.error(error);
        
        if (key) {
            // Save to cookie if from url
            if (source == "url") {
                res.appendHeader("Set-Cookie", cookie.serialize("socketToken", key));
            }

            // Move mic to cookie
            const mic = url.get("mic");
            if (mic) res.appendHeader("Set-Cookie", cookie.serialize("mic", mic));

            // proxy.web(req, res);
            return true;
        }
        res.writeHead(403);
        res.end(`Auth Error: ${error || "unknown"}`);
    }
}

function error(res: http.ServerResponse<http.IncomingMessage>) {
    res.writeHead(302, { 'Content-Type': 'text/plain', location: "/error" });
    res.end();
}


// Basic HTTP processing, calls processRequest and catches all errors 
export const externalServer = http.createServer(async (req, res) => {
    await processRequest(req, res).catch(e => {
        log.error("Proxy error", e);
        try {
            error(res);
        } catch (e) {
            log.error("Failed responding with error", e);
        }
    });
})

async function processRequest(req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage>) {
    if (!req.url) {
        res.writeHead(404);
        return res.end("No URL");
    }
    // Bypass auth if error page
    const isError = /error(\.html)?/.test(req.url);
    if (isError || await handleAuthCookies(req, res)) {
        try {
            const isNodecg = pathsFromNodeCG.some(r => r.test(req.url!));

            const url = new URL("http://localhost" + req.url);
            const root = isNodecg ?     // Serve from nodecg internal client files or shared directory
                path.join(rootPaths.nodecgInstalledPath, "dist/client") :
                path.join(rootPaths.runtimeRootPath, "external");
            let filePath = path.join(root, url.pathname);
            
            if (!filePath.startsWith(root)) {   // If playing path tricks, forbid
                res.writeHead(403);
                return res.end("Forbidden");
            }
            
            let stat = await fs.stat(filePath).catch((e: {code: string}) => e);
            if ("code" in stat && !path.extname(filePath)) {    // If error and no extension, try adding .html
                filePath += ".html";
                stat = await fs.stat(filePath);
            } else if ("isDirectory" in stat && stat.isDirectory()) {   // If directory, look at index.html
                filePath = path.join(filePath, 'index.html');
                stat = await fs.stat(filePath);
            } else if ("code" in stat) {    // If error, rethrow error
                log.debug("File not found", filePath);
                throw stat;
            }
            log.debug("Serving", filePath);


            // Read relevant file and send to requester
            let data = await fs.readFile(filePath, { encoding: "utf8"});
            res.writeHead(200, { 'Content-Type': mime.lookup(filePath, "application/octet-stream") });
            
            if (path.extname(filePath) == ".html") data = insertScripts(data);
            res.end(data);
        } catch (err: { code: string } | any) {
            // Produce basic error page
            const isNotFound = err?.code === 'ENOENT';
            if (!isNotFound) log.error(err);
            res.writeHead(isNotFound ? 404 : 500);
            res.end(isNotFound ? 'Not Found' : 'Internal Server Error');
        }
    }
}

function insertScripts(content: string) {
    // Insert NodeCG scripts at end of <head>
    // Required to emulate NodeCG dashboard

    const scripts = [];
    if (nodecg.config.sentry.enabled) { // Include sentry
        scripts.unshift(
            '<script src="/node_modules/@sentry/browser/build/bundle.es6.min.js"></script>',
            '<script src="/sentry.js"></script>',
        );
    }

    scripts.push(`<script>globalThis.ncgConfig = ${JSON.stringify(nodecg.config)};</script>`);
    scripts.push('<script src="/socket.io/socket.io.js"></script>');
    scripts.push('<script src="/socket.js"></script>');
    scripts.push('<script src="/api.js"></script>');
    const partialBundle = {
        name: nodecg.bundleName, config: nodecg.bundleConfig, version: nodecg.bundleVersion, git: nodecg.bundleGit, _hasSounds: false
    };
    scripts.push(`<script>globalThis.nodecg = new globalThis.NodeCG(${JSON.stringify(partialBundle)}, globalThis.socket)</script>`);

    const concattedScripts = scripts.join('\n');

    const inserted = content.replace("</head>", `${concattedScripts}\n</head>`);
    return inserted;
}


externalServer.listen(8080, () => {
    log.info('External server running on port 8080');
});