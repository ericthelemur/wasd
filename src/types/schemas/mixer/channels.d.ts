/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export interface Channels {
	dcas: {
		[k: string]: number;
	};
	mutegroups: {
		[k: string]: number;
	};
	mics: {
		[k: string]: number;
	};
	buses?: {
		[k: string]: number;
	};
	tech: number;
	scenes: {
		[k: string]: string[];
	};
	[k: string]: unknown;
}
