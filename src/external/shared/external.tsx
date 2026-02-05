import { Card } from "react-bootstrap";
import "../../common/uwcs-bootstrap.css";

import { createRoot } from 'react-dom/client';

function ExternalMenu() {
    return <div className="m-3 container">
        <h1>WASD External Webpages</h1>
        <a href="/external/mute.html"><Card className="m-3 p-3">
            <h2>Mute Switches</h2>
        </Card></a>
        <a href="/external/donos.html"><Card className="m-3 p-3">
            <h2>Dono Feed</h2>
        </Card></a>
    </div>
}

const root = createRoot(document.getElementById('root')!);
root.render(<ExternalMenu />);