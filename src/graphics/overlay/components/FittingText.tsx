import React, { useEffect, useRef, useState } from 'react';
import { Textfit } from 'react-textfit';

export function FittingText({ children, className, max, mode }: { children: React.ReactNode; className: string; max?: number; mode?: "single" | "multi" }) {
    const [g, setG] = useState(children);
    const [b, setB] = useState(0);

    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) {
            const observer = new ResizeObserver(() => setTimeout(() => { setG(children); setB(1 - b); }, 150));
            observer.observe(ref.current);
            return () => observer.disconnect();
        }
    }, [children, ref]);

    return <div ref={ref} className={"pa " + className}>
        <Textfit className="h-100 textfit" throttle={1 + b} max={max} mode={mode}>
            {g}
        </Textfit>
    </div>;

}
