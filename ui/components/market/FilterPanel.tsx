/**
 * ui/components/market/FilterPanel.tsx
 * Left-column filter rail for Market Intelligence 2.0.
 * Phase 10: uses Chip primitive + design tokens for consistent styling.
 */
import React, { useState } from 'react';
import { Availability } from '../../../domain/bunker/types';
import { SavedView, DEFAULT_VIEWS } from '../../../services/MarketIntelService';
import Chip from '../primitives/Chip';
import FilterGrid from './FilterGrid';

export interface FilterState {
    filterAvail: boolean;
    filterHighConf: boolean;
    filterEFuels: boolean;
    filterRegions: string[];
    filterAvailStatus: string[];
    filterCIGrades: string[];
    filterMinSuppliers: number;
    filterPriceMin: string;
    filterPriceMax: string;
    sortCol: string;
    sortDir: 'asc' | 'desc';
}

interface Props {
    state: FilterState;
    onChange: (next: FilterState) => void;
}

const ALL_REGIONS = [
    { key: 'north_europe', label: 'North Europe' },
    { key: 'mediterranean', label: 'Mediterranean' },
    { key: 'middle_east', label: 'Middle East' },
    { key: 'asia', label: 'Asia' },
    { key: 'north_america', label: 'North America' },
    { key: 'south_america', label: 'South America' },
    { key: 'africa', label: 'Africa' },
    { key: 'oceania', label: 'Oceania' },
];

const AVAIL_OPTIONS: { key: Availability; label: string }[] = [
    { key: 'available', label: 'Available' },
    { key: 'limited', label: 'Limited' },
    { key: 'planned', label: 'Planned' },
    { key: 'unknown', label: 'Unknown' },
];

const CI_OPTIONS = ['A', 'B', 'C', 'D', 'unknown'];

const LS_KEY = 'mkt_saved_views';

function loadSavedViews(): Record<string, SavedView> {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

function persistViews(views: Record<string, SavedView>) {
    localStorage.setItem(LS_KEY, JSON.stringify(views));
}

// ── Section header ─────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: 'var(--font-label)', fontWeight: 700, color: 'var(--text-dim-2)', letterSpacing: 'var(--lsp-caps)', marginBottom: '5px', textTransform: 'uppercase', padding: '0 var(--sp-3)' }}>{title}</div>
        {children}
    </div>
);

const INP: React.CSSProperties = { width: '100%', padding: '3px 7px', height: 'var(--input-h)', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 'var(--font-body)', borderRadius: 'var(--radius-sm)', boxSizing: 'border-box' };

// ── FilterPanel ─────────────────────────────────────────────────────────────
const FilterPanel: React.FC<Props> = ({ state, onChange }) => {
    const [savedViews, setSavedViews] = useState<Record<string, SavedView>>(loadSavedViews);
    const [newViewName, setNewViewName] = useState('');
    const [showSave, setShowSave] = useState(false);

    const set = (patch: Partial<FilterState>) => onChange({ ...state, ...patch });

    const toggleList = <T extends string>(arr: T[], item: T): T[] =>
        arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

    const saveView = () => {
        const name = newViewName.trim() || `View ${Date.now()}`;
        const next = { ...savedViews, [name]: { ...state, name } };
        setSavedViews(next); persistViews(next);
        setNewViewName(''); setShowSave(false);
    };

    const loadView = (v: SavedView) => onChange({ ...state, ...v });

    const deleteView = (name: string) => {
        const next = { ...savedViews };
        delete next[name];
        setSavedViews(next); persistViews(next);
    };

    const allViews = { ...DEFAULT_VIEWS, ...savedViews };

    return (
        <div style={{ width: '205px', minWidth: '205px', height: '100%', overflowY: 'auto', backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid rgba(255,255,255,0.07)', padding: '12px 10px', fontSize: '11px' }}>
            {/* Quick filters */}
            <Section title="QUICK FILTERS">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    <Chip label="Available" active={state.filterAvail} color="#10b981" onClick={() => set({ filterAvail: !state.filterAvail })} pill />
                    <Chip label="Conf ≥ 75" active={state.filterHighConf} color="#3b82f6" onClick={() => set({ filterHighConf: !state.filterHighConf })} pill />
                    <Chip label="E-fuels" active={state.filterEFuels} color="#c084fc" onClick={() => set({ filterEFuels: !state.filterEFuels })} pill />
                </div>
            </Section>

            {/* Region */}
            <Section title="REGION">
                <FilterGrid
                    items={ALL_REGIONS}
                    selected={state.filterRegions}
                    onToggle={key => set({ filterRegions: toggleList(state.filterRegions, key) })}
                />
            </Section>

            {/* Availability status */}
            <Section title="AVAILABILITY">
                <FilterGrid
                    items={AVAIL_OPTIONS}
                    selected={state.filterAvailStatus}
                    onToggle={key => set({ filterAvailStatus: toggleList(state.filterAvailStatus, key) })}
                    accentColor="#10b981"
                />
            </Section>

            {/* CI grade */}
            <Section title="CI GRADE">
                <FilterGrid
                    items={CI_OPTIONS.map(g => ({ key: g, label: g }))}
                    selected={state.filterCIGrades}
                    onToggle={key => set({ filterCIGrades: toggleList(state.filterCIGrades, key) })}
                    accentColor="#c084fc"
                />
            </Section>

            {/* Supplier count */}
            <Section title="MIN SUPPLIERS">
                <input type="number" min={0} max={20} value={state.filterMinSuppliers}
                    onChange={e => set({ filterMinSuppliers: Number(e.target.value) })} style={INP} />
            </Section>

            {/* Price range */}
            <Section title="PRICE RANGE (avg)">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    <input type="number" placeholder="Min" value={state.filterPriceMin} onChange={e => set({ filterPriceMin: e.target.value })} style={INP} />
                    <input type="number" placeholder="Max" value={state.filterPriceMax} onChange={e => set({ filterPriceMax: e.target.value })} style={INP} />
                </div>
            </Section>

            {/* Reset */}
            <button
                onClick={() => set({ filterAvail: false, filterHighConf: false, filterEFuels: false, filterRegions: [], filterAvailStatus: [], filterCIGrades: [], filterMinSuppliers: 0, filterPriceMin: '', filterPriceMax: '' })}
                style={{ width: '100%', padding: '4px', fontSize: 'var(--font-body)', color: 'var(--text-dim-2)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: '12px', height: 'var(--btn-h)' }}>
                Clear all filters
            </button>

            {/* Saved views */}
            <Section title="SAVED VIEWS">
                {Object.values(allViews).map(v => (
                    <div key={v.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <button onClick={() => loadView(v)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: '11px', padding: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {v.name}
                        </button>
                        {!DEFAULT_VIEWS[v.name] && (
                            <button onClick={() => deleteView(v.name)} style={{ background: 'none', border: 'none', color: 'rgba(255,0,0,0.4)', cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}>✕</button>
                        )}
                    </div>
                ))}
                {showSave ? (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                        <input autoFocus value={newViewName} onChange={e => setNewViewName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveView(); if (e.key === 'Escape') setShowSave(false); }}
                            placeholder="View name…" style={{ ...INP, flex: 1 }} />
                        <button onClick={saveView} style={{ padding: '4px 8px', fontSize: '10px', backgroundColor: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '4px', cursor: 'pointer' }}>✓</button>
                    </div>
                ) : (
                    <button onClick={() => setShowSave(true)} style={{ width: '100%', padding: '4px', fontSize: '10px', color: 'var(--accent-primary)', background: 'none', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '4px', cursor: 'pointer', marginTop: '4px' }}>
                        + Save current view
                    </button>
                )}
            </Section>
        </div>
    );
};

export default FilterPanel;
