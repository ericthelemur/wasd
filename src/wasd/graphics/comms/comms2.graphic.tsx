import { createRoot } from 'react-dom/client';
import { Camera, SceneInfoContext } from '../overlay/components/cam';
import { CommsBase } from './commsbase';

function COMMS2() {
    return <SceneInfoContext.Provider value={{ name: "COMMS-2", run: null }}>
        <CommsBase width={1500}>
            <Camera key="CAM-COMMS" camName="CAM-COMMS" aspectRatio="16 / 9" flexGrow={16 / 9} />
            <Camera key="CAM-2" camName="CAM-2" aspectRatio="4 / 3" flexGrow={4 / 3} />
        </CommsBase>
    </SceneInfoContext.Provider>
}

const root = createRoot(document.getElementById('root')!);
root.render(<COMMS2 />);
