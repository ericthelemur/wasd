
import { useEffect } from 'react';
import { DragDropContext, DraggableProvided, DropResult } from 'react-beautiful-dnd';
import { At, GripVertical, XLg } from 'react-bootstrap-icons';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import { Icon, Person, Social, Socials } from 'types/schemas';
import { useReplicant } from 'use-nodecg';

import { DnDTransitionsList, InsertHandle } from '../../../common/components/dndlist';
import Editable from '../../../common/components/editable';
import { sendTo } from '../../messages';

export function SocialIcon({ icon }: { icon: Icon }) {
    if (icon) {
        try {
            switch (icon.iconType) {
                case "svg":
                    return <span className="icon" dangerouslySetInnerHTML={{ __html: icon.icon }} />
            }
        } catch { }
    }
    return <span><At size="16px" /></span>
}

function SocialSelect({ social, setSocial }: { social: string, setSocial: (s: string) => void }) {
    const [socials,] = useReplicant<Socials>("socials", { "unknown": { "name": "Unknown", "iconType": "svg", "icon": "" } });
    var icon = socials![social];
    if (!icon) icon = socials!.unknown;
    return <Dropdown>
        <Dropdown.Toggle variant="outline-secondary">
            <SocialIcon icon={icon} />
        </Dropdown.Toggle>

        <Dropdown.Menu className="social-dropdown">
            {Object.entries(socials ?? {}).map(([s, icon]) =>
                <Dropdown.Item key={s} disabled={s === social} onClick={() => setSocial(s)}><SocialIcon icon={icon} /></Dropdown.Item>)}
        </Dropdown.Menu>
    </Dropdown>
}

const defaultSocial = () => ({ id: `social-${Date.now()}`, social: "unknown", name: "" })
function SocialComp({ soc, provided, onHandle, onRemove }: { soc: Social, provided: DraggableProvided, onHandle: () => void, onRemove: () => void }) {
    const { social, name } = soc;

    return <InputGroup className="m-1" ref={provided.innerRef} {...provided.draggableProps}>
        <div className="btn btn-outline-secondary" {...provided.dragHandleProps}>
            <GripVertical />
        </div>
        <InsertHandle onClick={onHandle} />

        <SocialSelect social={social} setSocial={(s) => { soc.social = s }} />
        <Editable className='msg-text' textClasses="input-group-text" text={name} setText={(v) => soc.name = v} type="multi" container={false} />
        <Button variant="outline-secondary" onClick={onRemove}><XLg /></Button>
    </InputGroup >
}

export function EditModal({ pid, editPerson, closeEdit, changePersonProp }: { pid: string, editPerson: Person | null, closeEdit: () => void, changePersonProp: (id: string, person: Person) => void }) {
    if (!editPerson) return <></>

    function onDragEnd(result: DropResult) {
        if (!result.destination || !editPerson) return;
        const newList = Array.from(editPerson.socials);
        const [r] = newList.splice(result.source.index, 1);
        newList.splice(result.destination.index, 0, r);
        editPerson.socials = newList;
    }

    useEffect(() => console.log("Current person", editPerson), [editPerson])

    const noPros = "No Pronouns";

    return <Modal show={true} fullscreen="md-down" onHide={closeEdit}>
        <Modal.Header closeButton className="h4">Edit {editPerson.name}</Modal.Header>
        <Modal.Body>
            <Form>
                <Form.Group>
                    <InputGroup>
                        <InputGroup.Text className="flex-grow-0">Name: </InputGroup.Text>
                        <Editable text={editPerson.name} textClasses="input-group-text" setText={(v) => sendTo("setPerson", { id: pid, person: { ...editPerson, name: v } })} type="single" />
                        <Editable text={editPerson.pronouns || noPros} textClasses="input-group-text" setText={(v) => sendTo("setPerson", { id: pid, person: { ...editPerson, pronouns: v } })} type="single" />
                    </InputGroup>
                </Form.Group>
                <hr className="my-2" />
                <Form.Group>
                    <Form.Label className="h4 m-0">Socials:</Form.Label>
                    <DragDropContext onDragEnd={onDragEnd}>
                        <DnDTransitionsList id={"socials::" + editPerson.id} type={"socials::" + editPerson.id}
                            ids={(editPerson.socials ?? []).map(s => editPerson.id + "::" + s.id)}
                            data={editPerson.socials ?? []}
                            content={(index, id, s, provided) => {
                                return <SocialComp soc={s} provided={provided}
                                    onHandle={() => editPerson.socials.splice(index, 0, defaultSocial())}
                                    onRemove={() => editPerson.socials.splice(index, 1)} />
                            }} />
                    </DragDropContext>
                    <div className="position-relative mt-2">
                        <InsertHandle onClick={() => editPerson.socials.push(defaultSocial())} />
                    </div>
                </Form.Group>
            </Form>
        </Modal.Body>
    </Modal>
}