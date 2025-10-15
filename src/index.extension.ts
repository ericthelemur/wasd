
import type NodeCG from '@nodecg/types';
import { storeNodeCG } from './common/utils';

module.exports = function (nodecg: NodeCG.ServerAPI) {
    storeNodeCG(nodecg);
    require("./common/exit-hooks");

    require("./tiltify/extension/index.extension");
    require("./countdown/extension/index.extension");
    require("./dev/extension/index.extension");
    require("./donos/extension/index.extension");
    require("./loupedeck/extension/index.extension");
    require("./mixer/extension/index.extension");
    require("./obs/extension/index.extension");
    require("./people/extension/index.extension");
    require("./ticker/extension/index.extension");
    require("./wasd/extension/index.extension");
    require("./external/extension/index.extension");
};

// process.on("beforeExit", () => {
//     console.log("Before Exit");
// });

// process.on("exit", () => {
//     console.log("Exit");
// });

// process.on("uncaughtException", () => {
//     console.log("Uncaught Exception");
//     // process.exit(0);
// });

// function signalHandler() {
//     console.log("SIG");
//     process.exit();
// }

// // Make sure to exit on interrupt
// process.on('SIGINT', signalHandler)
// process.on('SIGTERM', signalHandler)
// process.on('SIGQUIT', signalHandler)


