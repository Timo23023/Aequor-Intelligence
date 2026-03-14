/**
 * ui/layout/AppShell.tsx
 * Main application shell. Listens to 'navToggle' event from Nav to sync
 * the main content left margin with the sidebar width.
 */
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Nav } from './Nav';
import { useWorkspaceMode } from '../state/workspaceMode';

const NAV_EXPANDED = 240;
const NAV_COLLAPSED = 64;
const LS_KEY = 'navCollapsed';

export const AppShell: React.FC = () => {
    const { mode, toggleMode } = useWorkspaceMode();
    const isPrivate = mode === 'private';

    // Initialize from localStorage so first render matches Nav's width
    const [navWidth, setNavWidth] = useState<number>(
        localStorage.getItem(LS_KEY) === 'true' ? NAV_COLLAPSED : NAV_EXPANDED
    );

    useEffect(() => {
        const handler = (e: Event) => {
            const collapsed = (e as CustomEvent<{ collapsed: boolean }>).detail.collapsed;
            setNavWidth(collapsed ? NAV_COLLAPSED : NAV_EXPANDED);
        };
        window.addEventListener('navToggle', handler);
        return () => window.removeEventListener('navToggle', handler);
    }, []);

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', borderTop: isPrivate ? '3px solid var(--accent-primary)' : '3px solid transparent' }}>
            <Nav>
                {/* Workspace mode toggle passed as child */}
                <div
                    onClick={toggleMode}
                    title={isPrivate ? 'Private Workspace' : 'Public Mode'}
                    style={{
                        padding: '5px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '11px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        backgroundColor: isPrivate ? 'rgba(59,130,246,0.1)' : 'var(--bg-card)',
                        border: isPrivate ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        overflow: 'hidden', whiteSpace: 'nowrap',
                    }}
                >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isPrivate ? 'Private' : 'Public'}
                    </span>
                    <span style={{ fontSize: '9px', opacity: 0.6, marginLeft: '4px', flexShrink: 0 }}>
                        {isPrivate ? 'BYOD' : 'OPEN'}
                    </span>
                </div>
            </Nav>

            <main style={{
                marginLeft: `${navWidth}px`,
                flex: 1,
                height: '100vh',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-primary)',
                transition: 'margin-left 0.22s ease',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
            }}>
                <Outlet />
            </main>
        </div>
    );
};
