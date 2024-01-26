import { Camera } from './cam';
import { Game, TimerComp } from './game';
import { People } from './people';

interface SidebarArgs extends React.HTMLAttributes<HTMLDivElement> {
    camWidth?: number | string;
    vertical?: boolean;
}

export function Sidebar(props: SidebarArgs) {
    const { children, className, vertical, ...divProps } = props;
    const cn2 = className + (vertical ? " me-3" : "")
    return <div className={className} {...divProps}>
        <div style={{ maxWidth: 400, margin: "auto", display: "flex", flexDirection: "column", height: "100%" }}>
            <Camera camName="run1" aspectRatio={"4 / 3"} dims={["100%", null]} />
            <div className={`flex-gs d-flex flex-column align-items-center gap-3`} style={{ margin: "1rem calc(1rem + 0.5 * var(--bw)) 1rem 1rem" }}>
                <div className='w-100'>
                    <People cat="runners" />
                    <People cat="commentators" />
                    <People cat="tech" />
                </div>
                {vertical && <><Game vertical={vertical} /><TimerComp /></>}
            </div>
        </div>
    </div>
}