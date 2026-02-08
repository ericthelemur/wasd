import { TextEditorProps } from 'json-edit-react';
import React from 'react';

import { json } from '@codemirror/lang-json';
import CodeMirror from '@uiw/react-codemirror';

import { githubDarkTheme, JsonEditor } from 'json-edit-react';
import { Suspense } from 'react';


export function RepEditor<T>(props: { data: T, setData: (newVal: T) => any, validate?: (newData: any) => any }) {
    return <JsonEditor
        data={props.data as object}
        setData={(v) => props.setData(v as T)}
        onUpdate={({ newData }) => {
            if (!props.validate) return true;
            try {
                const valid = props.validate(newData);
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
        theme={githubDarkTheme}
        maxWidth="100%"
        minWidth="75%"
        errorMessageTimeout={5000}
        className="overflow-auto"
        TextEditor={
            (p) => (
                <Suspense
                    fallback={
                        <div className="loading" style={{ height: `${getLineHeight(props.data)}lh` }}>
                            Loading code editor...
                        </div>
                    }
                >
                    <CodeEditor {...p} />
                </Suspense>
            )
        }
    />
}

const getLineHeight = (data: any) => JSON.stringify(data, null, 2).split('\n').length


export const CodeEditor: React.FC<TextEditorProps> = ({
    value,
    onChange,
    onKeyDown
}) => {
    return (
        <CodeMirror
            value={value}
            width="100%"
            extensions={[json()]}
            onChange={onChange}
            onKeyDown={onKeyDown}
            theme="dark"
        />
    )
};