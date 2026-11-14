import cookie from 'cookie';
import http from 'http';

import { databaseAdapter } from '@nodecg/database-adapter-sqlite-legacy';

export async function checkAuth(req: http.IncomingMessage) {
    const url = new URLSearchParams(req.url?.replace(/.*\?/, ""));
    let key = url.get("key");
    if (!key && req.headers.cookie) {
        const cookies = cookie.parse(req.headers.cookie);
        key = cookies["socketToken"];
    }

    const foundKey = key && await databaseAdapter.findApiKey(key);
    if (foundKey) {
        const user = await databaseAdapter.findUser(foundKey.user.id);
        if (!user) return { "error": "Unknown user" };
        console.log(foundKey.secret_key, user.name, user.roles.map((role) => role.name));
        if (user.roles.find((role) => role.name === "external")) {
            console.log("Successful");
            return { "key": foundKey.secret_key, "url": url, "source": url.get("key") ? "url" : "cookie" };
        }
        return { "error": "Not authorized for external access" };
    }
    return { "error": "Key not recognized" };
}


