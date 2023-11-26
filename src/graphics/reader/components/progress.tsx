
export interface ProgressProps {
    label: string;
    value: number;
    maxVal: number;
    colour1?: string;
    colour2?: string;
    colourHit?: string;
    complete?: boolean;
    className?: string;
}

export function ProgressBar(props: ProgressProps) {
    const hit = props.complete || (props.complete === undefined && props.value >= props.maxVal && props.maxVal > 0);
    const defaultCol = props.colour2 || "var(--bs-secondary-bg)";
    const hitCol = props.colourHit || "var(--bs-success-bg-subtle)"
    const style = {
        "--progress": `${100 * props.value / props.maxVal}%`,
        "--col2": hit ? hitCol : defaultCol,
        "--col1": props.colour1 || "transparent"
    } as React.CSSProperties;

    return (
        <div key={props.label} className={`progress-custom rounded text-center border ${hit && !props.colourHit ? "border-success text-success" : ""} ${props.className || ""}`}
            style={style}>
            {props.label}
        </div>
    )
}