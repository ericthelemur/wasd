import { getNodeCG } from '../../common/utils';

const nodecg = getNodeCG();
const log = new nodecg.Logger("external");

const roles = require("./roles");
const htmlproxy = require("./htmlproxy");
const wsproxy = require("./wsproxy");

