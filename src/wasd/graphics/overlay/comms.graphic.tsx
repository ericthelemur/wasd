import '../../../common/uwcs-bootstrap.css';
import './overlay.graphic.scss';

import { createContext } from 'react';
import { createRoot } from 'react-dom/client';
import { SceneInfo } from 'types/schemas';

import { Slides, UpNext } from '../break/components/slides';
import { Camera, SceneInfoContext } from './components/cam';

function Comms() {

    return <SceneInfoContext.Provider value={{ name: "COMMS", run: null }}>
        <div className="fill d-flex outer comms" style={{ fontFamily: "Montserrat", fontWeight: "600" }}>
            <div className="d-flex justify-content-center align-items-center w-100">
                <div style={{ width: 1200 }}>
                    <Camera camName={"COMMS"} aspectRatio="16 / 9" />
                    <div className="mt-2"></div>
                    <UpNext />
                </div>
                <div style={{ width: 600, height: 900, fontSize: "2.5em" }}>
                    <Slides side={true} />
                </div>
            </div>
        </div>
    </SceneInfoContext.Provider>
}

const root = createRoot(document.getElementById('root')!);
root.render(<Comms />);
