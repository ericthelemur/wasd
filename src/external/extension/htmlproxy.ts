import cookie from 'cookie';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import http from 'http';
import HTTPProxy from 'http-proxy';
import mime from 'mime';
import path from 'path';
import { pipeline } from 'stream/promises';
import url from 'url';

import { rootPaths } from '@nodecg/internal-util';

import { getNodeCG } from '../../common/utils';
import { checkAuth } from './auth';

const nodecg = getNodeCG();

// const proxy = HTTPProxy.createProxyServer({
//   target: 'http://localhost:9090',
//   ws: false
// });

export const pathsFromNodeCG = [
    /^\/socket.io\/*/,
    /^\/socket.js$/,
    /^\/api.js$/,
    /^\/favicon.ico$/
]

async function handleAuthCookies(req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage>) {
    if (req.url) {
        const { key, url, source, error } = await checkAuth(req);
        console.error(error);
        
        if (key) {
            console.log("Proxied", req.url);

            // Save to cookie if from url
            if (source == "url") res.appendHeader("Set-Cookie", cookie.serialize("socketToken", key));

            // Move mic to cookie
            const mic = url.get("mic");
            if (mic) res.appendHeader("Set-Cookie", cookie.serialize("mic", mic));

            // proxy.web(req, res);
            return true;
        }
    }
    // error(res);
    res.writeHead(403);
    res.end("Auth Error");
}

function error(res: http.ServerResponse<http.IncomingMessage>) {
    res.writeHead(302, { 'Content-Type': 'text/plain', location: "/error" });
    res.end();
}


export const externalServer = http.createServer(async (req, res) => {
    await processRequest(req, res).catch(e => {
        console.error(e);
        try {
            error(res);
        } catch (e) {
            console.error("Failed sending error", e);
        }
    });
})

async function processRequest(req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage>) {
    console.log("URL", req.url);
    if (!req.url) {
        res.writeHead(404);
        return res.end("No URL");
    }
    const isError = /error(\.html)?/.test(req.url);
    const isNodecg = pathsFromNodeCG.some(r => r.test(req.url!));
    let isAuthed = false;
    if (!isError && !isNodecg) {
        isAuthed = Boolean(await handleAuthCookies(req, res));
    }
    if (isError || isNodecg || isAuthed) {
        try {
            const url = new URL("http://localhost" + req.url);
            const root = isNodecg ? 
                path.join(rootPaths.nodecgInstalledPath, "dist/client") :
                path.join(rootPaths.runtimeRootPath, "shared");
            let filePath = path.join(root, url.pathname);
            console.log(filePath);
            

            if (!path.extname(filePath)) {
                filePath += ".html";
            }
            
            console.log(req.url, filePath);
            if (!filePath.startsWith(root)) {
                res.writeHead(403);
                return res.end("Forbidden");
            }
            
            let stat = await fs.stat(filePath);

            if (stat.isDirectory()) {
                filePath = path.join(filePath, 'index.html');
                stat = await fs.stat(filePath);
            }
            
            console.log("final", filePath);

            let data = await fs.readFile(filePath, { encoding: "utf8"});
            res.writeHead(200, { 'Content-Type': mime.lookup(filePath, "application/octet-stream") });

            if (path.extname(filePath) == ".html") data = insertScripts(data);
            res.end(data);
        } catch (err: { code: string } | any) {
            console.error("Error", err);
            res.writeHead(err?.code === 'ENOENT' ? 404 : 500);
            res.end(err.code === 'ENOENT' ? 'Not Found' : 'Internal Server Error');
        }
    }
}

function insertScripts(content: string) {
    // Insert NodeCG scripts at end of <head> (copy of actual process)
    console.log("Inserting scripts");
    const scripts = [];
    if (nodecg.config.sentry.enabled) { // Include sentry
        scripts.unshift(
            '<script src="/node_modules/@sentry/browser/build/bundle.es6.min.js"></script>',
            '<script src="/sentry.js"></script>',
        );
    }

    scripts.push(`<script>globalThis.ncgConfig = ${JSON.stringify(nodecg.config)};</script>`);
    scripts.push('<script src="/socket.io/socket.io.js"></script>');
    scripts.push('<script src="/socket.js"></script>');
    scripts.push('<script src="/api.js"></script>');
    const partialBundle = {
        name: nodecg.bundleName, config: nodecg.bundleConfig, version: nodecg.bundleVersion, git: nodecg.bundleGit, _hasSounds: false
    };
    scripts.push(`<script>globalThis.nodecg = new globalThis.NodeCG(${JSON.stringify(partialBundle)}, globalThis.socket)</script>`);

    const concattedScripts = scripts.join('\n');

    const inserted = content.replace("</head>", `${concattedScripts}\n</head>`);
    return inserted;
}


externalServer.listen(8080, () => {
    console.log('External proxy running on port 8080');
});