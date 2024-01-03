import "../uwcs-bootstrap.css";

import { useEffect, useState } from 'react';
import ReactCSSTransitionReplace from 'react-css-transition-replace';
import { createRoot } from "react-dom/client";
import { Textfit } from 'react-textfit';
import { useReplicant } from 'use-nodecg';
import Overlay16x9 from "./single/16-9";

function Overlay() {
    return <Overlay16x9 />
}

const root = createRoot(document.getElementById('root')!);
root.render(<Overlay />);
