import { getNodeCG } from '../../common/utils';
import { isEmpty } from './utils';

export let WEBHOOK_MODE = true;

const nodecg = getNodeCG();
export const log = new nodecg.Logger("tiltify");

let valid = true;
if (isEmpty(nodecg.bundleConfig.tiltify_webhook_secret) || isEmpty(nodecg.bundleConfig.tiltify_webhook_id)) {
	WEBHOOK_MODE = false;
	log.warn("Running without webhooks. Please set webhook secret, and webhook id in cfg/wasd.js");
}

if (isEmpty(nodecg.bundleConfig.tiltify_client_id)) {
	log.warn("Please set tiltify_client_id in cfg/wasd.js");
	valid = false;
}

if (isEmpty(nodecg.bundleConfig.tiltify_client_secret)) {
	log.warn("Please set tiltify_client_secret in cfg/wasd.js");
	valid = false;
}

if (isEmpty(nodecg.bundleConfig.tiltify_campaign_id)) {
	log.warn("Please set tiltify_campaign_id in cfg/wasd.js");
	valid = false;
}

if (valid) {
	// Then load replicants
	require("./utils/replicants");

	// Then load everything else
	require("./tiltifyHandlers");
	require("./messages");
}
