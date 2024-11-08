import ReactCSSTransitionReplace from 'react-css-transition-replace';
import { Textfit, TextfitProps } from 'react-textfit';

interface AnimTextFitProps {
    animKey: string;
    transitionName: string;
    enterTimeout: number;
    leaveTimeout?: number;
    className?: string;
    maxSize?: number;
    minSize?: number;
    children: JSX.Element | string;
    transitionProps?: Partial<ReactCSSTransitionReplace.Props>;
    textfitProps?: Partial<TextfitProps>;
}
export function AnimTextFit(props: AnimTextFitProps) {
    return <ReactCSSTransitionReplace transitionName={props.transitionName} className={"animText " + (props.className ?? "")}
        transitionEnterTimeout={props.enterTimeout ?? 500} transitionLeaveTimeout={props.leaveTimeout ?? props.enterTimeout ?? 500}
        {...props.transitionProps}>
        <div key={props.animKey || ""}>
            <Textfit mode="multi" className='text' max={props.maxSize ?? 32} min={props.minSize ?? 10} {...props.textfitProps}>
                {props.children || ""}
            </Textfit>
        </div>
    </ReactCSSTransitionReplace>
}