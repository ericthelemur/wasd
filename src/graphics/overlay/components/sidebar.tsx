import { Camera } from './cam';
import { People } from './people';

interface SidebarArgs extends React.HTMLAttributes<HTMLDivElement> {
}

export function Sidebar(props: SidebarArgs) {
    const { children, ...divProps } = props;
    return <div {...divProps}>
        <Camera camName="run1" aspectRatio={"1 / 1"} />
        <div style={{ margin: "1em" }}>
            <People cat="runners" />
            <People cat="commentators" />
            <People cat="tech" />
            {children}
        </div>
    </div>
}