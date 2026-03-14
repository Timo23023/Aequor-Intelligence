/**
 * ui/pages/AlertsPage.tsx — Phase 9: Watchlist-driven monitoring page
 * 3 sections: Watchlist ports · Recent Changes · Demo Alert Rules
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FuelProduct, Currency, PriceBasis, Availability } from '../../domain/bunker/types';
import { listBunkerNodes, getBunkerProfile } from '../../services/BunkerService';
import { computeDisplayPrice } from '../../services/BunkerPricingService';
import { getChangeFeed, ChangeItem } from '../../services/MarketIntelService';
import { parseGlobalParams, applyGlobalParams, needsCanonical } from '../../services/AppStateService';
import * as WL from '../../services/WatchlistService';
import * as IAS from '../../services/IndicatorAlertsService';
import CommandRail from '../components/bunker/CommandRail';
import Chip from '../components/primitives/Chip';

const MAPTILER_KEY = ((import.meta.env.VITE_MAPTILER_API_KEY as string) || '').trim();
const USE_MAPTILER = MAPTILER_KEY.length > 0;

// ── Alert rule definitions ─────────────────────────────────────────────────
interface AlertRule { id: string; label: string; desc: string; enabled: boolean; }

const RULE_DEFAULTS: AlertRule[] = [
    { id: 'price_jump', label: 'Price Jump ≥ $25', desc: 'Fires when the seeded avg price is ≥ $925 (proxy for Δ+25 in demo data)', enabled: true },
    { id: 'avail_downgrade', label: 'Availability: not Available', desc: 'Fires when port availability ≠ available for selected fuel', enabled: true },
    { id: 'conf_drop', label: 'Confidence < 50', desc: 'Fires when port confidence score drops below 50', enabled: false },
    { id: 'ci_downgrade', label: 'CI Grade not A/B', desc: 'Fires when port CI grade is C, D, or unknown for selected fuel', enabled: false },
];

const RULES_KEY = 'aequor_alert_rules_v1';

function loadRules(): AlertRule[] {
    try {
        const saved = JSON.parse(localStorage.getItem(RULES_KEY) || '[]') as { id: string; enabled: boolean }[];
        return RULE_DEFAULTS.map(r => {
            const s = saved.find(x => x.id === r.id);
            return s ? { ...r, enabled: s.enabled } : r;
        });
    } catch { return RULE_DEFAULTS; }
}
function saveRules(rules: AlertRule[]) {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules.map(r => ({ id: r.id, enabled: r.enabled }))));
}

// ── Helpers ────────────────────────────────────────────────────────────────
const compactDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso.slice(0, 16); }
};
const AVAIL_COLOR: Record<Availability, string> = {
    available: '#10b981', limited: '#f59e0b', planned: '#3b82f6', unknown: '#6b7280',
};
const DELTA_COLOR = (d: ChangeItem['delta']) => d === 'positive' ? '#10b981' : d === 'negative' ? '#ef4444' : 'rgba(255,255,255,0.4)';
const TH: React.CSSProperties = { padding: '5px 12px', fontSize: 'var(--font-label)', fontWeight: 700, letterSpacing: 'var(--lsp-caps)', color: 'var(--text-dim-2)', boxShadow: '0 1px 0 var(--border-subtle)', textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', top: 0, backgroundColor: 'rgba(8,11,20,0.98)', zIndex: 2 };
const TD: React.CSSProperties = { padding: '4px 12px', height: 'var(--row-h)', fontSize: 'var(--font-body)', borderBottom: '1px solid var(--border-subtle)', verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums' };

const SectionHdr: React.FC<{ title: string; count?: number }> = ({ title, count }) => (
    <div className="section-title" style={{ padding: '7px var(--sp-4)' }}>
        <span>{title}</span>
        {count !== undefined && <span style={{ fontSize: '9px', backgroundColor: 'var(--text-dim-4)', color: 'var(--text-dim-2)', padding: '1px 6px', borderRadius: 'var(--radius-pill)', marginLeft: 'var(--sp-2)' }}>{count}</span>}
    </div>
);

// ── Section 4: Indicator Alert Rules (Phase 12) ───────────────────────────
const IND_TH: React.CSSProperties = {
    padding: '5px 12px', fontSize: 'var(--font-label)', fontWeight: 700,
    letterSpacing: 'var(--lsp-caps)', color: 'var(--text-dim-2)',
    boxShadow: '0 1px 0 var(--border-subtle)', textAlign: 'left',
    whiteSpace: 'nowrap', position: 'sticky', top: 0,
    backgroundColor: 'rgba(8,11,20,0.98)', zIndex: 2,
};
const IND_TD: React.CSSProperties = {
    padding: '4px 12px', height: 'var(--row-h)',
    fontSize: 'var(--font-body)', borderBottom: '1px solid var(--border-subtle)',
    verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums',
};

const RULE_TYPE_LABEL: Record<string, string> = {
    pct_move: '% Move', crosses_above: 'Crosses ↑', crosses_below: 'Crosses ↓', volatility_high: 'Vol HIGH',
};

const IndicatorAlertsSection: React.FC = () => {
    const [rules, setRules] = React.useState<import('../../services/IndicatorAlertsService').IndicatorAlertRule[]>(
        () => IAS.getRules()
    );
    // refresh on storage changes from Indicators terminal
    React.useEffect(() => {
        const h = () => setRules(IAS.getRules());
        window.addEventListener('storage', h);
        return () => window.removeEventListener('storage', h);
    }, []);

    const handleToggle = (id: string) => { IAS.toggleRule(id); setRules(IAS.getRules()); };
    const handleRemove = (id: string) => { IAS.removeRule(id); setRules(IAS.getRules()); };

    return (
        <>
            <SectionHdr title="INDICATOR ALERTS" count={rules.filter(r => r.enabled).length} />
            {rules.length === 0 ? (
                <div style={{ padding: '20px var(--sp-4)', fontSize: 'var(--font-body)', color: 'var(--text-dim-3)' }}>
                    No indicator alert rules configured.{' '}
                    <a href="/indicators" style={{ color: 'var(--accent-blue)' }}>Open Indicators terminal</a> to add rules.
                </div>
            ) : (
                <div style={{ overflowX: 'auto', marginBottom: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={IND_TH}>Indicator</th>
                                <th style={IND_TH}>Rule Type</th>
                                <th style={{ ...IND_TH, textAlign: 'right' }}>Threshold</th>
                                <th style={IND_TH}>Window</th>
                                <th style={IND_TH}>Status</th>
                                <th style={IND_TH}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map(rule => (
                                <tr key={rule.id}
                                    style={{ backgroundColor: !rule.enabled ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                                    <td style={{ ...IND_TD, fontWeight: 600 }}>{rule.indicatorName}</td>
                                    <td style={{ ...IND_TD, color: 'var(--text-dim-1)' }}>
                                        <span style={{
                                            padding: '1px 7px', borderRadius: 'var(--radius-pill)',
                                            fontSize: '9px', fontWeight: 700,
                                            backgroundColor: 'var(--surface-2)',
                                            color: 'var(--text-dim-1)',
                                        }}>{RULE_TYPE_LABEL[rule.type] ?? rule.type}</span>
                                    </td>
                                    <td style={{ ...IND_TD, textAlign: 'right', color: 'var(--text-primary)', fontWeight: 700 }}>
                                        {rule.type !== 'volatility_high' ? rule.threshold.toFixed(rule.type === 'pct_move' ? 1 : 0) : '—'}
                                        {rule.type === 'pct_move' ? '%' : ''}
                                    </td>
                                    <td style={{ ...IND_TD, color: 'var(--text-dim-2)', fontSize: '10px' }}>
                                        {rule.window ?? '—'}
                                    </td>
                                    <td style={IND_TD}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={rule.enabled} onChange={() => handleToggle(rule.id)}
                                                style={{ accentColor: 'var(--accent-blue)', margin: 0 }} />
                                            <span style={{
                                                fontSize: '9px', fontWeight: 700,
                                                color: rule.enabled ? 'var(--accent-emerald)' : 'var(--text-dim-3)',
                                                padding: '1px 6px', borderRadius: '3px',
                                                backgroundColor: rule.enabled ? 'var(--accent-emerald-dim)' : 'transparent',
                                            }}>{rule.enabled ? 'ACTIVE' : 'OFF'}</span>
                                        </label>
                                    </td>
                                    <td style={IND_TD}>
                                        <button onClick={() => handleRemove(rule.id)} style={{
                                            fontSize: 'var(--font-label)', padding: '2px 7px',
                                            background: 'none', border: '1px solid var(--border-subtle)',
                                            color: 'var(--text-dim-2)', borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                        }}>✕ Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
};

// ── Page ─────────────────────────────────────────────────────────────────
const AlertsPage: React.FC = () => {

    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { fuel, currency, basis } = parseGlobalParams(searchParams);

    const setFuel = (f: FuelProduct) => setSearchParams(sp => applyGlobalParams(sp, { fuel: f, currency, basis }), { replace: true });
    const setCurrency = (c: Currency) => setSearchParams(sp => applyGlobalParams(sp, { fuel, currency: c, basis }), { replace: true });
    const setBasis = (b: PriceBasis) => setSearchParams(sp => applyGlobalParams(sp, { fuel, currency, basis: b }), { replace: true });

    // Watchlist state (synced via WL.subscribe)
    const [watchlist, setWatchlist] = useState<string[]>(() => WL.getWatchlist());

    // Alert rules (+ localStorage persistence)
    const [rules, setRules] = useState<AlertRule[]>(loadRules);
    const searchRef = React.useRef<HTMLInputElement>(null);

    const nodes = useMemo(() => listBunkerNodes(), []);

    useEffect(() => {
        if (needsCanonical(searchParams)) {
            setSearchParams(sp => applyGlobalParams(sp, { fuel, currency, basis }), { replace: true });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => WL.subscribe(() => setWatchlist(WL.getWatchlist())), []);

    const toggleRule = useCallback((id: string) => {
        setRules(prev => {
            const next = prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
            saveRules(next);
            return next;
        });
    }, []);

    // ── Build watchlist port data ──────────────────────────────────────
    const watchlistRows = useMemo(() => {
        const results = watchlist.map(locode => {
            const profile = getBunkerProfile(locode);
            const node = nodes.find(n => n.locode === locode);
            if (!profile || !node) return null;
            const dp = computeDisplayPrice(profile, fuel, currency, basis);
            const avail = node.availability[fuel] as Availability;
            const ci = (node.ciGrade[fuel] ?? '—') as string;
            const changes = getChangeFeed(locode).slice(0, 3);
            const fired: string[] = [];
            if (rules.find(r => r.id === 'price_jump' && r.enabled) && dp && dp.avg >= 925) fired.push('price_jump');
            if (rules.find(r => r.id === 'avail_downgrade' && r.enabled) && avail !== 'available') fired.push('avail_downgrade');
            if (rules.find(r => r.id === 'conf_drop' && r.enabled) && node.confidenceScore < 50) fired.push('conf_drop');
            if (rules.find(r => r.id === 'ci_downgrade' && r.enabled) && !['A', 'B'].includes(ci) && ci !== '—') fired.push('ci_downgrade');
            return { locode, portName: node.portName, region: node.region, avail, ci, dp, score: node.confidenceScore, changes, fired };
        });
        return results.filter((r): r is NonNullable<typeof r> => r !== null);
    }, [watchlist, fuel, currency, basis, rules, nodes]);

    const alertCount = watchlistRows.reduce((s, r) => s + r.fired.length, 0);

    // ── Hotkeys ────────────────────────────────────────────────────────
    useEffect(() => {
        const FUELS: Record<string, FuelProduct> = { '1': 'e_methanol', '2': 'e_ammonia', '3': 'vlsfo', '4': 'mgo' };
        const handler = (ev: KeyboardEvent) => {
            const tag = (ev.target as HTMLElement).tagName;
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
            if (FUELS[ev.key]) setFuel(FUELS[ev.key]);
            if (ev.key.toLowerCase() === 'u') setCurrency('USD');
            if (ev.key.toLowerCase() === 'e') setCurrency('EUR');
            if (ev.key.toLowerCase() === 'p') setBasis('posted');
            if (ev.key.toLowerCase() === 'd') setBasis('dap');
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [fuel, currency, basis]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
            <CommandRail
                selectedFuel={fuel} selectedCurrency={currency} selectedBasis={basis}
                filterAvail={false} filterHighConf={false} filterEFuels={false}
                compareMode={false} useMaptiler={USE_MAPTILER}
                filteredCount={nodes.length} totalCount={nodes.length}
                guidedDemoOpen={false} nodes={nodes}
                searchRef={searchRef as React.RefObject<HTMLInputElement>}
                onFuelChange={setFuel} onCurrencyChange={setCurrency} onBasisChange={setBasis}
                onFilterAvail={() => { }} onFilterHighConf={() => { }} onFilterEFuels={() => { }}
                onCompareToggle={() => { }} onGuidedDemo={() => { }}
                onSearchSelect={n => navigate(`/port/${n.locode}?fuel=${fuel}&ccy=${currency}&basis=${basis}`)}
                onCopyShareLink={() => navigator.clipboard.writeText(window.location.href)}
            />

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* Hero */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                    <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Alerts & Watchlist</h1>
                    {alertCount > 0 && <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: '8px' }}>{alertCount} alert{alertCount > 1 ? 's' : ''}</span>}
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto', fontStyle: 'italic' }}>DEMO MODE · seeded data · no execution</span>
                </div>

                {/* ── SECTION 1: Watchlist Table ── */}
                <SectionHdr title="WATCHLIST" count={watchlistRows.length} />
                {watchlistRows.length === 0 ? (
                    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>☆</div>
                        No ports in watchlist. Use "Add to Watchlist" in the Intel Panel or Port Terminal.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={TH}>Port</th>
                                    <th style={TH}>Availability</th>
                                    <th style={TH}>Confidence</th>
                                    <th style={TH}>CI</th>
                                    <th style={{ ...TH, textAlign: 'right' }}>Avg Price ({currency})</th>
                                    <th style={{ ...TH, textAlign: 'right' }}>Range</th>
                                    <th style={TH}>Alerts</th>
                                    <th style={TH}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {watchlistRows.map(row => {
                                    const avCol = AVAIL_COLOR[row.avail];
                                    return (
                                        <tr key={row.locode} onClick={() => navigate(`/port/${row.locode}?fuel=${fuel}&ccy=${currency}&basis=${basis}`)} style={{ cursor: 'pointer' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
                                            <td style={TD}>
                                                <div style={{ fontWeight: 700, fontSize: '11px' }}>{row.portName}</div>
                                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{row.locode}</div>
                                            </td>
                                            <td style={TD}><span style={{ padding: '2px 7px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, backgroundColor: avCol + '18', color: avCol }}>{row.avail}</span></td>
                                            <td style={{ ...TD, fontFamily: 'monospace', color: row.score >= 75 ? '#10b981' : '#f59e0b' }}>{row.score}</td>
                                            <td style={{ ...TD, color: '#c084fc', fontWeight: 700 }}>{row.ci}</td>
                                            <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{row.dp ? row.dp.avg.toFixed(0) : '—'}</td>
                                            <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>{row.dp ? `${row.dp.low.toFixed(0)} – ${row.dp.high.toFixed(0)}` : '—'}</td>
                                            <td style={TD}>
                                                {row.fired.length > 0
                                                    ? row.fired.map(fid => <span key={fid} style={{
                                                        marginRight: '4px', padding: '1px 7px',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: 'var(--font-label)', fontWeight: 700,
                                                        backgroundColor: 'var(--accent-rose-dim)',
                                                        color: 'var(--accent-rose)',
                                                        boxShadow: 'var(--glow-rose-sm)',
                                                    }}>{rules.find(r => r.id === fid)?.label}</span>)
                                                    : <span style={{ fontSize: 'var(--font-label)', color: 'var(--text-dim-3)' }}>—</span>}
                                            </td>
                                            <td style={TD}>
                                                <button onClick={e => { e.stopPropagation(); WL.removeFromWatchlist(row.locode); }} style={{ fontSize: 'var(--font-label)', padding: '2px 7px', background: 'none', border: '1px solid var(--border-subtle)', color: 'var(--text-dim-2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>✕ Remove</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── SECTION 2: Recent Changes ── */}
                {watchlistRows.length > 0 && (
                    <>
                        <SectionHdr title="RECENT CHANGES (last 3 per port)" count={watchlistRows.reduce((s, r) => s + r.changes.length, 0)} />
                        <div style={{ padding: '10px 20px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {watchlistRows.map(row => (
                                <div key={row.locode}>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>{row.portName} <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.2)' }}>{row.locode}</span></div>
                                    {row.changes.length === 0
                                        ? <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', paddingLeft: '12px' }}>No changes logged.</div>
                                        : row.changes.map(c => (
                                            <div key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', paddingLeft: '12px', marginBottom: '4px' }}>
                                                <span style={{ color: DELTA_COLOR(c.delta), fontSize: '11px', flexShrink: 0 }}>{c.delta === 'positive' ? '▲' : c.delta === 'negative' ? '▼' : '●'}</span>
                                                <div>
                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{c.message}</div>
                                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>{compactDate(c.timestamp)}</div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* ── SECTION 3: Alert Rules ── */}
                <SectionHdr title="ALERT RULES" count={rules.filter(r => r.enabled).length} />
                <div style={{ padding: '10px 20px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rules.map(rule => (
                        <div key={rule.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 14px', borderRadius: '6px', backgroundColor: rule.enabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)', border: `1px solid ${rule.enabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}` }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flexShrink: 0, marginTop: '1px' }}>
                                <input type="checkbox" checked={rule.enabled} onChange={() => toggleRule(rule.id)} style={{ accentColor: '#10b981', width: '14px', height: '14px', cursor: 'pointer' }} />
                            </label>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: rule.enabled ? 'var(--text-primary)' : 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>{rule.label}</div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{rule.desc}</div>
                            </div>
                            {rule.enabled && (
                                <div style={{ flexShrink: 0 }}>
                                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#10b981', padding: '2px 7px', borderRadius: '3px', backgroundColor: 'rgba(16,185,129,0.12)' }}>ACTIVE</span>
                                </div>
                            )}
                        </div>
                    ))}
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '4px', fontStyle: 'italic' }}>Rules are evaluated against current fuel/ccy/basis context. Demo data — thresholds are indicative.</div>
                </div>

                {/* ── SECTION 4: Indicator Alert Rules ── */}
                <IndicatorAlertsSection />

                <div style={{ height: '60px' }} />
            </div>
        </div>
    );
};

export default AlertsPage;
