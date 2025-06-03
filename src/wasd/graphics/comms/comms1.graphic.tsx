import { createRoot } from 'react-dom/client';
import { Camera, SceneInfoContext } from '../overlay/components/cam';
import { CommsBase } from './commsbase';

function COMMS1() {
    return <SceneInfoContext.Provider value={{ name: "COMMS-1", run: null }}>
        <CommsBase width={1500}>
            <Camera key="CAM-1" camName="CAM-1" aspectRatio="4 / 3" flexGrow={4 / 3} />
            <Camera key="CAM-COMMS" camName="CAM-COMMS" aspectRatio="16 / 9" flexGrow={16 / 9} />
        </CommsBase>
    </SceneInfoContext.Provider>
}

const root = createRoot(document.getElementById('root')!);
root.render(<COMMS1 />);
