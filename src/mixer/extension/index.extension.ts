import { getNodeCG } from '../../common/utils';
import { storeX32 } from './mixer/utils';

const x32 = require("./mixer/X32");
const x32u = new x32.X32Utility();
storeX32(x32u);

const list = require("./mixer/listeners");

const nodecg = getNodeCG();
const router = nodecg.Router();

router.use((nodecg.util as any).authCheckRole("external"));

router.get('/customroute', (req, res) => {
    res.send('OK!');
});

nodecg.mount('/external', router);