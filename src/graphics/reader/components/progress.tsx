
export interface ProgressProps {
    label: string;
    value: number;
    maxVal: number;
    colour1?: string;
    colour2?: string;
    className?: string;
}

export function ProgressBar(props: ProgressProps) {
    const style = {
        "--progress": `${100 * props.value / props.maxVal}%`,
        "--col2": props.colour2 || "var( --bs-secondary-bg)",
        "--col1": props.colour1 || "transparent"
    } as React.CSSProperties;

    return (
        <div key={props.label} className={"progress-custom rounded text-center border " + (props.className || "")}
            style={style}>
            {props.label}
        </div>
    )
}