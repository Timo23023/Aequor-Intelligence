/**
 * ui/components/bunker/CommandRail.tsx
 * Full-width 52px terminal command rail.
 * Phase 10: uses RailButton + RailDivider primitives, normalized control heights,
 * rationalized divider placement (2 dividers: after basis group, before overflow).
 */
import React, { useState, RefObject } from 'react';
import { FuelProduct, Currency, PriceBasis, BunkerNode } from '../../../domain/bunker/types';
import PortSearchBar from './PortSearchBar';
import { RailButton, RailDivider } from '../primitives/RailButton';

const FUEL_OPTIONS: { value: FuelProduct; label: string }[] = [
    { value: 'e_methanol', label: 'e-Methanol' },
    { value: 'e_ammonia', label: 'e-Ammonia' },
    { value: 'vlsfo', label: 'VLSFO' },
    { value: 'mgo', label: 'MGO' },
];

export interface CommandRailProps {
    selectedFuel: FuelProduct;
    selectedCurrency: Currency;
    selectedBasis: PriceBasis;
    filterAvail: boolean;
    filterHighConf: boolean;
    filterEFuels: boolean;
    compareMode: boolean;
    useMaptiler: boolean;
    filteredCount: number;
    totalCount: number;
    guidedDemoOpen: boolean;
    nodes: BunkerNode[];
    searchRef: RefObject<HTMLInputElement>;
    onFuelChange: (f: FuelProduct) => void;
    onCurrencyChange: (c: Currency) => void;
    onBasisChange: (b: PriceBasis) => void;
    onFilterAvail: () => void;
    onFilterHighConf: () => void;
    onFilterEFuels: () => void;
    onCompareToggle: () => void;
    onSearchSelect: (node: BunkerNode) => void;
    onGuidedDemo: () => void;
    onCopyShareLink?: () => void;
}

const CommandRail: React.FC<CommandRailProps> = (p) => {
    const [moreOpen, setMoreOpen] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    const handleCopyLink = () => {
        if (p.onCopyShareLink) p.onCopyShareLink();
        else navigator.clipboard.writeText(window.location.href);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    return (
        <div style={{
            position: 'relative', display: 'flex', alignItems: 'center',
            height: 'var(--rail-h)', flexShrink: 0,
            padding: '0 var(--sp-3)', gap: 'var(--sp-1)',
            // Surface-0 with very subtle inner gradient for depth separation
            backgroundColor: 'var(--surface-0)',
            backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.018) 0%, transparent 100%)',
            // Softer border + ambient bottom shadow
            borderBottom: '1px solid var(--border-panel)',
            boxShadow: 'var(--shadow-rail)',
            zIndex: 50, pointerEvents: 'auto',
        }}>

            {/* ── Search ── */}
            <div style={{ flexShrink: 0 }}>
                <PortSearchBar nodes={p.nodes} inputRef={p.searchRef} onSelect={p.onSearchSelect} />
            </div>

            {/* ── Fuel select ── */}
            <select
                value={p.selectedFuel}
                onChange={e => p.onFuelChange(e.target.value as FuelProduct)}
                style={{
                    background: 'var(--surface-1)', border: '1px solid var(--border-mid)',
                    color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)',
                    padding: '0 7px', fontSize: '11px', fontWeight: 600,
                    cursor: 'pointer', height: 'var(--rail-input-h)', flexShrink: 0,
                    width: 'auto', maxWidth: '130px', fontFamily: 'inherit',
                }}
            >
                {FUEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* ── Currency segmented control ── */}
            <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                {(['USD', 'EUR'] as Currency[]).map(c =>
                    <RailButton key={c} label={c} active={p.selectedCurrency === c} onClick={() => p.onCurrencyChange(c)} />)}
            </div>

            {/* ── Basis segmented control ── */}
            <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                {(['posted', 'dap'] as PriceBasis[]).map(b =>
                    <RailButton key={b} label={b.toUpperCase()} active={p.selectedBasis === b} onClick={() => p.onBasisChange(b)} />)}
            </div>

            <RailDivider />

            {/* ── Quick filters ── */}
            <RailButton label="Available" active={p.filterAvail} color="#10b981" onClick={p.onFilterAvail} />
            <RailButton label="Conf ≥ 75" active={p.filterHighConf} color="#3b82f6" onClick={p.onFilterHighConf} />
            <RailButton label="E-fuels" active={p.filterEFuels} color="#c084fc" onClick={p.onFilterEFuels} />

            {/* Port counter */}
            <span style={{
                fontSize: '11px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                color: 'var(--text-dim-2)', whiteSpace: 'nowrap', marginLeft: 'var(--sp-1)',
                flexShrink: 0,
            }}>
                {p.filteredCount} / {p.totalCount}
            </span>

            <RailDivider />

            {/* ── Compare toggle ── */}
            <RailButton
                label={p.compareMode ? '⊠ Compare ON' : '⊞ Compare'}
                active={p.compareMode} color="#facc15"
                onClick={p.onCompareToggle}
            />

            {/* ── DEMO badge + Guide ── */}
            <span style={{ fontSize: '9px', fontWeight: 800, color: '#d97706', letterSpacing: '0.10em', whiteSpace: 'nowrap', flexShrink: 0 }}>DEMO</span>
            <RailButton
                label={p.guidedDemoOpen ? '✕ Exit' : 'ⓘ Guide'}
                active={p.guidedDemoOpen} color="#f59e0b"
                onClick={p.onGuidedDemo}
                style={{ fontSize: '10px', padding: '0 8px' }}
            />

            {/* Spacer */}
            <div style={{ flex: 1, minWidth: 0 }} />

            {/* ── Overflow menu ── */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <RailButton label="▾" active={moreOpen} onClick={() => setMoreOpen(o => !o)} style={{ padding: '0 10px' }} />
                {moreOpen && (
                    <div style={{
                        position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                        backgroundColor: 'var(--surface-2)',
                        backdropFilter: 'var(--blur-popover)',
                        WebkitBackdropFilter: 'var(--blur-popover)',
                        border: '1px solid var(--border-mid)',
                        borderRadius: 'var(--radius-lg)', padding: '10px 14px',
                        minWidth: '200px', boxShadow: 'var(--shadow-popover)', zIndex: 200,
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: p.useMaptiler ? '#10b981' : '#f59e0b', marginBottom: 'var(--sp-2)' }}>
                            {p.useMaptiler ? '🗺 MapTiler active' : '📐 SVG fallback'}
                        </div>
                        <button
                            onClick={handleCopyLink}
                            style={{
                                width: '100%', marginBottom: 'var(--sp-2)',
                                padding: '5px 10px', fontSize: '11px', fontWeight: 700,
                                backgroundColor: linkCopied ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
                                color: linkCopied ? '#10b981' : 'var(--text-dim-1)',
                                border: `1px solid ${linkCopied ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}`,
                                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                textAlign: 'left', transition: 'all 0.15s',
                            }}
                        >
                            {linkCopied ? '✓ Copied' : '🔗 Copy Share Link'}
                        </button>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim-3)', lineHeight: 1.8 }}>
                            1–4 fuel · U / E currency<br />
                            P / D basis · / search<br />
                            Esc close chain
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommandRail;
