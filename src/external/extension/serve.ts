import fs from 'fs';
import path from 'path';

import { getNodeCG } from '../../common/utils';

const nodecg = getNodeCG();

const router = nodecg.Router();

const mainPages: string[] = ["mute.html", "donos.html"];
const isMain = (p: string) => mainPages.includes(p) || mainPages.includes(p + ".html");

router.get("/", (req, res, next) => {
    const fileLocation = path.resolve(process.cwd(), "shared", "external.html");
    res.sendFile(fileLocation, (err: NodeJS.ErrnoException) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.type(path.extname(fileLocation)).sendStatus(404);
            }

            if (!res.headersSent) next(err);
        }
        return undefined;
    });
});

router.get("/:file", (req, res, next) => {
    if (!isMain(req.params.file)) {  // Load resource files
        let fileLocation = path.resolve(process.cwd(), "shared", req.params.file);
        if (!req.params.file.includes(".")) fileLocation += ".html";

        res.sendFile(fileLocation, (err: NodeJS.ErrnoException) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    return res.type(path.extname(fileLocation)).sendStatus(404);
                }

                if (!res.headersSent) next(err);
            }
            return undefined;
        });
    } else {    // Load main files
        let fileLocation = path.resolve(process.cwd(), "shared", req.params.file);
        if (!req.params.file.includes(".")) fileLocation += ".html";

        fs.readFile(fileLocation, { encoding: 'utf8' }, (error, data) => {
            if (error) return nodecg.log.error(error);

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

            const inserted = data.replace("</head>", `${concattedScripts}\n</head>`);
            res.send(inserted);

        });
    }
});

nodecg.mount('/external', router);