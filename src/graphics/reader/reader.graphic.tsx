import '../uwcs-bootstrap.css';
import './reader.graphic.css';

import { createRoot } from 'react-dom/client';

// export function Reader() {
// 	return (
// 		<h1>New Graphic</h1>
// 	)
// }

// const root = createRoot(document.getElementById('root')!);
// root.render(<Reader />);

// var t = document.createTextNode(JSON.stringify(window["obsstudio"]));
// document.body.appendChild(t)

// window.addEventListener('obsSceneChanged', function(event) {
// 	var t = document.createTextNode(JSON.stringify(event));
// 	document.body.appendChild(t)
// })
// ((window as any).obsstudio as obsT).pluginVersion

function log(text: string) {
    var t = document.createTextNode(JSON.stringify(text));
    document.getElementById("root")!.appendChild(t)
}

var lastVis = false; 
var lastAct = false;
function colour(vis: boolean | undefined, act: boolean | undefined) {
    vis = vis !== undefined ? vis : lastVis;
    act = act !== undefined ? act : lastAct;

    document.getElementById("root")!.style.backgroundColor = vis ? 
        (act ? "red" : "green") : (act ? "blue" : "black")

    lastVis = vis;
    lastAct = act;
}

const obs = (window as any).obsstudio;
if (obs) {
    log("test");
    obs.onVisibilityChange = function(visibility: boolean) {
        log("vis " + visibility);
        colour(visibility, undefined);
    };

    obs.onActiveChange = function(active: boolean) {
        log("act " + active);
        colour(undefined, active);
    };
}