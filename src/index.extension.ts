
import type NodeCG from '@nodecg/types';
import { storeNodeCG } from './common/utils';

module.exports = function (nodecg: NodeCG.ServerAPI) {
    storeNodeCG(nodecg);

    require("./countdown/extension/index.extension");
    require("./dev/extension/index.extension");
    require("./mixer/extension/index.extension");
    require("./obs/extension/index.extension");
    require("./people/extension/index.extension");
    require("./ticker/extension/index.extension");
    require("./wasd/extension/index.extension");
};
