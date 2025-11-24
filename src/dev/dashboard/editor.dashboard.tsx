import '../../common/uwcs-bootstrap.css';

import { JsonEditor } from 'json-edit-react';
import { useEffect, useState } from 'react';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import { createRoot } from 'react-dom/client';
import { ReplicantList } from 'types/schemas';

import { useReplicant } from './useNodeCGCustom';

export function EditConsole() {
    const [replicantList, ,] = useReplicant<ReplicantList>("replicantList", {});
    const [curRepVal, setCurRepVal] = useState<{ name?: string, replicant: string, bundle?: string | null }>({ "replicant": "" });
    const [repVal, setRepVal, repRep] = useReplicant<unknown>(curRepVal?.replicant || "unknown", undefined, { namespace: curRepVal?.bundle || undefined });

    function setRepIndex(i: number) {
        // If positive, use value in preset list
        if (i >= 0) {
            const entry = Object.entries(replicantList || {})[i];
            if (!entry) setCurRepVal({ "name": "Unknown", "replicant": "unknown" });
            else {
                const [name, val] = entry;
                if (!val) setCurRepVal({ "name": "Unknown", "replicant": "unknown" });
                else setCurRepVal({ "name": name, ...val });
            }
        } else {    // If -1, use a custom replicant location
            const response = prompt("Which Replicant? Format as <replicant> or <bundle>.<replicant>");
            if (response) {
                if (response.includes(".")) {
                    const [bundle, replicant] = response.split(".");
                    setCurRepVal({ "name": "custom", "replicant": replicant, "bundle": bundle });
                } else {
                    setCurRepVal({ "name": "custom", "replicant": response });
                }
            }
        }
    }
    if (!replicantList) return null;

    return <Container fluid="lg" className="gap-3 vstack my-3">
        <>
            <Form.Select aria-label="Select Replicant to Edit" onChange={(e) => setRepIndex(Number(e.target.value))}>
                <option key="custom" value={-1}>Custom Replicant</option>
                {Object.keys(replicantList).map((name, i) => <option key={name} value={i}>{name}</option>)}
            </Form.Select>

            {repRep && `Editing ${repRep.namespace}:${repRep.name}`}
            {!repRep.validate && "Replicant has no schema, be extra careful editing"}

            {repVal && <JsonEditor
                data={repVal as object}
                setData={(v) => setRepVal(v)}
                onUpdate={({ newData }) => {
                    console.log("Validating", newData);
                    if (!repRep.validate) return true;
                    try {
                        const valid = repRep.validate(newData);
                        console.log("Validity:", valid);
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
