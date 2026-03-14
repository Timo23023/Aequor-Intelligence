/**
 * ui/components/primitives/RailButton.tsx
 * RailButton: a button sized to fit exactly in the 52px CommandRail.
 * RailDivider: vertical separator between CommandRail groups.
 * Phase 11: active state gets matched glow, hover brightens subtly.
 */
import React from 'react';

interface RailButtonProps {
    label: React.ReactNode;
    active?: boolean;
    color?: string;
    onClick?: () => void;
    title?: string;
    style?: React.CSSProperties;
    id?: string;
}

/**
 * Resolve glow for rail buttons.
 * Same logic as Chip — maps accent colors to pre-baked glow tokens.
 */
function resolveGlow(color: string | undefined): string | undefined {
    if (!color) return 'var(--glow-blue-sm)';
    if (color === '#10b981') return 'var(--glow-emerald-sm)';
    if (color === '#f59e0b') return 'var(--glow-amber-sm)';
    if (color === '#facc15') return 'var(--glow-amber-sm)';
    if (color === '#8b5cf6') return 'var(--glow-violet-sm)';
    if (color === '#c084fc') return 'var(--glow-violet-sm)';
    if (color === '#f97316') return 'var(--glow-amber-sm)';
    if (color === '#f43f5e') return 'var(--glow-rose-sm)';
    if (color.startsWith('var(')) return 'var(--glow-blue-sm)';
    return `0 0 0 1px ${color}35, 0 0 10px ${color}18`;
}

export const RailButton: React.FC<RailButtonProps> = ({ label, active, color, onClick, title, style, id }) => {
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

    return (
        <button
            id={id}
            onClick={onClick}
            title={title}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 'var(--chip-h)',
                padding: '0 9px',
                fontSize: 'var(--font-body)',
                fontWeight: 600,
                fontFamily: 'inherit',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${borderColor}`,
                background: bgColor,
                color: textColor,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.12s, border-color 0.12s, color 0.12s, box-shadow 0.15s',
                lineHeight: 1,
                flexShrink: 0,
                boxShadow: glowShadow,
                ...style,
            }}
        >
            {label}
        </button>
    );
};

export const RailDivider: React.FC = () => (
    <span style={{
        width: '1px',
        height: '18px',
        backgroundColor: 'var(--divider-rail)',
        margin: '0 var(--sp-2)',
        flexShrink: 0,
        display: 'inline-block',
    }} />
);
