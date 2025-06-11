import { getNodeCG } from '../../common/utils';
import { isEmpty } from './utils';

export let WEBHOOK_MODE = true;

const nodecg = getNodeCG();

let valid = true;
if (isEmpty(nodecg.bundleConfig.tiltify_webhook_secret) || isEmpty(nodecg.bundleConfig.tiltify_webhook_id)) {
	WEBHOOK_MODE = false
	nodecg.log.warn("Running without webhooks!! Please set webhook secret, and webhook id in cfg/nodecg-tiltify.json [See README]");
}

if (isEmpty(nodecg.bundleConfig.tiltify_client_id)) {
	nodecg.log.warn("Please set tiltify_client_id in cfg/nodecg-tiltify.json");
	valid = false;
}

if (isEmpty(nodecg.bundleConfig.tiltify_client_secret)) {
	nodecg.log.warn("Please set tiltify_client_secret in cfg/nodecg-tiltify.json");
	valid = false;
}

if (isEmpty(nodecg.bundleConfig.tiltify_campaign_id)) {
	nodecg.log.warn("Please set tiltify_campaign_id in cfg/nodecg-tiltify.json");
	valid = false;
}

if (valid) {
	// Then load replicants
	require("./utils/replicants");

	// Then load everything else
	require("./tiltifyHandlers");
	require("./messages");
}
