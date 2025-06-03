import './barMarkdown.scss';

import Markdown from 'markdown-to-jsx';

export function SafeMarkdown({ children }: { children: string }) {
    return <Markdown className="barMarkdown" disableParsingRawHTML={true} forceInline={true}>{children}</Markdown>;
}