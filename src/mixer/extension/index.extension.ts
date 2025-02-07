import path from 'path';
import fs from 'fs';

import { getNodeCG } from '../../common/utils';
import { storeX32 } from './mixer/utils';

const x32 = require("./mixer/X32");
const x32u = new x32.X32Utility();
storeX32(x32u);
