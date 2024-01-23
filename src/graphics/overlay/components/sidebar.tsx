import { Camera } from './cam';
import { People } from './people';

interface SidebarArgs extends React.HTMLAttributes<HTMLDivElement> {
}

export function Sidebar(props: SidebarArgs) {
    const { children, className, ...divProps } = props;
    return <div className={`d-flex flex-column ${className}`} {...divProps}>
        {children}
        <Camera camName="run1" aspectRatio={"4 / 3"} />
        <div style={{ margin: "1em" }}>
            <People cat="runners" />
            <People cat="commentators" />
            <People cat="tech" />
        </div>
    </div>
}