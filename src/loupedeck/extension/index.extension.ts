import { listenTo } from '../messages';
import { Loupedeck } from './loupedeck';

export const loupedeck = new Loupedeck();

const listeners = require("./listeners");
const buttonStateChecker = require("./buttonStateChecker");