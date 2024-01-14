import 'wasd-common/shared/uwcs-bootstrap.css';

import { useEffect, useState } from 'react';
import ReactCSSTransitionReplace from 'react-css-transition-replace';
import { createRoot } from 'react-dom/client';
import { Textfit } from 'react-textfit';
import { useReplicant } from 'use-nodecg';

import People from './components/people';
import Overlay16x9 from './single/16-9';

function Overlay() {
    return <People />
}

const root = createRoot(document.getElementById('root')!);
root.render(<Overlay />);
