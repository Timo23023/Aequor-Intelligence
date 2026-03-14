/**
 * ui/components/primitives/Panel.tsx
 * Panel, PanelHeader, and SectionTitle primitives.
 * Phase 11: uses surface depth system + card lighting tokens.
 */
import React from 'react';

// ── Panel ─────────────────────────────────────────────────────────────────
interface PanelProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    /** Elevated variant (Surface 2 — for drawers/popovers) */
    elevated?: boolean;
}

export const Panel: React.FC<PanelProps> = ({ children, style, className, elevated }) => (
    <div
        className={className}
        style={{
            backgroundColor: elevated ? 'var(--surface-2)' : 'var(--surface-1)',
            backgroundImage: 'var(--card-gradient)',
            border: `1px solid ${elevated ? 'var(--border-mid)' : 'var(--border-panel)'}`,
            borderRadius: 'var(--radius-md)',
            // Top-edge highlight creates subtle dimensional lighting
            boxShadow: 'var(--card-inset-top), var(--shadow-card)',
            ...style,
        }}
    >
        {children}
    </div>
);

// ── PanelHeader ───────────────────────────────────────────────────────────
interface PanelHeaderProps {
    title: React.ReactNode;
    right?: React.ReactNode;
    style?: React.CSSProperties;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({ title, right, style }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 14px',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
        ...style,
    }}>
        <span style={{
            fontSize: 'var(--font-label)',
            fontWeight: 700,
            letterSpacing: 'var(--lsp-caps)',
            color: 'var(--text-dim-2)',
            textTransform: 'uppercase',
        }}>
            {title}
        </span>
        {right && <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>{right}</div>}
    </div>
);

// ── SectionTitle ──────────────────────────────────────────────────────────
interface SectionTitleProps {
    children: React.ReactNode;
    right?: React.ReactNode;
    style?: React.CSSProperties;
    /** Makes title sticky within scroll container */
    sticky?: boolean;
    stickyTop?: number | string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ children, right, style, sticky, stickyTop = 0 }) => (
    <div
        className="section-title"
        style={{
            position: sticky ? 'sticky' : undefined,
            top: sticky ? stickyTop : undefined,
            zIndex: sticky ? 5 : undefined,
            ...style,
        }}
    >
        <span style={{ flex: 1 }}>{children}</span>
        {right && <span>{right}</span>}
    </div>
);

// ── CountBadge ────────────────────────────────────────────────────────────
export const CountBadge: React.FC<{ count: number | undefined }> = ({ count }) =>
    count !== undefined ? (
        <span style={{
            fontSize: '9px',
            backgroundColor: 'var(--text-dim-4)',
            color: 'var(--text-dim-2)',
            padding: '1px 6px',
            borderRadius: 'var(--radius-pill)',
        }}>
            {count}
        </span>
    ) : null;
