/**
 * ui/components/market/FilterGrid.tsx
 * Phase 13: 2-column filter grid for Market Intelligence filter panel.
 * Replaces freestanding <Check> rows with a scannable grid layout.
 *
 * Layout per row:
 *   [Label text …………………] [☐]
 *
 * Tokens used:
 *   --row-h, --sp-2, --font-body, --surface-hover, --border-subtle,
 *   --text-primary, --text-dim-2, --radius-sm
 */
import React from 'react';

interface FilterGridItem {
    key: string;
    label: string;
}

interface FilterGridProps {
    items: FilterGridItem[];
    selected: string[];
    onToggle: (key: string) => void;
    /** Accent color for checked state. Defaults to var(--accent-blue). */
    accentColor?: string;
}

const FilterGrid: React.FC<FilterGridProps> = ({
    items,
    selected,
    onToggle,
    accentColor = 'var(--accent-blue)',
}) => {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '1px',
            }}
        >
            {items.map(item => {
                const isChecked = selected.includes(item.key);

                return (
                    <label
                        key={item.key}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            alignItems: 'center',
                            gap: 'var(--sp-2)',
                            padding: '0 var(--sp-3)',
                            height: 'var(--row-h)',
                            cursor: 'pointer',
                            borderRadius: 'var(--radius-sm)',
                            transition: 'background 0.10s',
                            userSelect: 'none',
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                    >
                        {/* Label — left column */}
                        <span
                            style={{
                                fontSize: 'var(--font-body)',
                                color: isChecked ? 'var(--text-primary)' : 'var(--text-dim-1)',
                                fontWeight: isChecked ? 600 : 400,
                                lineHeight: 1,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                                transition: 'color 0.10s, font-weight 0.10s',
                            }}
                        >
                            {item.label}
                        </span>

                        {/* Checkbox — right column */}
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggle(item.key)}
                            style={{
                                accentColor,
                                margin: 0,
                                cursor: 'pointer',
                                width: '13px',
                                height: '13px',
                                flexShrink: 0,
                            }}
                        />
                    </label>
                );
            })}
        </div>
    );
};

export default FilterGrid;
