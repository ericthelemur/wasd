import { Login } from 'types/schemas/discord';
import { createMessageListenersBundle, createUnlistener } from '../common/messages';
import { MessageCreateOptions, MessagePayload } from 'discord.js';

export type ListenerTypes = {
    connect: Partial<Login>,
    disconnect: undefined,
    connected: undefined,

    updateEvents: undefined,
    previewMessage: { runID: string, runName: string, channelID: string, channelName?: string, content: string },
    postMessage: { channelID: string, content: string | MessagePayload | MessageCreateOptions, runID?: string }
}

export const listeners = createMessageListenersBundle<ListenerTypes>("discord");
export default listeners;
export const { sendTo, sendToF, listenTo } = listeners;
export const unlistenTo = createUnlistener<ListenerTypes>("discord")