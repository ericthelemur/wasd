import { Camera } from './cam';
import { People } from './people';

interface SidebarArgs extends React.HTMLAttributes<HTMLDivElement> {
    camWidth?: number | string
}

export function Sidebar(props: SidebarArgs) {
    const { children, className, camWidth, ...divProps } = props;
    return <div className={`d-flex flex-column align-items-center ${className}`} {...divProps}>
        <Camera camName="run1" aspectRatio={"4 / 3"} dims={camWidth ? [camWidth, null] : undefined} />
        <div style={{ margin: "1em" }}>
            <People cat="runners" />
            <People cat="commentators" />
            <People cat="tech" />
        </div>
        {children}
    </div>
}