import { createRoot } from 'react-dom/client';
import { Camera, SceneInfoContext } from '../overlay/components/cam';
import { CommsBase } from './commsbase';

function COMMS2() {
    return <SceneInfoContext.Provider value={{ name: "COMMS-RACE", run: null }}>
        <CommsBase width={1700}>
            <Camera key="CAM-1" camName="CAM-1" aspectRatio="1 / 1" flexGrow={1 / 1} />
            <Camera key="CAM-COMMS" camName="CAM-COMMS" aspectRatio="16 / 9" flexGrow={16 / 9} />
            <Camera key="CAM-2" camName="CAM-2" aspectRatio="1 / 1" flexGrow={1 / 1} />
        </CommsBase>
    </SceneInfoContext.Provider>
}

const root = createRoot(document.getElementById('root')!);
root.render(<COMMS2 />);
