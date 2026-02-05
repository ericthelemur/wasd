
import path from 'path';
import fs from 'fs';

import { BundleReplicant, getNodeCG } from '../../common/utils';
import { External } from 'types/schemas/external';

const nodecg = getNodeCG();
const log = new nodecg.Logger("external");
const router = nodecg.Router();

const external = BundleReplicant<External>("external", "external");

router.use(async (req, res, next) => {
    log.info(req.path);
    if (!external.value.externalKey || req.path == "/external/error") {
        next();
        return;
    }

    const paramKey = req.query["externalToken"];
    const cookieKey = req.cookies["externalToken"];
    const key = paramKey ?? cookieKey;

    if (key == external.value.externalKey) {
        // Save to cookie
        if (paramKey && !cookieKey) {
            res.cookie("externalToken", paramKey, {
                secure: req.secure,
                sameSite: req.secure ? "none" : undefined,
            });
        }

        // Move mic to cookie
        const mic = req.query["mic"];
        if (mic) {
            res.cookie("mic", mic);
        }

        next();
    } else {
        res.status(403).redirect("/external/error");
    }

});

router.get('/test', (req, res) => {
    res.send('You are authorized as external!');
});

const mainPages: string[] = ["mute.html", "donos.html"];

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
})

router.get("/:file", (req, res, next) => {
    console.log(req.params.file, mainPages.includes(req.params.file));
    if (!mainPages.includes(req.params.file)) {
        let fileLocation = path.resolve(process.cwd(), "shared", req.params.file);
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
        const fileLocation = path.resolve(process.cwd(), "shared", req.params.file);
        console.log(fileLocation, fs.existsSync(fileLocation));

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
