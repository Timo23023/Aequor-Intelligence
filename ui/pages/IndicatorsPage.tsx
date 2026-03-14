/**
 * ui/pages/IndicatorsPage.tsx
 * Phase 12 — Market Indicators Terminal
 * 3-column analytics terminal: [FilterPanel | Screener | IntelPanel]
 * Single scroll model → fits inside AppShell <main> (height:100vh, overflow:hidden).
 * URL state: ?ind=<id>&sort=<col>&dir=asc|desc&q=<search>&cat=<cats>
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    getIndicators, getIndicatorSeries, getWhatChanged, getIndicatorNarrative,
    computeDeltas, deriveVolatility, applyFX, getLastUpdated,
    type IndicatorMeta, type SeriesPoint, type VolatilityLevel,
} from '../../services/MarketIndicatorsService';
import * as IAS from '../../services/IndicatorAlertsService';
import { parseGlobalParams, needsCanonical, applyGlobalParams } from '../../services/AppStateService';
import CommandRail from '../components/bunker/CommandRail';
import { listBunkerNodes } from '../../services/BunkerService';
import type { BunkerNode } from '../../domain/bunker/types';
import Chip from '../components/primitives/Chip';
import { SectionTitle } from '../components/primitives/Panel';
import { RailButton, RailDivider } from '../components/primitives/RailButton';

const MAPTILER_KEY = ((import.meta.env.VITE_MAPTILER_API_KEY as string) || '').trim();
const USE_MAPTILER = MAPTILER_KEY.length > 0;

// ── Constants ──────────────────────────────────────────────────────────────

const ALL_CATS = ['Freight', 'Bunker', 'Commodity', 'Energy', 'Macro'] as const;
const ALL_COLS = ['fav', 'name', 'value', 'unit', 'd1abs', 'd1pct', 'd7abs', 'd7pct', 'd30pct', 'spark', 'updated', 'category', 'source'] as const;
type ColId = typeof ALL_COLS[number];
const COL_LABELS: Record<ColId, string> = {
    fav: '★', name: 'Name', value: 'Value', unit: 'Unit',
    d1abs: '1D Δ', d1pct: '1D %', d7abs: '7D Δ', d7pct: '7D %',
    d30pct: '30D %', spark: 'Trend', updated: 'Updated', category: 'Category', source: 'Source',
};
const DEFAULT_VISIBLE: Set<ColId> = new Set(['fav', 'name', 'value', 'unit', 'd1pct', 'd7pct', 'd30pct', 'spark', 'category']);

// ── Helpers ────────────────────────────────────────────────────────────────

const compactDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch { return iso.slice(0, 10); }
};

const deltaColor = (v: number) => v > 0 ? 'var(--accent-emerald)' : v < 0 ? 'var(--accent-rose)' : 'var(--text-dim-2)';
const deltaSign = (v: number) => v > 0 ? '+' : '';

const VOL_COLOR: Record<VolatilityLevel, string> = {
    low: 'var(--accent-emerald)', med: 'var(--accent-amber)', high: 'var(--accent-rose)',
};
const VOL_GLOW: Record<VolatilityLevel, string> = {
    low: 'var(--glow-emerald-sm)', med: 'var(--glow-amber-sm)', high: 'var(--glow-rose-sm)',
};

const CAT_COLOR: Record<string, string> = {
    Freight: '#3b82f6', Bunker: '#f59e0b', Commodity: '#10b981', Energy: '#c084fc', Macro: '#94a3b8',
};

// ── Inline Sparkline (SVG) ─────────────────────────────────────────────────

const Sparkline: React.FC<{ series: SeriesPoint[]; width?: number; height?: number; color?: string }> = ({
    series, width = 52, height = 22, color = 'var(--accent-blue)',
}) => {
    if (series.length < 2) return <span style={{ color: 'var(--text-dim-3)', fontSize: '9px' }}>—</span>;
    const slice = series.slice(-30);
    const vals = slice.map(p => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const pts = vals.map((v, i) => {
        const x = (i / (vals.length - 1)) * (width - 2) + 1;
        const y = height - 2 - ((v - min) / range) * (height - 4);
        return `${x},${y}`;
    }).join(' ');
    const lastV = vals[vals.length - 1];
    const trend = lastV >= vals[0] ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    return (
        <svg width={width} height={height} style={{ display: 'block' }}>
            <polyline points={pts} fill="none" stroke={trend} strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
    );
};

// ── MiniChart (larger sparkline with range toggle) ─────────────────────────

const MiniChart: React.FC<{ series: SeriesPoint[]; range: string; height?: number }> = ({ series, range, height = 72 }) => {
    const width = 300;
    if (series.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim-3)', fontSize: '11px' }}>No data</div>;
    const vals = series.map(p => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const r = max - min || 1;
    const pts = vals.map((v, i) => {
        const x = 1 + (i / (vals.length - 1)) * (width - 2);
        const y = height - 4 - ((v - min) / r) * (height - 8);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    // Area fill
    const firstX = 1; const lastX = width - 1;
    const firstY = height - 4 - ((vals[0] - min) / r) * (height - 8);
    const lastY = height - 4 - ((vals[vals.length - 1] - min) / r) * (height - 8);
    const area = `${firstX},${height - 4} ${pts} ${lastX},${height - 4}`;
    const trend = vals[vals.length - 1] >= vals[0];
    const lineColor = trend ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
            <defs>
                <linearGradient id={`grad-${range}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
                    <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={area} fill={`url(#grad-${range})`} />
            <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
    );
};

// ── IndicatorsPage ─────────────────────────────────────────────────────────

type SortCol = 'name' | 'd1pct' | 'd7pct' | 'd30pct' | 'value' | 'category';

interface RowData {
    meta: IndicatorMeta;
    series1M: SeriesPoint[];
    value: number;
    unit: string;
    d1abs: number; d1pct: number;
    d7abs: number; d7pct: number;
    d30abs: number; d30pct: number;
    vol: VolatilityLevel;
    updatedAt: string;
    isFav: boolean;
}

const IndicatorsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // ── Global rail state ─────────────────────────────────────────────────
    const gp = parseGlobalParams(searchParams);
    const fuel = gp.fuel;
    const currency = gp.currency as 'USD' | 'EUR';
    const basis = gp.basis;

    useEffect(() => {
        if (needsCanonical(searchParams)) {
            setSearchParams(p => { applyGlobalParams(p, gp); return p; }, { replace: true });
        }
    }, [gp, searchParams, setSearchParams]);

    // ── BunkerNodes (for CommandRail) ─────────────────────────────────────
    const [nodes] = useState<BunkerNode[]>(() => listBunkerNodes());

    // ── Filter state ──────────────────────────────────────────────────────
    const urlCat = searchParams.get('cat');
    const urlQ = searchParams.get('q') ?? '';
    const urlInd = searchParams.get('ind');
    const urlSort = (searchParams.get('sort') as SortCol) ?? 'd7pct';
    const urlDir = (searchParams.get('dir') as 'asc' | 'desc') ?? 'desc';

    const [selCats, setSelCats] = useState<Set<string>>(() =>
        urlCat ? new Set(urlCat.split(',').filter(Boolean)) : new Set());
    const [search, setSearch] = useState(urlQ);
    const [onlyFavs, setOnlyFavs] = useState(false);
    const [sortCol, setSortCol] = useState<SortCol>(urlSort);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>(urlDir);
    const [selId, setSelId] = useState<string | null>(urlInd);
    const [colVis, setColVis] = useState<Set<ColId>>(() => IAS.getColVisibility() as Set<ColId>);
    const [showColMenu, setShowColMenu] = useState(false);
    const [showRuleModal, setShowRuleModal] = useState(false);
    const [favs, setFavs] = useState<Set<string>>(IAS.getFavorites);
    const [chartRange, setChartRange] = useState<'1M' | '3M' | '1Y'>('3M');
    const colMenuRef = useRef<HTMLDivElement>(null);

    // ── Row data (memoised) ───────────────────────────────────────────────
    const allRows = useMemo((): RowData[] => {
        return getIndicators().map(meta => {
            const series1M = getIndicatorSeries(meta.id, '1M');
            const seriesFull = getIndicatorSeries(meta.id, '3M');
            const deltas = computeDeltas(seriesFull);
            const vol = deriveVolatility(seriesFull);
            const latest = series1M[series1M.length - 1]?.value ?? meta.baseValue;
            const fxd = applyFX(latest, meta.unit, currency);
            return {
                meta,
                series1M,
                value: fxd.value,
                unit: fxd.unit,
                d1abs: deltas.d1.abs, d1pct: deltas.d1.pct,
                d7abs: deltas.d7.abs, d7pct: deltas.d7.pct,
                d30abs: deltas.d30.abs, d30pct: deltas.d30.pct,
                vol,
                updatedAt: getLastUpdated(meta.id),
                isFav: favs.has(meta.id),
            };
        });
    }, [currency, favs]);

    // ── Filtered + sorted rows ─────────────────────────────────────────────
    const visRows = useMemo(() => {
        let rows = allRows;
        if (selCats.size > 0) rows = rows.filter(r => selCats.has(r.meta.category));
        if (onlyFavs) rows = rows.filter(r => r.isFav);
        if (search.trim()) {
            const q = search.toLowerCase();
            rows = rows.filter(r => r.meta.name.toLowerCase().includes(q) || r.meta.shortName.toLowerCase().includes(q));
        }
        rows = [...rows].sort((a, b) => {
            let va: number | string = 0, vb: number | string = 0;
            switch (sortCol) {
                case 'name': va = a.meta.name; vb = b.meta.name; break;
                case 'd1pct': va = a.d1pct; vb = b.d1pct; break;
                case 'd7pct': va = a.d7pct; vb = b.d7pct; break;
                case 'd30pct': va = a.d30pct; vb = b.d30pct; break;
                case 'value': va = a.value; vb = b.value; break;
                case 'category': va = a.meta.category; vb = b.meta.category; break;
            }
            if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
            return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
        });
        return rows;
    }, [allRows, selCats, onlyFavs, search, sortCol, sortDir]);

    // ── Selected row data ──────────────────────────────────────────────────
    const selRow = useMemo(() => allRows.find(r => r.meta.id === selId) ?? null, [allRows, selId]);
    const selSeries = useMemo(() => selRow ? getIndicatorSeries(selRow.meta.id, chartRange) : [], [selRow, chartRange]);
    const selChanged = useMemo(() => selRow ? getWhatChanged(selRow.meta.id) : [], [selRow]);
    const selNarrative = useMemo(() => selRow ? getIndicatorNarrative(selRow.meta.id) : null, [selRow]);

    // ── URL sync ──────────────────────────────────────────────────────────
    const syncUrl = useCallback((updates: Record<string, string>) => {
        setSearchParams(p => {
            Object.entries(updates).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
            return p;
        }, { replace: true });
    }, [setSearchParams]);

    const handleSelect = (id: string) => {
        setSelId(id);
        syncUrl({ ind: id });
    };

    const handleSort = (col: SortCol) => {
        const dir = sortCol === col && sortDir === 'desc' ? 'asc' : 'desc';
        setSortCol(col); setSortDir(dir);
        syncUrl({ sort: col, dir });
    };

    const handleCatToggle = (cat: string) => {
        const next = new Set(selCats);
        if (cat === 'All') { next.clear(); }
        else { next.has(cat) ? next.delete(cat) : next.add(cat); }
        setSelCats(next);
        syncUrl({ cat: [...next].join(',') });
    };

    const handleSearch = (q: string) => {
        setSearch(q);
        syncUrl({ q });
    };

    const handleFav = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        IAS.toggleFavorite(id);
        setFavs(IAS.getFavorites());
    };

    const handleColVis = (col: ColId) => {
        const next = new Set(colVis);
        if (col === 'fav' || col === 'name') return; // always visible
        next.has(col) ? next.delete(col) : next.add(col);
        setColVis(next);
        IAS.saveColVisibility(next);
    };

    // Saved views
    const [savedViews, setSavedViews] = useState<IAS.IndicatorView[]>(IAS.getSavedViews);
    const allViews = [...IAS.DEFAULT_VIEWS, ...savedViews];

    const applyView = (v: IAS.IndicatorView) => {
        setSelCats(new Set(v.cat));
        setSortCol(v.sortCol as SortCol);
        setSortDir(v.sortDir);
        setOnlyFavs(v.onlyFavs);
    };

    // Close col menu on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => { if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setShowColMenu(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    // ── Sorting chevron ────────────────────────────────────────────────────
    const chevron = (col: SortCol) => sortCol === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

    // ── Styles ─────────────────────────────────────────────────────────────
    const TH = (col: ColId, align: 'left' | 'right' = 'left'): React.CSSProperties => ({
        padding: '5px 8px',
        fontSize: 'var(--font-label)', fontWeight: 700,
        letterSpacing: 'var(--lsp-caps)', color: 'var(--text-dim-2)',
        textAlign: align, whiteSpace: 'nowrap',
        position: 'sticky', top: 0,
        backgroundColor: 'var(--surface-0)', zIndex: 10,
        boxShadow: '0 1px 0 var(--border-subtle)',
        cursor: 'pointer', userSelect: 'none',
        transition: 'color 0.10s',
    });
    const TH_nosort = (): React.CSSProperties => ({
        ...TH('name'), cursor: 'default',
    });
    const TD: React.CSSProperties = {
        padding: '3px 8px', height: 'var(--row-h)',
        fontSize: 'var(--font-body)', fontVariantNumeric: 'tabular-nums',
        borderBottom: '1px solid var(--border-subtle)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        verticalAlign: 'middle',
    };

    // ── CommandRail passthrough ────────────────────────────────────────────
    const handleRailFuel = (f: typeof fuel) => syncUrl({ fuel: f });
    const handleRailCurrency = (c: typeof currency) => syncUrl({ ccy: c });
    const handleRailBasis = (b: typeof basis) => syncUrl({ basis: b });

    // ── Alert rule modal state ─────────────────────────────────────────────
    const [ruleType, setRuleType] = useState<IAS.AlertRuleType>('pct_move');
    const [ruleThreshold, setRuleThreshold] = useState('5');
    const [ruleWindow, setRuleWindow] = useState<IAS.AlertWindow>('7d');

    const handleAddRule = () => {
        if (!selRow) return;
        const label = ruleType === 'pct_move' ? `${selRow.meta.shortName} ≥ ${ruleThreshold}% move (${ruleWindow})`
            : ruleType === 'crosses_above' ? `${selRow.meta.shortName} crosses above ${ruleThreshold}`
                : ruleType === 'crosses_below' ? `${selRow.meta.shortName} crosses below ${ruleThreshold}`
                    : `${selRow.meta.shortName} volatility HIGH`;
        IAS.addRule({
            indicatorId: selRow.meta.id,
            indicatorName: selRow.meta.name,
            type: ruleType, threshold: parseFloat(ruleThreshold) || 5,
            window: ruleType === 'pct_move' ? ruleWindow : undefined,
            enabled: true, label,
        });
        setShowRuleModal(false);
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* ── CommandRail ── */}
            <CommandRail
                selectedFuel={fuel} selectedCurrency={currency} selectedBasis={basis}
                filterAvail={false} filterHighConf={false} filterEFuels={false}
                compareMode={false} useMaptiler={USE_MAPTILER}
                filteredCount={visRows.length} totalCount={allRows.length}
                guidedDemoOpen={false} nodes={nodes}
                searchRef={colMenuRef as React.RefObject<HTMLInputElement>} onSearchSelect={() => { }}
                onFuelChange={handleRailFuel} onCurrencyChange={handleRailCurrency}
                onBasisChange={handleRailBasis}
                onFilterAvail={() => { }} onFilterHighConf={() => { }} onFilterEFuels={() => { }}
                onCompareToggle={() => { }} onGuidedDemo={() => { }}
            />

            {/* ── 3-Column Body ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

                {/* ═══ Col A — Filter Panel ═══════════════════════════════ */}
                <div style={{
                    width: '220px', minWidth: '220px', flexShrink: 0,
                    backgroundColor: 'var(--surface-1)', borderRight: '1px solid var(--border-panel)',
                    display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden',
                }}>
                    {/* Search */}
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
                        <input
                            value={search} onChange={e => handleSearch(e.target.value)}
                            placeholder="Search indicator…"
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                height: 'var(--input-h)', padding: '0 8px',
                                background: 'var(--surface-2)', border: '1px solid var(--border-mid)',
                                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                                fontSize: 'var(--font-body)', fontFamily: 'inherit', outline: 'none',
                            }}
                        />
                    </div>

                    {/* Category quick pills */}
                    <SectionTitle>Category</SectionTitle>
                    <div style={{ padding: '6px 10px 8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        <Chip label="All" active={selCats.size === 0} pill onClick={() => handleCatToggle('All')} />
                        {ALL_CATS.map(cat => (
                            <Chip key={cat} label={cat} active={selCats.has(cat)} pill color={CAT_COLOR[cat]} onClick={() => handleCatToggle(cat)} />
                        ))}
                    </div>

                    {/* Options */}
                    <SectionTitle>Options</SectionTitle>
                    <div style={{ padding: '6px 12px 8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--font-body)', color: onlyFavs ? 'var(--accent-amber)' : 'var(--text-dim-1)' }}>
                            <input type="checkbox" checked={onlyFavs} onChange={() => setOnlyFavs(v => !v)}
                                style={{ accentColor: 'var(--accent-amber)', margin: 0 }} />
                            Favorites only ★
                        </label>
                    </div>

                    {/* Saved Views */}
                    <SectionTitle>Saved Views</SectionTitle>
                    <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {allViews.map(v => (
                            <button key={v.name} onClick={() => applyView(v)} style={{
                                textAlign: 'left', padding: '5px 8px',
                                background: 'none', border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)', color: 'var(--text-dim-1)',
                                fontSize: 'var(--font-body)', cursor: 'pointer',
                                transition: 'background 0.10s, border-color 0.10s',
                            }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                                {v.name}
                            </button>
                        ))}
                    </div>

                    {/* Info footer */}
                    <div style={{ marginTop: 'auto', padding: '10px 12px', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '9px', color: 'var(--text-dim-3)', lineHeight: 1.6 }}>
                            Indicators are indicative benchmarks and proxy assessments.<br />
                            Not live traded data. Demo only.
                        </div>
                    </div>
                </div>

                {/* ═══ Col B — Screener Table ══════════════════════════════ */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Toolbar */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '3px 10px', borderBottom: '1px solid var(--border-panel)',
                        flexShrink: 0, backgroundColor: 'var(--surface-0)', gap: '8px',
                    }}>
                        <span style={{ fontSize: 'var(--font-label)', color: 'var(--text-dim-2)', fontVariantNumeric: 'tabular-nums' }}>
                            {visRows.length} / {allRows.length} indicators
                        </span>
                        <span style={{ fontSize: '9px', color: 'var(--text-dim-3)', flex: 1 }}>
                            {selCats.size > 0 ? [...selCats].join(', ') : 'All categories'}
                            {onlyFavs ? ' · Favorites' : ''}
                        </span>
                        {/* Columns popover */}
                        <div style={{ position: 'relative' }} ref={colMenuRef}>
                            <button onClick={() => setShowColMenu(m => !m)} style={{
                                padding: '2px 10px', fontSize: 'var(--font-label)', fontWeight: 600,
                                background: 'none', border: '1px solid var(--border-subtle)',
                                color: 'var(--text-dim-2)', borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer', height: 'var(--chip-h)',
                            }}>Columns ▾</button>
                            {showColMenu && (
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                                    backgroundColor: 'var(--surface-2)',
                                    backdropFilter: 'var(--blur-popover)', WebkitBackdropFilter: 'var(--blur-popover)',
                                    border: '1px solid var(--border-mid)',
                                    borderRadius: 'var(--radius-md)', padding: '8px 12px',
                                    zIndex: 200, minWidth: '160px', boxShadow: 'var(--shadow-popover)',
                                }}>
                                    {ALL_COLS.filter(c => c !== 'fav').map(col => (
                                        <label key={col} style={{
                                            display: 'flex', gap: '8px', cursor: 'pointer',
                                            padding: '3px 0', fontSize: 'var(--font-body)',
                                            color: colVis.has(col as ColId) ? 'var(--text-primary)' : 'var(--text-dim-2)',
                                        }}>
                                            <input type="checkbox" checked={colVis.has(col as ColId)}
                                                onChange={() => handleColVis(col as ColId)}
                                                style={{ accentColor: 'var(--accent-blue)', margin: 0 }} />
                                            {COL_LABELS[col as ColId]}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
                        <table style={{
                            width: '100%', borderCollapse: 'collapse',
                            fontSize: 'var(--font-body)', fontVariantNumeric: 'tabular-nums', tableLayout: 'fixed',
                        }}>
                            <colgroup>
                                <col style={{ width: '28px' }} /> {/* fav */}
                                <col style={{ width: '160px' }} /> {/* name */}
                                {colVis.has('value') && <col style={{ width: '80px' }} />}
                                {colVis.has('unit') && <col style={{ width: '68px' }} />}
                                {colVis.has('d1abs') && <col style={{ width: '70px' }} />}
                                {colVis.has('d1pct') && <col style={{ width: '64px' }} />}
                                {colVis.has('d7abs') && <col style={{ width: '70px' }} />}
                                {colVis.has('d7pct') && <col style={{ width: '64px' }} />}
                                {colVis.has('d30pct') && <col style={{ width: '64px' }} />}
                                {colVis.has('spark') && <col style={{ width: '60px' }} />}
                                {colVis.has('updated') && <col style={{ width: '80px' }} />}
                                {colVis.has('category') && <col style={{ width: '80px' }} />}
                                {colVis.has('source') && <col style={{ width: '100px' }} />}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th style={TH_nosort()}>★</th>
                                    <th style={TH('name')} onClick={() => handleSort('name')}>Name{chevron('name')}</th>
                                    {colVis.has('value') && <th style={{ ...TH('value', 'right'), cursor: 'pointer' }} onClick={() => handleSort('value')}>Value{chevron('value')}</th>}
                                    {colVis.has('unit') && <th style={TH_nosort()}>Unit</th>}
                                    {colVis.has('d1abs') && <th style={{ ...TH('d1abs', 'right'), cursor: 'pointer' }}>1D Δ</th>}
                                    {colVis.has('d1pct') && <th style={{ ...TH('d1pct', 'right'), cursor: 'pointer' }} onClick={() => handleSort('d1pct')}>1D %{chevron('d1pct')}</th>}
                                    {colVis.has('d7abs') && <th style={{ ...TH('d7abs', 'right') }}>7D Δ</th>}
                                    {colVis.has('d7pct') && <th style={{ ...TH('d7pct', 'right'), cursor: 'pointer' }} onClick={() => handleSort('d7pct')}>7D %{chevron('d7pct')}</th>}
                                    {colVis.has('d30pct') && <th style={{ ...TH('d30pct', 'right'), cursor: 'pointer' }} onClick={() => handleSort('d30pct')}>30D %{chevron('d30pct')}</th>}
                                    {colVis.has('spark') && <th style={TH_nosort()}>Trend</th>}
                                    {colVis.has('updated') && <th style={TH_nosort()}>Updated</th>}
                                    {colVis.has('category') && <th style={TH('category')} onClick={() => handleSort('category')}>Cat{chevron('category')}</th>}
                                    {colVis.has('source') && <th style={TH_nosort()}>Source</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {visRows.map(row => {
                                    const isSelected = selId === row.meta.id;
                                    const rowStyle: React.CSSProperties = {
                                        cursor: 'pointer',
                                        backgroundColor: isSelected ? 'var(--surface-3)' : 'transparent',
                                        boxShadow: isSelected ? 'inset 2px 0 0 var(--accent-blue)' : 'none',
                                        transition: 'background 0.08s',
                                    };
                                    return (
                                        <tr key={row.meta.id} style={rowStyle}
                                            onClick={() => handleSelect(row.meta.id)}
                                            onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)'; }}
                                            onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                                        >
                                            {/* ★ */}
                                            <td style={{ ...TD, textAlign: 'center', padding: '3px 4px' }}>
                                                <button onClick={e => handleFav(row.meta.id, e)} style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    color: row.isFav ? 'var(--accent-amber)' : 'var(--text-dim-3)',
                                                    fontSize: '13px', lineHeight: 1, padding: '2px',
                                                    transition: 'color 0.12s',
                                                }}>★</button>
                                            </td>
                                            {/* Name */}
                                            <td style={{ ...TD, fontWeight: isSelected ? 700 : 500, color: 'var(--text-primary)' }}>
                                                <span title={row.meta.name}>{row.meta.name}</span>
                                            </td>
                                            {/* Value */}
                                            {colVis.has('value') && <td style={{ ...TD, textAlign: 'right', fontWeight: 600 }}>
                                                {row.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                            </td>}
                                            {/* Unit */}
                                            {colVis.has('unit') && <td style={{ ...TD, color: 'var(--text-dim-2)', fontSize: '9px' }}>{row.unit}</td>}
                                            {/* 1D abs */}
                                            {colVis.has('d1abs') && <td style={{ ...TD, textAlign: 'right', color: deltaColor(row.d1abs) }}>
                                                {deltaSign(row.d1abs)}{row.d1abs.toFixed(1)}
                                            </td>}
                                            {/* 1D % */}
                                            {colVis.has('d1pct') && <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: deltaColor(row.d1pct) }}>
                                                {deltaSign(row.d1pct)}{row.d1pct.toFixed(1)}%
                                            </td>}
                                            {/* 7D abs */}
                                            {colVis.has('d7abs') && <td style={{ ...TD, textAlign: 'right', color: deltaColor(row.d7abs) }}>
                                                {deltaSign(row.d7abs)}{row.d7abs.toFixed(1)}
                                            </td>}
                                            {/* 7D % */}
                                            {colVis.has('d7pct') && <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: deltaColor(row.d7pct) }}>
                                                {deltaSign(row.d7pct)}{row.d7pct.toFixed(1)}%
                                            </td>}
                                            {/* 30D % */}
                                            {colVis.has('d30pct') && <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: deltaColor(row.d30pct) }}>
                                                {deltaSign(row.d30pct)}{row.d30pct.toFixed(1)}%
                                            </td>}
                                            {/* Sparkline */}
                                            {colVis.has('spark') && <td style={{ ...TD, padding: '2px 8px' }}>
                                                <Sparkline series={row.series1M} />
                                            </td>}
                                            {/* Updated */}
                                            {colVis.has('updated') && <td style={{ ...TD, color: 'var(--text-dim-2)', fontSize: '9px' }}>
                                                {compactDate(row.updatedAt)}
                                            </td>}
                                            {/* Category */}
                                            {colVis.has('category') && <td style={{ ...TD }}>
                                                <span style={{
                                                    padding: '1px 6px', borderRadius: 'var(--radius-pill)',
                                                    fontSize: '9px', fontWeight: 700,
                                                    backgroundColor: CAT_COLOR[row.meta.category] + '18',
                                                    color: CAT_COLOR[row.meta.category],
                                                }}>
                                                    {row.meta.category}
                                                </span>
                                            </td>}
                                            {/* Source */}
                                            {colVis.has('source') && <td style={{ ...TD, color: 'var(--text-dim-2)', fontSize: '9px' }}>
                                                {row.meta.source}
                                            </td>}
                                        </tr>
                                    );
                                })}
                                {visRows.length === 0 && (
                                    <tr><td colSpan={15} style={{ ...TD, textAlign: 'center', color: 'var(--text-dim-3)', padding: '32px' }}>
                                        No indicators match your filters.
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ═══ Col C — Intelligence Panel ══════════════════════════ */}
                <div style={{
                    width: '340px', minWidth: '300px', flexShrink: 0,
                    backgroundColor: 'var(--surface-1)',
                    backgroundImage: 'var(--card-gradient)',
                    borderLeft: '1px solid var(--border-panel)',
                    display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden',
                }}>
                    {!selRow ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', textAlign: 'center' }}>
                            <div style={{ fontSize: '28px', marginBottom: '12px', opacity: 0.3 }}>≈</div>
                            <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-dim-3)', lineHeight: 1.6 }}>
                                Select an indicator from the screener to view details, chart, and context.
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div style={{
                                padding: '12px 14px 10px',
                                borderBottom: '1px solid var(--border-subtle)',
                                background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
                                flexShrink: 0,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                            {selRow.meta.shortName}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-dim-2)', marginTop: '2px' }}>{selRow.meta.name}</div>
                                    </div>
                                    <span style={{
                                        padding: '1px 7px', borderRadius: 'var(--radius-pill)',
                                        fontSize: '9px', fontWeight: 700,
                                        backgroundColor: CAT_COLOR[selRow.meta.category] + '18',
                                        color: CAT_COLOR[selRow.meta.category],
                                        marginTop: '2px', flexShrink: 0,
                                    }}>
                                        {selRow.meta.category}
                                    </span>
                                </div>
                                {/* Big value */}
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
                                    <span style={{ fontSize: '24px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>
                                        {selRow.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-dim-2)' }}>{selRow.unit}</span>
                                    {/* Volatility badge */}
                                    <span style={{
                                        padding: '1px 7px', borderRadius: 'var(--radius-pill)',
                                        fontSize: '9px', fontWeight: 700, marginLeft: 'auto',
                                        backgroundColor: VOL_COLOR[selRow.vol] + '18',
                                        color: VOL_COLOR[selRow.vol],
                                        boxShadow: VOL_GLOW[selRow.vol],
                                        textTransform: 'uppercase',
                                    }}>
                                        {selRow.vol} vol
                                    </span>
                                </div>
                                {/* Delta chips */}
                                <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                                    {([['1D', selRow.d1pct], ['7D', selRow.d7pct], ['30D', selRow.d30pct]] as [string, number][]).map(([label, pct]) => (
                                        <span key={label} style={{
                                            padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                                            fontSize: 'var(--font-label)', fontWeight: 700,
                                            backgroundColor: deltaColor(pct) + '18',
                                            color: deltaColor(pct),
                                            border: `1px solid ${deltaColor(pct)}30`,
                                        }}>
                                            {label}: {deltaSign(pct)}{pct.toFixed(1)}%
                                        </span>
                                    ))}
                                </div>
                                <div style={{ fontSize: '9px', color: 'var(--text-dim-3)', marginTop: '6px' }}>
                                    Updated {compactDate(selRow.updatedAt)} · {selRow.meta.source}
                                </div>
                            </div>

                            {/* What Changed */}
                            <SectionTitle>What Changed</SectionTitle>
                            <div style={{ padding: '6px 14px 10px' }}>
                                {selChanged.map(item => (
                                    <div key={item.id} style={{ display: 'flex', gap: '7px', marginBottom: '6px', alignItems: 'flex-start' }}>
                                        <span style={{ color: item.delta === 'positive' ? 'var(--accent-emerald)' : item.delta === 'negative' ? 'var(--accent-rose)' : 'var(--text-dim-2)', fontSize: '10px', flexShrink: 0, marginTop: '1px' }}>
                                            {item.delta === 'positive' ? '▲' : item.delta === 'negative' ? '▼' : '●'}
                                        </span>
                                        <span style={{ fontSize: 'var(--font-body)', color: 'var(--text-dim-1)', lineHeight: 1.45 }}>{item.message}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Mini Chart */}
                            <SectionTitle right={
                                <div style={{ display: 'flex', gap: '3px' }}>
                                    {(['1M', '3M', '1Y'] as const).map(r => (
                                        <Chip key={r} label={r} active={chartRange === r} onClick={() => setChartRange(r)} style={{ height: '18px', fontSize: '9px', padding: '0 6px' }} />
                                    ))}
                                </div>
                            }>Chart</SectionTitle>
                            <div style={{ padding: '8px 14px 12px' }}>
                                <MiniChart series={selSeries} range={chartRange} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '9px', color: 'var(--text-dim-3)' }}>
                                    <span>{selSeries[0]?.date ?? ''}</span>
                                    <span>{selSeries[selSeries.length - 1]?.date ?? ''}</span>
                                </div>
                            </div>

                            {/* Context */}
                            {selNarrative && (<>
                                <SectionTitle>Context</SectionTitle>
                                <div style={{ padding: '8px 14px 10px' }}>
                                    <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-dim-1)', lineHeight: 1.55, marginBottom: '8px' }}>
                                        {selNarrative.methodology}
                                    </div>
                                    <div style={{ fontSize: 'var(--font-label)', fontWeight: 700, letterSpacing: 'var(--lsp-caps)', color: 'var(--text-dim-2)', marginBottom: '5px', textTransform: 'uppercase' }}>
                                        Why it matters
                                    </div>
                                    {selNarrative.whyItMatters.map((pt, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '7px', marginBottom: '4px' }}>
                                            <span style={{ color: 'var(--accent-blue)', fontSize: '10px', flexShrink: 0, marginTop: '1px' }}>◆</span>
                                            <span style={{ fontSize: 'var(--font-body)', color: 'var(--text-dim-1)', lineHeight: 1.45 }}>{pt}</span>
                                        </div>
                                    ))}
                                    <div style={{ marginTop: '8px', padding: '5px 8px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                                        <div style={{ fontSize: '9px', color: 'var(--text-dim-3)', lineHeight: 1.5 }}>
                                            ⓘ {selNarrative.disclaimer}
                                        </div>
                                    </div>
                                </div>
                            </>)}

                            {/* Actions */}
                            <SectionTitle>Actions</SectionTitle>
                            <div style={{ padding: '8px 14px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {/* Fav */}
                                <button onClick={() => handleFav(selRow.meta.id)} style={{
                                    padding: '6px 12px', fontSize: 'var(--font-body)', fontWeight: 600,
                                    background: selRow.isFav ? 'var(--accent-amber-dim)' : 'none',
                                    border: `1px solid ${selRow.isFav ? 'var(--accent-amber)80' : 'var(--border-mid)'}`,
                                    borderRadius: 'var(--radius-sm)', color: selRow.isFav ? 'var(--accent-amber)' : 'var(--text-dim-1)',
                                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                                    boxShadow: selRow.isFav ? 'var(--glow-amber-sm)' : 'none',
                                }}>
                                    {selRow.isFav ? '★ Unfavorite' : '☆ Add to Favorites'}
                                </button>
                                {/* Add alert */}
                                <button onClick={() => setShowRuleModal(true)} style={{
                                    padding: '6px 12px', fontSize: 'var(--font-body)', fontWeight: 600,
                                    background: 'none', border: '1px solid var(--border-mid)',
                                    borderRadius: 'var(--radius-sm)', color: 'var(--text-dim-1)',
                                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
                                }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                >
                                    ⚑ Add Alert Rule
                                </button>
                                {/* Market Intelligence link */}
                                {selRow.meta.fuelMatch && (
                                    <button onClick={() => navigate(`/market?fuel=${selRow.meta.fuelMatch}&ccy=${currency}&basis=${basis}`)} style={{
                                        padding: '6px 12px', fontSize: 'var(--font-body)', fontWeight: 600,
                                        background: 'var(--accent-blue-dim)', border: '1px solid var(--border-active)',
                                        borderRadius: 'var(--radius-sm)', color: 'var(--accent-blue)',
                                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                                        boxShadow: 'var(--glow-blue-sm)',
                                    }}>
                                        ◈ Open Market Intelligence
                                    </button>
                                )}
                                {/* Port Terminal link */}
                                {selRow.meta.locodeMap && (
                                    <button onClick={() => navigate(`/port/${selRow.meta.locodeMap}?fuel=${fuel}&ccy=${currency}&basis=${basis}`)} style={{
                                        padding: '6px 12px', fontSize: 'var(--font-body)', fontWeight: 600,
                                        background: 'none', border: '1px solid var(--border-mid)',
                                        borderRadius: 'var(--radius-sm)', color: 'var(--text-dim-1)',
                                        cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
                                    }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    >
                                        ◎ Open Port Terminal ({selRow.meta.locodeMap})
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Add Alert Rule Modal ── */}
            {showRuleModal && selRow && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'var(--blur-light)',
                }} onClick={() => setShowRuleModal(false)}>
                    <div style={{
                        backgroundColor: 'var(--surface-2)', border: '1px solid var(--border-mid)',
                        borderRadius: 'var(--radius-lg)', padding: '20px 24px',
                        minWidth: '320px', boxShadow: 'var(--shadow-popover)',
                        boxSizing: 'border-box',
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '4px' }}>Add Alert Rule</div>
                        <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-dim-2)', marginBottom: '14px' }}>
                            {selRow.meta.name}
                        </div>
                        {/* Rule type */}
                        <label style={{ display: 'block', fontSize: 'var(--font-label)', letterSpacing: 'var(--lsp-caps)', color: 'var(--text-dim-2)', marginBottom: '4px', textTransform: 'uppercase' }}>
                            Rule Type
                        </label>
                        <select value={ruleType} onChange={e => setRuleType(e.target.value as IAS.AlertRuleType)} style={{
                            width: '100%', height: 'var(--input-h)', padding: '0 8px',
                            marginBottom: '10px', background: 'var(--surface-0)',
                            border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-primary)', fontSize: 'var(--font-body)', fontFamily: 'inherit',
                        }}>
                            <option value="pct_move">% Move over window</option>
                            <option value="crosses_above">Crosses above value</option>
                            <option value="crosses_below">Crosses below value</option>
                            <option value="volatility_high">Volatility HIGH</option>
                        </select>
                        {/* Threshold */}
                        {ruleType !== 'volatility_high' && (<>
                            <label style={{ display: 'block', fontSize: 'var(--font-label)', letterSpacing: 'var(--lsp-caps)', color: 'var(--text-dim-2)', marginBottom: '4px', textTransform: 'uppercase' }}>
                                {ruleType === 'pct_move' ? 'Threshold (%)' : 'Value'}
                            </label>
                            <input type="number" value={ruleThreshold} onChange={e => setRuleThreshold(e.target.value)} style={{
                                width: '100%', height: 'var(--input-h)', padding: '0 8px',
                                marginBottom: '10px', background: 'var(--surface-0)', boxSizing: 'border-box',
                                border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-primary)', fontSize: 'var(--font-body)', fontFamily: 'inherit',
                            }} />
                        </>)}
                        {/* Window (for pct_move) */}
                        {ruleType === 'pct_move' && (<>
                            <label style={{ display: 'block', fontSize: 'var(--font-label)', letterSpacing: 'var(--lsp-caps)', color: 'var(--text-dim-2)', marginBottom: '4px', textTransform: 'uppercase' }}>
                                Window
                            </label>
                            <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
                                {(['1d', '7d', '30d'] as IAS.AlertWindow[]).map(w => (
                                    <Chip key={w} label={w} active={ruleWindow === w} onClick={() => setRuleWindow(w)} />
                                ))}
                            </div>
                        </>)}
                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button onClick={() => setShowRuleModal(false)} style={{
                                padding: '6px 14px', background: 'none', border: '1px solid var(--border-mid)',
                                borderRadius: 'var(--radius-sm)', color: 'var(--text-dim-1)', cursor: 'pointer',
                                fontSize: 'var(--font-body)',
                            }}>Cancel</button>
                            <button onClick={handleAddRule} style={{
                                padding: '6px 14px', background: 'var(--accent-blue-dim)',
                                border: '1px solid var(--border-active)', borderRadius: 'var(--radius-sm)',
                                color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 700,
                                fontSize: 'var(--font-body)', boxShadow: 'var(--glow-blue-sm)',
                            }}>Create Rule</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IndicatorsPage;
