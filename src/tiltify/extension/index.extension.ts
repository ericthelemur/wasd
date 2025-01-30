import type NodeCG from '@nodecg/types';
import type { Donation, Donations, Configschema, Alldonations, Total, Polls, Schedule, Targets, Rewards, Milestones, Donors, Campaign } from '../types/schemas';
import { EventEmitter } from 'node:events';
import { storeNodeCG, isEmpty } from './utils';

export let WEBHOOK_MODE = true;

module.exports = function (nodecg: NodeCG.ServerAPI<Configschema>) {
	if (isEmpty(nodecg.bundleConfig.tiltify_webhook_secret) || isEmpty(nodecg.bundleConfig.tiltify_webhook_id)) {
		WEBHOOK_MODE = false
		nodecg.log.info("Running without webhooks!! Please set webhook secret, and webhook id in cfg/nodecg-tiltify.json [See README]");
		return;
	}

	if (isEmpty(nodecg.bundleConfig.tiltify_client_id)) {
		nodecg.log.info("Please set tiltify_client_id in cfg/nodecg-tiltify.json");
		return;
	}

	if (isEmpty(nodecg.bundleConfig.tiltify_client_secret)) {
		nodecg.log.info("Please set tiltify_client_secret in cfg/nodecg-tiltify.json");
		return;
	}

	if (isEmpty(nodecg.bundleConfig.tiltify_campaign_id)) {
		nodecg.log.info(
			"Please set tiltify_campaign_id in cfg/nodecg-tiltify.json"
		);
		return;
	}

	// Store nodecg for retrieval elsewhere
	storeNodeCG(nodecg);
	// Then load replicants
	require("./utils/replicants");

	// Then load everything else
	require("./tiltifyHandlers");
	require("./messages");
	require("./utils/currency");
};
