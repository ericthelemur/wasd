import cookie from 'cookie';
import http from 'http';

import { databaseAdapter } from '@nodecg/database-adapter-sqlite-legacy';

export const allowed = [
    /^\/external*/,
    /^\/socket.io\/*/,
    /^\/socket.js$/,
    /^\/api.js$/,
    /^\/favicon.ico$/
]


export async function checkAuth(req: http.IncomingMessage) {
    const url = new URLSearchParams(req.url?.replace(/.*\?/, ""));
    let key = url.get("key");
    if (!key && req.headers.cookie) {
        const cookies = cookie.parse(req.headers.cookie);
        key = cookies["socketToken"];
    }

    const foundKey = key && await databaseAdapter.findApiKey(key);
    if (foundKey) {
        console.log(foundKey.secret_key, foundKey.user.name);
        return { "key": foundKey.secret_key, "url": url, "source": url.get("key") ? "url" : "cookie" };
    }
    console.log("No Matching Key");
    return {};
}


