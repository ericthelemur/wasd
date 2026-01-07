
import path from 'path';
import fs from 'fs';

import { getNodeCG } from '../../common/utils';

const nodecg = getNodeCG();
const router = nodecg.Router();


// router.use((nodecg.util as any).authCheckRole(["external"], "/external/test"));

router.get('/test', (req, res) => {
    res.send('You are authorized as external!');
});

const mainPages: string[] = ["mute.html", "donos.html"];

router.get("/:file", (req, res, next) => {
    console.log(req.params.file, mainPages.includes(req.params.file));
    if (!mainPages.includes(req.params.file)) {
        const fileLocation = path.resolve(process.cwd(), "bundles/wasd/shared", req.params.file);
        console.log(fileLocation, fs.existsSync(fileLocation));
        res.sendFile(fileLocation, (err: NodeJS.ErrnoException) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    return res.type(path.extname(fileLocation)).sendStatus(404);
                }

                if (!res.headersSent) next(err);
            }
            return undefined;
        });
    } else {
        const fileLocation = path.resolve(process.cwd(), "bundles/wasd/shared", req.params.file);
        console.log(fileLocation, fs.existsSync(fileLocation));

        fs.readFile(fileLocation, { encoding: 'utf8' }, (error, data) => {
            if (error) return nodecg.log.error(error);

            const scripts = [];

            scripts.push(`<script>globalThis.ncgConfig = ${JSON.stringify(nodecg.config)};</script>`);
            scripts.push('<script src="/socket.io/socket.io.js"></script>');
            scripts.push('<script src="/socket.js"></script>');
            scripts.push('<script src="/nodecg-api.min.js"></script>');
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
