import { TextEditorProps } from 'json-edit-react';
import React from 'react';

import { json } from '@codemirror/lang-json';
import CodeMirror, { Extension } from '@uiw/react-codemirror';

// Styles defined in /demo/src/style.css

const CodeEditor: React.FC<TextEditorProps> = ({
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
}

export default CodeEditor