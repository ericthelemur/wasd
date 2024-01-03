import { Draggable, DraggableProvided, Droppable } from 'react-beautiful-dnd';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

function DnDTransitionItem(id: string, index: number, content: (provided: DraggableProvided) => JSX.Element) {
    return <CSSTransition timeout={500} key={id} classNames="item">
        <Draggable key={id} draggableId={id} index={index}>
            {content}
        </Draggable>
    </CSSTransition>
}

interface DndTransitionsListProps<T> {
    id: string;
    data: T[];
    ids: string[];
    content: (id: string, index: number, item: T, provided: DraggableProvided) => JSX.Element;
}

export function DnDTransitionsList<T>({ id, ids, data, content }: DndTransitionsListProps<T>) {
    return (
        <Droppable droppableId={id}>
            {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                    <TransitionGroup className='pool vstack'>
                        {data.map((d, i) => DnDTransitionItem(ids[i], i, (p) => content(ids[i], i, d, p)))}
                        {provided.placeholder}
                    </TransitionGroup>
                </div>
            )}
        </Droppable>
    )
}