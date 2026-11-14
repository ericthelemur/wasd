
import { databaseAdapter, getConnection, Role, User } from '@nodecg/database-adapter-sqlite-legacy';

import { getNodeCG } from '../../common/utils';
import { listenTo } from '../messages';

const EXTERNAL_UUID = "ca26fcf1-0130-4447-a6d6-3085b1fcb942";
async function getExternalRole() {
    const database = await getConnection();
    let external = await database.manager.findOne(Role, { where: { name: "external" } });
    if (external) return external;

    // If role doesn't exist, create
    external = database.manager.create(Role, { id: EXTERNAL_UUID, name: "external", permissions: [] });
    database.manager.save(external);
    return external;
}

// Make sure proxy user exists (used internally only)
let proxyAPIKey: string | undefined;
getNodeCG().on("extensionsLoaded", async () => {
    const superuser = await databaseAdapter.getSuperUserRole();
    const user = await databaseAdapter.upsertUser({ "name": "proxy", "provider_type": "local", "provider_hash": "proxy", roles: [superuser]});
    proxyAPIKey = user.apiKeys.at(0)?.secret_key;
});

// Create external user and return key
listenTo("createExternal", async (name, ack) => {
    const superuser = await databaseAdapter.getSuperUserRole();
    const external = await getExternalRole();
    const user = await databaseAdapter.upsertUser({ "name": "EXT-" + name, "provider_type": "local", "provider_hash": name, roles: [superuser, external]});
    console.log(user);
    if (ack && !ack.handled) ack(null, user.apiKeys?.at(0)?.secret_key);
});

// Remove external user
listenTo("removeExternal", async (name, ack) => {
    const database = await getConnection();
    const user = await database.manager.findOne(User, { where: { name: "EXT-" + name } });
    await database.manager.delete(User, user);
    if (ack && !ack.handled) ack(null, user?.name);
});
