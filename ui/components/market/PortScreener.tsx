/**
 * ui/components/market/PortScreener.tsx
 * Sortable 10-column terminal-grade port screener table.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Availability, FuelProduct, Currency } from '../../../domain/bunker/types';
import * as WL from '../../../services/WatchlistService';

export interface ScreenerRow {
    locode: string;
    portName: string;
    region: string;
    availability: Availability;
    confidenceScore: number;
    confidenceLabel: string;
    ciGrade: string;
    avgPrice: number;
    priceLow: number;
    priceHigh: number;
    currency: Currency;
    suppliers: number;
    deliveryWindow: string;
    lastUpdated: string;
    fuel: FuelProduct;
}

type ColKey = keyof Pick<ScreenerRow,
    'portName' | 'region' | 'availability' | 'confidenceScore' | 'ciGrade' |
    'avgPrice' | 'suppliers' | 'deliveryWindow' | 'lastUpdated'
>;

interface ColDef { key: ColKey; label: string; width: string; align: 'left' | 'right' | 'center'; mono?: boolean; }

const COLS: ColDef[] = [
    { key: 'portName', label: 'Port', width: '180px', align: 'left' },
    { key: 'region', label: 'Region', width: '110px', align: 'left' },
    { key: 'availability', label: 'Avail', width: '80px', align: 'center' },
    { key: 'confidenceScore', label: 'Conf', width: '70px', align: 'right', mono: true },
    { key: 'ciGrade', label: 'CI', width: '44px', align: 'center' },
    { key: 'avgPrice', label: 'Avg Price', width: '90px', align: 'right', mono: true },
    { key: 'avgPrice', label: 'Range', width: '120px', align: 'right', mono: true },
    { key: 'suppliers', label: 'Suppliers', width: '72px', align: 'right', mono: true },
    { key: 'deliveryWindow', label: 'Delivery', width: '72px', align: 'center' },
    { key: 'lastUpdated', label: 'Updated', width: '72px', align: 'center' },
] as const;

// unique keys for render (range uses key avgPrice twice)
const COL_IDS = ['portName', 'region', 'availability', 'confidenceScore', 'ciGrade', 'avgPrice', 'range', 'suppliers', 'deliveryWindow', 'lastUpdated'];

const LS_COL_KEY = 'mkt_screener_cols';

function loadVisibleCols(): Set<string> {
    try {
        const raw = localStorage.getItem(LS_COL_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set(COL_IDS);
    } catch { return new Set(COL_IDS); }
}

const AVAIL_COLOR: Record<Availability, string> = {
    available: '#10b981',
    limited: '#f59e0b',
    planned: '#3b82f6',
    unknown: '#6b7280',
};

const FMT_DATE = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch { return iso.slice(5, 10); }
};

interface Props {
    rows: ScreenerRow[];
    selectedLocode: string | null;
    onSelect: (locode: string) => void;
    sortCol: string;
    sortDir: 'asc' | 'desc';
    onSort: (col: string) => void;
}

const PortScreener: React.FC<Props> = ({ rows, selectedLocode, onSelect, sortCol, sortDir, onSort }) => {
    const [visibleCols, setVisibleCols] = useState<Set<string>>(loadVisibleCols);
    const [showColMenu, setShowColMenu] = useState(false);
    const selectedRef = useRef<HTMLTableRowElement | null>(null);
    const [watchedSet, setWatchedSet] = useState<Set<string>>(() => new Set(WL.getWatchlist()));

    // Sync watchlist from WatchlistService
    useEffect(() => WL.subscribe(() => setWatchedSet(new Set(WL.getWatchlist()))), []);

    useEffect(() => { localStorage.setItem(LS_COL_KEY, JSON.stringify([...visibleCols])); }, [visibleCols]);

    // Scroll selected into view
    useEffect(() => {
        if (selectedRef.current) selectedRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [selectedLocode]);

    const toggleCol = (id: string) => {
        setVisibleCols(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const SortHdr: React.FC<{ id: string; col: ColDef; label?: string }> = ({ id, col, label }) => {
        const active = sortCol === id;
        return (
            <th key={id} onClick={() => onSort(id)} style={
                {
                    padding: '5px 8px',
                    textAlign: col.align,
                    width: col.width,
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    fontSize: 'var(--font-label)',
                    fontWeight: 700,
                    color: active ? 'var(--accent-primary)' : 'var(--text-dim-2)',
                    letterSpacing: 'var(--lsp-caps)',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: 'rgba(8,11,20,0.98)',
                    zIndex: 10,
                    // shadow instead of border-bottom to prevent double borders
                    boxShadow: '0 1px 0 var(--border-subtle)',
                }
            }>
                {label ?? col.label} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
        );
    };

    return (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            {/* Columns button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '3px 8px', borderBottom: '1px solid var(--border-panel)', flexShrink: 0, backgroundColor: 'var(--surface-0)', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--font-label)', color: 'var(--text-dim-2)', marginRight: 'auto', fontVariantNumeric: 'tabular-nums' }}>{rows.length} ports</span>
                <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowColMenu(m => !m)} style={{ padding: '2px 10px', fontSize: 'var(--font-label)', fontWeight: 600, background: 'none', border: '1px solid var(--border-subtle)', color: 'var(--text-dim-2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', height: 'var(--chip-h)' }}>Columns ▾</button>
                    {showColMenu && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, backgroundColor: 'var(--surface-2)', backdropFilter: 'var(--blur-popover)', WebkitBackdropFilter: 'var(--blur-popover)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-md)', padding: '8px 12px', zIndex: 200, minWidth: '150px', boxShadow: 'var(--shadow-popover)' }}>
                            {COL_IDS.map((id, i) => (
                                <label key={id} style={{ display: 'flex', gap: '6px', cursor: 'pointer', padding: '2px 0', fontSize: 'var(--font-body)', color: visibleCols.has(id) ? 'var(--text-primary)' : 'var(--text-dim-2)' }}>
                                    <input type="checkbox" checked={visibleCols.has(id)} onChange={() => toggleCol(id)} style={{ accentColor: 'var(--accent-primary)', margin: 0 }} />
                                    {COLS[i]?.label ?? id}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                    <thead>
                        <tr>
                            {/* Star column — always visible */}
                            <th style={{ width: '24px', padding: '7px 4px', position: 'sticky', top: 0, backgroundColor: 'rgba(8,11,20,0.98)', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.1)' }} />
                            {visibleCols.has('portName') && <SortHdr id="portName" col={COLS[0]} />}
                            {visibleCols.has('region') && <SortHdr id="region" col={COLS[1]} />}
                            {visibleCols.has('availability') && <SortHdr id="availability" col={COLS[2]} />}
                            {visibleCols.has('confidenceScore') && <SortHdr id="confidenceScore" col={COLS[3]} />}
                            {visibleCols.has('ciGrade') && <SortHdr id="ciGrade" col={COLS[4]} />}
                            {visibleCols.has('avgPrice') && <SortHdr id="avgPrice" col={COLS[5]} />}
                            {visibleCols.has('range') && <SortHdr id="range" col={COLS[6]} label="Range" />}
                            {visibleCols.has('suppliers') && <SortHdr id="suppliers" col={COLS[7]} />}
                            {visibleCols.has('deliveryWindow') && <SortHdr id="deliveryWindow" col={COLS[8]} />}
                            {visibleCols.has('lastUpdated') && <SortHdr id="lastUpdated" col={COLS[9]} />}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => {
                            const sel = row.locode === selectedLocode;
                            const avCol = AVAIL_COLOR[row.availability];
                            const priceStr = row.avgPrice > 0 ? row.avgPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—';
                            const rangeStr = row.avgPrice > 0 ? `${row.priceLow.toFixed(0)} – ${row.priceHigh.toFixed(0)}` : '—';
                            const rowStyle: React.CSSProperties = {
                                backgroundColor: sel ? 'var(--surface-active)' : 'transparent',
                                borderLeft: sel ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                cursor: 'pointer', transition: 'background 0.1s',
                            };
                            const TD: React.CSSProperties = { padding: '4px 8px', height: 'var(--row-h)', fontSize: 'var(--font-body)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' };
                            return (
                                <tr key={row.locode} ref={sel ? (el => { selectedRef.current = el; }) : undefined}
                                    onClick={() => onSelect(row.locode)}
                                    onKeyDown={e => { if (e.key === 'Enter') onSelect(row.locode); }}
                                    tabIndex={0} role="row" style={rowStyle}
                                    onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)'; }}
                                    onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                                    onFocus={e => { (e.currentTarget as HTMLElement).style.outline = '1px solid rgba(59,130,246,0.4)'; }}
                                    onBlur={e => { (e.currentTarget as HTMLElement).style.outline = 'none'; }}
                                >
                                    {/* Star toggle */}
                                    <td style={{ padding: '4px 4px', height: 'var(--row-h)', textAlign: 'center', fontSize: '11px', borderBottom: '1px solid var(--border-subtle)' }}
                                        onClick={e => { e.stopPropagation(); WL.toggleWatchlist(row.locode); }}>
                                        <span style={{ color: watchedSet.has(row.locode) ? '#f59e0b' : 'rgba(255,255,255,0.15)', cursor: 'pointer', transition: 'color 0.15s' }} title={watchedSet.has(row.locode) ? 'Remove from Watchlist' : 'Add to Watchlist'}>
                                            {watchedSet.has(row.locode) ? '★' : '☆'}
                                        </span>
                                    </td>
                                    {visibleCols.has('portName') && (
                                        <td style={{ ...TD, fontWeight: sel ? 700 : 500 }}>
                                            <div style={{ fontSize: '11px', color: sel ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{row.portName}</div>
                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{row.locode}</div>
                                        </td>
                                    )}
                                    {visibleCols.has('region') && <td style={{ ...TD, color: 'rgba(255,255,255,0.5)', textAlign: 'left' }}>{row.region.replace(/_/g, ' ')}</td>}
                                    {visibleCols.has('availability') && (
                                        <td style={{ ...TD, textAlign: 'center' }}>
                                            <span style={{ padding: '1px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, backgroundColor: avCol + '18', color: avCol }}>{row.availability}</span>
                                        </td>
                                    )}
                                    {visibleCols.has('confidenceScore') && (
                                        <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', color: row.confidenceScore >= 75 ? '#10b981' : row.confidenceScore >= 45 ? '#f59e0b' : '#ef4444' }}>
                                            {row.confidenceScore}
                                        </td>
                                    )}
                                    {visibleCols.has('ciGrade') && (
                                        <td style={{ ...TD, textAlign: 'center', color: row.ciGrade !== '—' ? '#c084fc' : 'rgba(255,255,255,0.2)', fontWeight: 700, fontSize: '10px' }}>
                                            {row.ciGrade}
                                        </td>
                                    )}
                                    {visibleCols.has('avgPrice') && <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', color: row.avgPrice > 0 ? 'var(--accent-primary)' : 'rgba(255,255,255,0.3)' }}>{priceStr}</td>}
                                    {visibleCols.has('range') && <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{rangeStr}</td>}
                                    {visibleCols.has('suppliers') && <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace' }}>{row.suppliers}</td>}
                                    {visibleCols.has('deliveryWindow') && <td style={{ ...TD, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>{row.deliveryWindow}</td>}
                                    {visibleCols.has('lastUpdated') && <td style={{ ...TD, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{FMT_DATE(row.lastUpdated)}</td>}
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr><td colSpan={11} style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>No ports match current filters.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PortScreener;
