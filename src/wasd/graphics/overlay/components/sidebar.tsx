import { useContext } from 'react';

import { Camera, SceneInfoContext } from './cam';
import { Game, TimerComp } from './game';
import { PeopleComp } from './people';

import SpecialEffect from '../../assets/specialeffect-white.png';
import WASDKeys from '../../assets/wasd-keys.svg';

interface SidebarArgs extends React.HTMLAttributes<HTMLDivElement> {
    camWidth?: number | string;
    vertical?: boolean;
}

export function Sidebar(props: SidebarArgs) {
    const sceneInfo = useContext(SceneInfoContext);

    const { children, className, vertical, ...divProps } = props;
    const cn2 = className + (vertical ? " me-3" : "")

    return <div className={className} {...divProps}>
        <div style={{ maxWidth: 400, margin: "auto", display: "flex", flexDirection: "column", height: "100%" }}>
            <Camera camName={sceneInfo.name === "RUN-1" ? "CAM-1" : "CAM-2"} aspectRatio={"4 / 3"} dims={["100%", null]} />
            <div className={`flex-gs d-flex flex-column align-items-center gap-3`} style={{ margin: "1rem calc(1rem + 0.5 * var(--bw)) 1rem 1rem" }}>
                <div className='w-100'>
                    <PeopleComp cat="runners" />
                    <PeopleComp cat="commentators" />
                    {/* <People cat="tech" /> */}
                </div>
                <img src={WASDKeys} className="mt-3" style={{ width: "70%" }} />
                <img src={SpecialEffect} style={{ width: "90%" }} />
                {vertical && <><Game vertical={vertical} /><TimerComp /></>}
            </div>
        </div>
    </div>
}