import { getNodeCG } from '../../common/utils';
import { CellData, State } from '../../types/schemas/loupedeck';
import { loupedeck } from './index.extension';
import { getReplicant, getRepParentAt } from './utils';

const nodecg = getNodeCG();

type Interaction = State["interaction"]; // Temp, until schema to type realizes Interaction should be its own type
type Category<T> = Extract<Interaction, { category: T }>;   // Type for interactions with a particular category
export type Action = "down" | "up";
type Context = { id: string, cell: CellData, state: State };

export function doInteraction(interaction: Interaction | undefined, action: Action, context: Context) {
    if (!interaction) return;
    loupedeck.log.info(`Doing ${interaction.category}.${interaction.action} for ${context.id}`);
    if (interaction.category == "modifier") return modifierInteractions(interaction, action, context);
    if (interaction.category == "nodecg") return nodecgInteractions(interaction, action, context);
}


let tapTimes: { [id: string]: number } = {};
function modifierInteractions(interaction: Category<"modifier">, action: Action, context: Context) {
    if (interaction.action == "tap-or-toggle") {
        if (action == "down") {
            if (tapTimes[context.id]) {
                doInteraction(interaction.interaction, "up", context);
            } else tapTimes[context.id] = Date.now();

            doInteraction(interaction.interaction, "down", context);
        } else if (action == "up") {
            const pressTime = tapTimes[context.id];
            // if (!pressTime) doInteraction(interaction.interaction, "up", context);
            const tapDelta = 500;
            if (Date.now() - pressTime > tapDelta) {    // If held for over 0.5s, then tap, otherwise wait until toggle
                delete tapTimes[context.id];
                doInteraction(interaction.interaction, "up", context);
            }
        }
    }
}

function nodecgInteractions(interaction: Category<"nodecg">, action: Action, context: Context) {
    if (interaction.action == "message") {
        if (action == "up") {
            loupedeck.log.info(`Sending message ${interaction.message} with ${interaction.data}`);
            if (interaction.bundle) {
                if (interaction.data) nodecg.sendMessageToBundle(interaction.message, interaction.bundle, interaction.data);
                else nodecg.sendMessageToBundle(interaction.message, interaction.bundle);
            } else {
                if (interaction.data) nodecg.sendMessage(interaction.message, interaction.data);
                else nodecg.sendMessage(interaction.message);
            }
        }
    } else if (interaction.action == "replicant") {
        if (action == "up") {
            loupedeck.log.info(`Setting replicant ${interaction.replicant} at path ${interaction.field} to value ${interaction.value}`);
            const replicant = getReplicant(interaction.replicant);
            loupedeck.log.info("Replicant", replicant, replicant.value);
            if (!interaction.field) replicant.value = interaction.value;
            else {
                const [parent, child] = getRepParentAt(replicant, interaction.field);

                loupedeck.log.info(`Parent ${parent} Child ${child}`);
                try {
                    parent[child] = interaction.value;
                } catch { }
            }
        }
    }
}