import '../../common/uwcs-bootstrap.css';

import { JsonEditor } from 'json-edit-react';
import { useState } from 'react';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import { createRoot } from 'react-dom/client';
import { ReplicantList } from 'types/schemas';

import { useReplicant } from './useNodeCGCustom';

export function EditConsole() {
    const [replicantList, ,] = useReplicant<ReplicantList>("replicantList", {});
    const [curRep, setCurRep] = useState<string>("peopleBank");
    const [repVal, setRepVal, repRep] = useReplicant<unknown>(curRep, undefined);

    if (!replicantList) return null;

    return <Container fluid="lg" className="gap-3 vstack my-3">
        <>
            <Form.Select aria-label="Select Replicant to Edit" defaultValue={curRep} onChange={(e) => setCurRep(e.target.value)}>
                {Object.entries(replicantList).map(([name, val]) => <option key={name} value={val}>{name}</option>)}
            </Form.Select>

            {!repRep.validate && "Replicant has no schema, be extra careful editing"}

            {repVal && <JsonEditor
                data={repVal as object}
                setData={(v) => setRepVal(v)}
                onUpdate={({ newData }) => {
                    console.log("Validating", newData);
                    if (!repRep.validate) return true;
                    try {
                        const valid = repRep.validate(newData);
                        console.log(valid);
                        return valid;
                    } catch (e: any) {
                        return String(e.message);
                    }
                }}
                rootName="value"
                indent={2}
                collapse={3}
                restrictDrag={false}
                theme="githubDark"
                maxWidth="100%"
                errorMessageTimeout={5000}
                className="overflow-auto" />
            }
        </>
    </Container>
}

const root = createRoot(document.getElementById('root')!);
root.render(<EditConsole />);
