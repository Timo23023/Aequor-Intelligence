/**
 * ui/layout/Nav.tsx
 * Enterprise-style collapsible sidebar navigation.
 * States: expanded (240px) ↔ collapsed (64px icon-only rail).
 * Collapse persists in localStorage. Fires 'navToggle' custom event on change.
 * Header normalized to var(--rail-h) = 52px to align with CommandRail.
 */
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

const NAV_EXPANDED = 240;
const NAV_COLLAPSED = 64;
const LS_KEY = 'navCollapsed';

// Nav items
const NAV_ITEMS = [
    { to: '/efuels', icon: '◎', label: 'Port Intelligence Terminal' },
    { to: '/market', icon: '◈', label: 'Market Intelligence' },
    { to: '/indicators', icon: '≈', label: 'Indicators' },
    { to: '/voyage', icon: '⟳', label: 'Voyage Calculator' },
    { to: '/alerts', icon: '⚑', label: 'Alerts' },
] as const;

export const Nav: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem(LS_KEY) === 'true');

    const toggle = () => {
        setCollapsed(c => {
            const next = !c;
            localStorage.setItem(LS_KEY, String(next));
            window.dispatchEvent(new CustomEvent('navToggle', { detail: { collapsed: next } }));
            return next;
        });
    };

    // Dispatch initial state so AppShell syncs on mount
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('navToggle', { detail: { collapsed } }));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const width = collapsed ? NAV_COLLAPSED : NAV_EXPANDED;

    const linkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: collapsed ? '10px 0' : '10px 14px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        color: isActive ? 'var(--text-primary)' : 'var(--text-dim-1)',
        // Phase 11: soft surface-3 + glow-blue-sm instead of flat border+bg
        backgroundColor: isActive ? 'var(--surface-3)' : 'transparent',
        boxShadow: isActive ? 'inset 2px 0 0 var(--accent-blue), var(--glow-blue-sm)' : 'none',
        textDecoration: 'none',
        fontWeight: isActive ? 600 : 400,
        marginBottom: '1px',
        borderRadius: '0 var(--radius-md) var(--radius-md) 0',
        fontSize: '12px',
        transition: 'background 0.12s, color 0.12s, box-shadow 0.15s',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
    });

    const ICON: React.CSSProperties = {
        fontSize: '16px', flexShrink: 0, width: '20px', textAlign: 'center',
    };
    const LABEL: React.CSSProperties = {
        opacity: collapsed ? 0 : 1,
        maxWidth: collapsed ? 0 : '180px',
        overflow: 'hidden',
        transition: 'opacity 0.18s, max-width 0.18s',
        fontSize: '12px',
        whiteSpace: 'nowrap',
    };

    return (
        <nav style={{
            width, minWidth: width, position: 'fixed', top: 0, left: 0, height: '100vh',
            // Phase 11: surface-1 (deeper than body bg, creates nav depth)
            backgroundColor: 'var(--surface-1)',
            backgroundImage: 'linear-gradient(180deg, rgba(59,130,246,0.012) 0%, transparent 30%)',
            borderRight: '1px solid var(--border-panel)',
            display: 'flex', flexDirection: 'column', transition: 'width 0.22s ease, min-width 0.22s ease',
            overflow: 'hidden', zIndex: 200,
        }}>
            {/* Header — exactly var(--rail-h) = 52px to align with CommandRail */}
            <div style={{
                height: 'var(--rail-h)', flexShrink: 0,
                display: 'flex', alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                padding: collapsed ? '0 12px' : '0 12px 0 14px',
                borderBottom: '1px solid var(--border-subtle)',
            }}>
                {!collapsed && (
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-primary)', lineHeight: 1.1, whiteSpace: 'nowrap' }}>Aequor</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-dim-2)', whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>Intelligence Platform</div>
                    </div>
                )}
                <button onClick={toggle} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    style={{
                        background: 'none', border: '1px solid var(--border-subtle)',
                        color: 'var(--text-dim-2)', cursor: 'pointer',
                        borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: '13px',
                        flexShrink: 0, lineHeight: 1, transition: 'border-color 0.12s, color 0.12s',
                    }}>
                    {collapsed ? '›' : '‹'}
                </button>
            </div>

            {/* Workspace mode slot */}
            {children && <div style={{ padding: collapsed ? '6px 8px' : '6px 10px', flexShrink: 0 }}>{children}</div>}

            {/* Main nav */}
            <div style={{ flex: 1, padding: '6px 0', overflowY: 'auto', overflowX: 'hidden' }}>
                {NAV_ITEMS.map(item => (
                    <NavLink key={item.to} to={item.to} style={linkStyle} title={collapsed ? item.label : undefined}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; if (!el.className) el.style.backgroundColor = 'var(--surface-hover)'; }}
                        onMouseLeave={e => {
                            const el = e.currentTarget as HTMLElement;
                            const activeStyle = window.getComputedStyle(el).backgroundColor;
                            if (activeStyle !== 'rgba(59, 130, 246, 0.1)') el.style.backgroundColor = 'transparent';
                        }}
                    >
                        <span style={ICON}>{item.icon}</span>
                        <span style={LABEL}>{item.label}</span>
                    </NavLink>
                ))}
            </div>

            {/* Documentation footer */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '6px 0', flexShrink: 0 }}>
                <NavLink to="/docs" style={linkStyle} title={collapsed ? 'Documentation' : undefined}>
                    <span style={ICON}>?</span>
                    <span style={LABEL}>Documentation</span>
                </NavLink>
            </div>
        </nav>
    );
};
