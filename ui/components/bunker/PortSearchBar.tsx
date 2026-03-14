/**
 * ui/components/bunker/PortSearchBar.tsx
 * Fuzzy port search with keyboard-navigable dropdown.
 * Parent passes inputRef so "/" hotkey can call .focus() externally.
 */
import React, { useState, useEffect, RefObject } from 'react';
import { BunkerNode } from '../../../domain/bunker/types';

interface Props {
    nodes: BunkerNode[];
    inputRef: RefObject<HTMLInputElement>;
    onSelect: (node: BunkerNode) => void;
}

function score(node: BunkerNode, q: string): number {
    const lq = q.toLowerCase();
    const lo = node.locode.toLowerCase();
    const nm = node.portName.toLowerCase();
    if (lo === lq) return 4;
    if (lo.startsWith(lq)) return 3;
    if (nm.startsWith(lq)) return 2;
    if (lo.includes(lq) || nm.includes(lq)) return 1;
    return 0;
}

const PortSearchBar: React.FC<Props> = ({ nodes, inputRef, onSelect }) => {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [cursor, setCursor] = useState(0);

    const results = query.length >= 1
        ? nodes.map(n => ({ n, s: score(n, query) }))
            .filter(r => r.s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, 6)
            .map(r => r.n)
        : [];

    useEffect(() => { setCursor(0); }, [query]);

    const commit = (node: BunkerNode) => {
        setQuery('');
        setOpen(false);
        onSelect(node);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (!open || results.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
        if (e.key === 'Enter') { e.preventDefault(); commit(results[cursor] ?? results[0]); }
        if (e.key === 'Escape') { setQuery(''); setOpen(false); }
    };

    const showDrop = open && results.length > 0;

    return (
        <div style={{ position: 'relative', pointerEvents: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(10,14,26,0.95)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px 6px 8px' }}>
                <span style={{ fontSize: '12px', opacity: 0.5 }}>🔍</span>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search port…"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onKeyDown={onKeyDown}
                    style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '12px', width: '150px' }}
                />
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>/ Search</span>
            </div>

            {showDrop && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: '260px', backgroundColor: 'rgba(8,12,22,0.99)', border: '1px solid var(--border-color)', borderRadius: '7px', boxShadow: '0 8px 24px rgba(0,0,0,0.55)', zIndex: 200, overflow: 'hidden' }}>
                    {results.map((node, i) => (
                        <div
                            key={node.locode}
                            onMouseDown={() => commit(node)}
                            style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: i === cursor ? 'rgba(59,130,246,0.13)' : 'transparent', borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.08s' }}
                        >
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{node.portName}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{node.locode}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PortSearchBar;
