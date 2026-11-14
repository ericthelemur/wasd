import cookie from 'cookie';
import http from 'http';
import path from 'path';

import { databaseAdapter } from '@nodecg/database-adapter-sqlite-legacy';

import { getNodeCG } from '../../common/utils';

const log = new (getNodeCG().Logger)("ext-auth");

export async function checkAuth(req: http.IncomingMessage) {
    const url = new URLSearchParams(req.url?.replace(/.*\?/, ""));
    let key = url.get("key");
    if (key) log.debug(`[${path.basename(req.url!)}]`, "URL key", key);
    if (!key && req.headers.cookie) {
        const cookies = cookie.parse(req.headers.cookie);
        key = cookies["socketToken"];
        log.debug(`[${path.basename(req.url!)}]`, "Cookie key", key);
    }

    const foundKey = key && await databaseAdapter.findApiKey(key);
    if (foundKey) {
        const user = await databaseAdapter.findUser(foundKey.user.id);
        log.debug(`[${path.basename(req.url!)}]`, "Found", foundKey.secret_key, user?.name, user?.roles.map(r => r.name));
        if (!user) return { "error": "Unknown user" };
        if (user.roles.find((role) => role.name === "external")) {
            return { "key": foundKey.secret_key, "url": url, "source": url.get("key") ? "url" : "cookie" };
        }
        return { "error": "Not authorized for external access" };
    }
    return { "error": "Key not recognized" };
}


