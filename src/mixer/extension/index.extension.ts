import path from 'path';
import fs from 'fs';

import { getNodeCG } from '../../common/utils';
import { storeX32 } from './mixer/utils';

const x32 = require("./mixer/X32");
const x32u = new x32.X32Utility();
storeX32(x32u);

const list = require("./mixer/listeners");

const nodecg = getNodeCG();
const router = nodecg.Router();

router.use((nodecg.util as any).authCheckRole(["external"], "/external/mute"));

router.get('/mute', (req, res, next) => {
    const fileLocation = path.resolve(__dirname, "../shared/mute.dashboard.html");
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
});

router.get('/comms/mixer', (req, res) => {
    res.send('OK!');
});

nodecg.mount('/external', router);