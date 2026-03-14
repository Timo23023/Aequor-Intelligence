/**
 * ui/components/primitives/Chip.tsx
 * Unified chip/toggle button used in CommandRail, FilterPanel, IntelPanel.
 * Phase 11: adds glow system for active state — institutional, not neon.
 */
import React from 'react';

interface ChipProps {
    label: React.ReactNode;
    active?: boolean;
    /** Hex accent color override. Defaults to var(--accent-blue). */
    color?: string;
    onClick?: () => void;
    title?: string;
    style?: React.CSSProperties;
    /** If true, uses pill border-radius instead of square */
    pill?: boolean;
    /** Icon or prefix element */
    icon?: React.ReactNode;
    disabled?: boolean;
    id?: string;
}

/**
 * Resolve glow shadow for a given active color.
 * Keeps glow institutional: 1px ring + very soft outer blur (max 10px).
 */
function resolveGlow(color: string | undefined): string | undefined {
    if (!color) return 'var(--glow-blue-sm)';
    // Map hex shortcuts to pre-baked glow tokens
    if (color === '#10b981') return 'var(--glow-emerald-sm)';
    if (color === '#f59e0b') return 'var(--glow-amber-sm)';
    if (color === '#8b5cf6') return 'var(--glow-violet-sm)';
    if (color === '#facc15') return 'var(--glow-amber-sm)';
    if (color === '#c084fc') return 'var(--glow-violet-sm)';
    if (color === '#f97316') return 'var(--glow-amber-sm)';
    if (color === '#f43f5e') return 'var(--glow-rose-sm)';
    if (color.startsWith('var(')) return 'var(--glow-blue-sm)';
    // Generic: build a small glow from the color
    return `0 0 0 1px ${color}35, 0 0 10px ${color}18`;
}

const Chip: React.FC<ChipProps> = ({ label, active, color, onClick, title, style, pill, icon, disabled, id }) => {
    const accentRaw = color ?? 'var(--accent-blue)';
    const isVar = accentRaw.startsWith('var(');

    const borderColor = active
        ? (isVar ? `color-mix(in srgb, ${accentRaw} 55%, transparent)` : accentRaw + '55')
        : 'var(--border-mid)';
    const bgColor = active
        ? (isVar ? `color-mix(in srgb, ${accentRaw} 14%, transparent)` : accentRaw + '14')
        : 'transparent';
    const textColor = active ? accentRaw : 'var(--text-dim-1)';
    const glowShadow = active ? resolveGlow(isVar ? undefined : accentRaw) : undefined;

    const computedStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        height: 'var(--chip-h)',
        padding: '0 8px',
        fontSize: 'var(--font-body)',
        fontWeight: 600,
        fontFamily: 'inherit',
        borderRadius: pill ? 'var(--radius-pill)' : 'var(--radius-sm)',
        border: `1px solid ${borderColor}`,
        background: bgColor,
        color: textColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 0.12s, border-color 0.12s, color 0.12s, box-shadow 0.15s',
        lineHeight: 1,
        opacity: disabled ? 0.4 : 1,
        flexShrink: 0,
        boxShadow: glowShadow,
        ...style,
    };

    return (
        <button id={id} style={computedStyle} onClick={onClick} title={title} disabled={disabled}>
            {icon && <span style={{ fontSize: '10px', lineHeight: 1 }}>{icon}</span>}
            {label}
        </button>
    );
};

export default Chip;
