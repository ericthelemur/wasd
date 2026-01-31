import { listenTo } from "../messages";
import { getNodeCG, getSpeedControlUtil } from "../../common/utils";
import { DiscordCommPoint } from "./discord";

const nodecg = getNodeCG();
const speedcontrolutil = getSpeedControlUtil();

export const discord = new DiscordCommPoint();

speedcontrolutil.listenFor("changeToNextRun", () => {

})

listenTo("updateEvents", () => {

})