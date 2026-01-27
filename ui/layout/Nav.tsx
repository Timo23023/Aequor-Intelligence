import React from 'react';
import { NavLink } from 'react-router-dom';

export const Nav: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const getLinkStyle = ({ isActive }: { isActive: boolean }) => ({
        display: 'block',
        padding: '12px 16px',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
        textDecoration: 'none',
        fontWeight: isActive ? 600 : 500,
        borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
        marginBottom: '4px',
        borderRadius: '0 4px 4px 0',
    });

    return (
        <nav style={{ padding: '16px 0', width: '240px', borderRight: '1px solid var(--border-color)', height: '100vh', position: 'fixed', top: 0, left: 0, backgroundColor: 'var(--bg-secondary)' }}>
            <div style={{ padding: '0 16px 24px 16px' }}>
                <h2 style={{ fontSize: '18px', color: 'var(--accent-primary)', margin: 0 }}>Aequor</h2>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Intelligence Platform</span>
            </div>

            {children}

            <NavLink to="/market" style={getLinkStyle}>Market Overview</NavLink>
            <NavLink to="/indicators" style={getLinkStyle}>Indicators</NavLink>
            <NavLink to="/voyage" style={getLinkStyle}>Voyage Calculator</NavLink>
            <NavLink to="/alerts" style={getLinkStyle}>Alerts</NavLink>

            <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border-color)', margin: '24px 16px 0 16px' }}>
                <NavLink to="/docs" style={{ ...getLinkStyle({ isActive: false }), padding: '8px 0', fontSize: '14px' }}>Documentation</NavLink>
            </div>
        </nav>
    );
};

