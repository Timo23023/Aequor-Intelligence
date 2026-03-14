/**
 * ui/components/market/IntelPanel.tsx
 * Right-column intelligence detail panel for a selected port.
 * 4 sections: Summary strip, What Changed, Intel Feed, Quick Actions.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BunkerProfile, FuelProduct, Currency, PriceBasis, Availability } from '../../../domain/bunker/types';
import { DisplayPrice } from '../../../services/BunkerPricingService';
import { ChangeItem, IntelItem, IntelType, Priority, getChangeFeed, getIntelFeed, getDeliveryWindow } from '../../../services/MarketIntelService';
import * as WL from '../../../services/WatchlistService';

interface Props {
    profile: BunkerProfile | null;
    fuel: FuelProduct;
    currency: Currency;
    basis: PriceBasis;
    displayPrice: DisplayPrice | null;
    onOpenDrawer: () => void;
    onOpenTicket: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmt = (n: number, decimals = 0) =>
    n > 0 ? n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '—';

const compactDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso.slice(0, 16).replace('T', ' '); }
};

const AVAIL_COLOR: Record<Availability, string> = {
    available: '#10b981', limited: '#f59e0b', planned: '#3b82f6', unknown: '#6b7280',
};

const DELTA_STYLE = (d: ChangeItem['delta']): React.CSSProperties => ({
    color: d === 'positive' ? '#10b981' : d === 'negative' ? '#ef4444' : 'rgba(255,255,255,0.4)',
    fontSize: '11px',
});

const PRIORITY_COLOR: Record<Priority, string> = { P1: '#ef4444', P2: '#f59e0b', P3: '#6b7280' };
const TYPE_COLOR: Record<IntelType, string> = {
    Supply: '#10b981', Demand: '#3b82f6', Regulation: '#f59e0b',
    Disruption: '#ef4444', Project: '#c084fc', 'Port Update': '#06b6d4', 'Price Proxy': '#fb923c',
};

const INTEL_TYPES: IntelType[] = ['Supply', 'Demand', 'Regulation', 'Disruption', 'Project', 'Port Update', 'Price Proxy'];
const PRIORITIES: Priority[] = ['P1', 'P2', 'P3'];

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {children}
    </div>
);

const Chip: React.FC<{ label: string; active: boolean; color: string; toggle: () => void }> = ({ label, active, color, toggle }) => (
    <button onClick={toggle} style={{ padding: '1px 6px', fontSize: '9px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.1)'}`, backgroundColor: active ? color + '15' : 'transparent', color: active ? color : 'rgba(255,255,255,0.3)', transition: 'all 0.1s' }}>
        {label}
    </button>
);

// ---------------------------------------------------------------------------
// IntelPanel
// ---------------------------------------------------------------------------
const IntelPanel: React.FC<Props> = ({ profile, fuel, currency, basis, displayPrice, onOpenDrawer, onOpenTicket }) => {
    const navigate = useNavigate();
    const [intelTypeFilter, setIntelTypeFilter] = useState<Set<IntelType>>(new Set(INTEL_TYPES));
    const [intelPrioFilter, setIntelPrioFilter] = useState<Set<Priority>>(new Set(PRIORITIES));

    // Watchlist state — synced via WatchlistService.subscribe
    const [inWatchlist, setInWatchlist] = useState(() =>
        profile ? WL.isWatched(profile.node.locode) : false
    );

    // Re-read watchlist when profile changes or WatchlistService notifies
    useEffect(() => {
        setInWatchlist(profile ? WL.isWatched(profile.node.locode) : false);
    }, [profile]);

    useEffect(() => {
        return WL.subscribe(() => {
            setInWatchlist(profile ? WL.isWatched(profile.node.locode) : false);
        });
    }, [profile]);

    const toggleType = (t: IntelType) => setIntelTypeFilter(prev => {
        const next = new Set(prev);
        next.has(t) ? next.delete(t) : next.add(t);
        return next;
    });
    const togglePrio = (p: Priority) => setIntelPrioFilter(prev => {
        const next = new Set(prev);
        next.has(p) ? next.delete(p) : next.add(p);
        return next;
    });

    const handleToggleWatchlist = useCallback(() => {
        if (!profile) return;
        WL.toggleWatchlist(profile.node.locode);
        // State update will fire via the subscribe effect above
    }, [profile]);

    if (!profile) {
        return (
            <div style={{ width: '320px', minWidth: '320px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '13px', padding: '32px' }}>
                    <div style={{ fontSize: '28px', marginBottom: '12px' }}>◎</div>
                    Select a port to view intelligence
                </div>
            </div>
        );
    }

    const node = profile.node;
    const avail = node.availability[fuel];
    const avColor = AVAIL_COLOR[avail];
    const ci = (node.ciGrade[fuel] ?? '—') as string;
    const delivWindow = getDeliveryWindow(profile);
    const changeFeed: ChangeItem[] = getChangeFeed(node.locode);
    const intelFeed: IntelItem[] = getIntelFeed(node.locode)
        .filter(it => intelTypeFilter.has(it.type) && intelPrioFilter.has(it.priority));

    return (
        <div style={{ width: '320px', minWidth: '320px', height: '100%', overflowY: 'auto', backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column' }}>
            {/* ── Port header ── */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '1px' }}>{node.portName}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{node.locode} · {node.region.replace(/_/g, ' ')}</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
                {/* ── S1: Summary strip ── */}
                <div style={{ marginBottom: '16px' }}>
                    <SectionTitle>SUMMARY</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '7px 9px' }}>
                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>AVAILABILITY</div>
                            <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: avColor + '18', color: avColor }}>{avail}</span>
                        </div>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '7px 9px' }}>
                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>CONFIDENCE</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: node.confidenceScore >= 75 ? '#10b981' : node.confidenceScore >= 45 ? '#f59e0b' : '#ef4444' }}>
                                {node.confidenceScore} <span style={{ fontSize: '9px', fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>{node.confidenceLabel}</span>
                            </div>
                            <div style={{ marginTop: '3px', height: '3px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                                <div style={{ width: `${node.confidenceScore}%`, height: '100%', borderRadius: '2px', backgroundColor: node.confidenceScore >= 75 ? '#10b981' : '#f59e0b' }} />
                            </div>
                        </div>
                        {displayPrice && (
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '7px 9px' }}>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>AVG PRICE ({currency})</div>
                                <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{fmt(displayPrice.avg)}</div>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>{fmt(displayPrice.low)} – {fmt(displayPrice.high)}</div>
                            </div>
                        )}
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '7px 9px' }}>
                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>CI GRADE</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: ci !== '—' ? '#c084fc' : 'rgba(255,255,255,0.2)' }}>{ci}</div>
                        </div>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '7px 9px' }}>
                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>SUPPLIERS</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace' }}>{profile.suppliers.length}</div>
                        </div>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '7px 9px' }}>
                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>DELIVERY</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace' }}>{delivWindow}</div>
                        </div>
                    </div>
                </div>

                {/* ── S2: What changed ── */}
                <div style={{ marginBottom: '16px' }}>
                    <SectionTitle>WHAT CHANGED</SectionTitle>
                    {changeFeed.map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <span style={{ ...DELTA_STYLE(c.delta), marginTop: '1px', flexShrink: 0 }}>
                                {c.delta === 'positive' ? '▲' : c.delta === 'negative' ? '▼' : '●'}
                            </span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>{c.message}</div>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '1px' }}>{compactDate(c.timestamp)}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── S3: Intel feed ── */}
                <div style={{ marginBottom: '16px' }}>
                    <SectionTitle>INTEL FEED</SectionTitle>
                    {/* Type filters */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '6px' }}>
                        {INTEL_TYPES.map(t => <Chip key={t} label={t} active={intelTypeFilter.has(t)} color={TYPE_COLOR[t]} toggle={() => toggleType(t)} />)}
                    </div>
                    {/* Priority filters */}
                    <div style={{ display: 'flex', gap: '3px', marginBottom: '10px' }}>
                        {PRIORITIES.map(p => <Chip key={p} label={p} active={intelPrioFilter.has(p)} color={PRIORITY_COLOR[p]} toggle={() => togglePrio(p)} />)}
                    </div>
                    {intelFeed.length === 0 && <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', padding: '8px 0' }}>No items match current filters.</div>}
                    {intelFeed.map(item => (
                        <div key={item.id} style={{ marginBottom: '10px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px', borderLeft: `2px solid ${TYPE_COLOR[item.type]}40` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                <span style={{ fontSize: '9px', fontWeight: 700, color: TYPE_COLOR[item.type], letterSpacing: '0.06em' }}>{item.type}</span>
                                <span style={{ fontSize: '9px', fontWeight: 700, color: PRIORITY_COLOR[item.priority] }}>{item.priority}</span>
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px', lineHeight: 1.3 }}>{item.title}</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, marginBottom: '4px' }}>{item.summary}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>{item.source}</span>
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>{compactDate(item.timestamp)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── S4: Quick actions ── */}
                <div>
                    <SectionTitle>QUICK ACTIONS</SectionTitle>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button onClick={onOpenDrawer} style={{ padding: '7px 12px', fontSize: '11px', fontWeight: 600, textAlign: 'left', backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '5px', cursor: 'pointer' }}>
                            ◎ Open Port Profile
                        </button>
                        <button onClick={() => navigate(`/port/${node.locode}?fuel=${fuel}&ccy=${currency}&basis=${basis}`)} style={{ padding: '7px 12px', fontSize: '11px', fontWeight: 600, textAlign: 'left', backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', cursor: 'pointer' }}>
                            ↗ Open Full Port Terminal
                        </button>
                        <button onClick={onOpenTicket} style={{ padding: '7px 12px', fontSize: '11px', fontWeight: 600, textAlign: 'left', backgroundColor: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '5px', cursor: 'pointer' }}>
                            ⟳ Open Trading Ticket
                        </button>
                        <button onClick={handleToggleWatchlist} style={{ padding: '7px 12px', fontSize: '11px', fontWeight: 600, textAlign: 'left', backgroundColor: inWatchlist ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)', color: inWatchlist ? '#f59e0b' : 'rgba(255,255,255,0.45)', border: `1px solid ${inWatchlist ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '5px', cursor: 'pointer' }}>
                            {inWatchlist ? '★ Remove from Watchlist' : '☆ Add to Watchlist'}
                        </button>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '9px', color: 'rgba(255,255,255,0.15)', textAlign: 'center' }}>DEMO MODE · seeded data · no execution</div>
                </div>
            </div>
        </div>
    );
};

export default IntelPanel;
