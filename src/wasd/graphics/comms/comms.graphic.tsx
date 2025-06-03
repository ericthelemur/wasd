import { createRoot } from 'react-dom/client';
import { Camera, SceneInfoContext } from '../overlay/components/cam';
import { CommsBase } from './commsbase';

function COMMS() {
    return <SceneInfoContext.Provider value={{ name: "COMMS", run: null }}>
        <CommsBase width={1245}>
            <Camera key="CAM-COMMS" camName="CAM-COMMS" aspectRatio="16 / 9" dims={[1245, 700]} />
        </CommsBase>
    </SceneInfoContext.Provider>
}

const root = createRoot(document.getElementById('root')!);
root.render(<COMMS />);
