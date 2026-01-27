import React from 'react';
import { Outlet } from 'react-router-dom';
import { Nav } from './Nav';
import { useWorkspaceMode } from '../state/workspaceMode';

export const AppShell: React.FC = () => {
    const { mode, toggleMode } = useWorkspaceMode();
    const isPrivate = mode === 'private';

    return (
        <div style={{ display: 'flex', minHeight: '100vh', borderTop: isPrivate ? '4px solid var(--accent-primary)' : '4px solid transparent' }}>
            <Nav>
                <div style={{ padding: '0 16px', marginBottom: '16px' }}>
                    <div
                        onClick={toggleMode}
                        style={{
                            padding: '8px',
                            borderRadius: '4px',
                            backgroundColor: isPrivate ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-card)',
                            border: isPrivate ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                    >
                        <span>{isPrivate ? 'Private Workspace' : 'Public Mode'}</span>
                        <span style={{ fontSize: '10px', opacity: 0.7 }}>{isPrivate ? 'BYOD' : 'OPEN'}</span>
                    </div>
                </div>
            </Nav>
            <main style={{ marginLeft: '240px', flex: 1, padding: '0', backgroundColor: 'var(--bg-primary)' }}>
                <Outlet />
            </main>
        </div>
    );
};
