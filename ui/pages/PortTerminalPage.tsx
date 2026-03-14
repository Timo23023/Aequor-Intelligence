/**
 * ui/pages/PortTerminalPage.tsx
 * Full-page port dossier at /port/:locode.
 * 7 sections: Summary · Prices · Suppliers · Marketplace · Intel Feed · Compliance · Quick Actions
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FuelProduct, Currency, PriceBasis } from '../../domain/bunker/types';
import { listBunkerNodes } from '../../services/BunkerService';
import { buildPortTerminalModel, getComplianceItems, ComplianceItem } from '../../services/PortTerminalService';
import { IntelType, Priority } from '../../services/MarketIntelService';
import { parseGlobalParams, applyGlobalParams, needsCanonical } from '../../services/AppStateService';
import * as WL from '../../services/WatchlistService';
import CommandRail from '../components/bunker/CommandRail';
import PortSection from '../components/port/PortSection';
import PortSummaryStrip from '../components/port/PortSummaryStrip';
import PricesTab from '../components/bunker/PricesTab';
import SuppliersTab from '../components/bunker/SuppliersTab';
import MarketplaceTab from '../components/bunker/MarketplaceTab';
import TradingTicket, { TicketDraft } from '../components/bunker/TradingTicket';

const MAPTILER_KEY = ((import.meta.env.VITE_MAPTILER_API_KEY as string) || '').trim();
const USE_MAPTILER = MAPTILER_KEY.length > 0;

const INTEL_TYPES: IntelType[] = ['Supply', 'Demand', 'Regulation', 'Disruption', 'Project', 'Port Update', 'Price Proxy'];
const PRIORITIES: Priority[] = ['P1', 'P2', 'P3'];
const TYPE_COLOR: Record<IntelType, string> = {
    Supply: '#10b981', Demand: '#3b82f6', Regulation: '#f59e0b',
    Disruption: '#ef4444', Project: '#c084fc', 'Port Update': '#06b6d4', 'Price Proxy': '#fb923c',
};
const PRI_COLOR: Record<Priority, string> = { P1: '#ef4444', P2: '#f59e0b', P3: '#6b7280' };
const STATUS_COLOR: Record<ComplianceItem['status'], string> = { met: '#10b981', pending: '#f59e0b', na: '#6b7280' };
const STATUS_LABEL: Record<ComplianceItem['status'], string> = { met: '✓ Met', pending: '⧖ Pending', na: '— N/A' };
const compactDate = (iso: string) => { try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso.slice(0, 16); } };

const Chip: React.FC<{ label: string; active: boolean; color: string; toggle: () => void }> = ({ label, active, color, toggle }) => (
    <button onClick={toggle} style={{ padding: '2px 8px', fontSize: '9px', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.1)'}`, backgroundColor: active ? color + '15' : 'transparent', color: active ? color : 'rgba(255,255,255,0.3)' }}>
        {label}
    </button>
);

const PortTerminalPage: React.FC = () => {
    const { locode = '' } = useParams<{ locode: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // URL-driven global params
    const { fuel, currency, basis } = parseGlobalParams(searchParams);
    const setFuel = (f: FuelProduct) => setSearchParams(sp => applyGlobalParams(sp, { fuel: f, currency, basis }), { replace: true });
    const setCurrency = (c: Currency) => setSearchParams(sp => applyGlobalParams(sp, { fuel, currency: c, basis }), { replace: true });
    const setBasis = (b: PriceBasis) => setSearchParams(sp => applyGlobalParams(sp, { fuel, currency, basis: b }), { replace: true });

    // Intel filters
    const [intelTypes, setIntelTypes] = useState<Set<IntelType>>(new Set(INTEL_TYPES));
    const [intelPrios, setIntelPrios] = useState<Set<Priority>>(new Set(PRIORITIES));

    // Ticket
    const [ticketDraft, setTicketDraft] = useState<TicketDraft | null>(null);

    // Share feedback
    const [copied, setCopied] = useState(false);

    // Watchlist — synced via WatchlistService.subscribe
    const [inWatchlist, setInWatchlist] = useState(() => WL.isWatched(locode));

    // All nodes for CommandRail search
    const nodes = useMemo(() => listBunkerNodes(), []);
    const searchRef = useRef<HTMLInputElement>(null);

    // Build model
    const model = useMemo(() => buildPortTerminalModel(locode, { fuel, currency, basis }), [locode, fuel, currency, basis]);
    const compliance = useMemo(() => getComplianceItems(locode), [locode]);

    // Intel feed filtered
    const intelFeed = useMemo(() =>
        (model?.intelFeed ?? []).filter(it => intelTypes.has(it.type) && intelPrios.has(it.priority)),
        [model, intelTypes, intelPrios]);

    const toggleType = (t: IntelType) => setIntelTypes(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });
    const togglePrio = (p: Priority) => setIntelPrios(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });

    const handleShare = useCallback(() => {
        const url = `${window.location.origin}/port/${locode}?fuel=${fuel}&ccy=${currency}&basis=${basis}`;
        navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }, [locode, fuel, currency, basis]);

    const handlePrint = useCallback(() => {
        if (model) document.title = `Aequor — ${model.profile.node.portName} (${locode})`;
        window.print();
    }, [model, locode]);

    // Ensure canonical URL params on mount
    useEffect(() => {
        if (needsCanonical(searchParams)) {
            setSearchParams(sp => applyGlobalParams(sp, { fuel, currency, basis }), { replace: true });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Watchlist sync from WatchlistService
    useEffect(() => {
        setInWatchlist(WL.isWatched(locode));
        return WL.subscribe(() => setInWatchlist(WL.isWatched(locode)));
    }, [locode]);

    const handleWatchlist = useCallback(() => {
        WL.toggleWatchlist(locode);
        // State auto-updates via subscribe above
    }, [locode]);

    const handleOpenTicket = useCallback(() => {
        if (!model) return;
        const today = new Date();
        const fmt8 = (d: Date) => d.toISOString().slice(0, 10);
        const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
        setTicketDraft({
            side: 'bid',
            price: model.displayPrice ? (model.displayPrice.avg * 0.98).toFixed(1) : '',
            volumeMt: '2000', currency, basis,
            deliveryFrom: fmt8(addDays(today, 7)), deliveryTo: fmt8(addDays(today, 14)),
            portLocode: locode, portName: model.profile.node.portName,
            fuel, prefillSource: 'calculated',
        });
    }, [model, locode, fuel, currency, basis]);

    // Hotkeys
    useEffect(() => {
        const FUELS: Record<string, FuelProduct> = { '1': 'e_methanol', '2': 'e_ammonia', '3': 'vlsfo', '4': 'mgo' };
        const handler = (ev: KeyboardEvent) => {
            const tag = (ev.target as HTMLElement).tagName;
            if (ev.key === '/' && tag !== 'INPUT') { ev.preventDefault(); searchRef.current?.focus(); return; }
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
            if (FUELS[ev.key]) { setFuel(FUELS[ev.key]); return; }
            if (ev.key.toLowerCase() === 'u') { setCurrency('USD'); return; }
            if (ev.key.toLowerCase() === 'e') { setCurrency('EUR'); return; }
            if (ev.key.toLowerCase() === 'p') { setBasis('posted'); return; }
            if (ev.key.toLowerCase() === 'd') { setBasis('dap'); return; }
            if (ev.key === 'Escape') { setTicketDraft(null); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    if (!model) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
                <div style={{ height: '52px', backgroundColor: 'rgba(8,11,20,0.98)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 20px', fontSize: '12px', color: '#ef4444' }}>
                    Port not found: {locode}
                    <button onClick={() => navigate('/market')} style={{ marginLeft: '16px', fontSize: '11px', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>← Market Intelligence</button>
                </div>
            </div>
        );
    }

    const { profile, displayPrice, deliveryWindow, lastUpdated, changeFeed } = model;
    const node = profile.node;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
            {/* CommandRail */}
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

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* Port name hero */}
                <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{node.portName}</h1>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{locode}</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>· {node.region.replace(/_/g, ' ')}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button onClick={() => navigate(-1)} style={{ padding: '4px 10px', fontSize: '10px', fontWeight: 600, background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', borderRadius: '4px', cursor: 'pointer' }}>← Back</button>
                        <button onClick={() => navigate(`/compare?a=${locode}`)} style={{ padding: '4px 10px', fontSize: '10px', fontWeight: 600, background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', borderRadius: '4px', cursor: 'pointer' }}>⊡ Compare</button>
                    </div>
                </div>

                {/* S1: Summary */}
                <PortSection id="summary" title="SUMMARY">
                    <PortSummaryStrip profile={profile} fuel={fuel} currency={currency} displayPrice={displayPrice} deliveryWindow={deliveryWindow} lastUpdated={lastUpdated} />
                    {/* What Changed */}
                    <div style={{ padding: '10px 20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {changeFeed.map(c => (
                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <span style={{ color: c.delta === 'positive' ? '#10b981' : c.delta === 'negative' ? '#ef4444' : 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{c.delta === 'positive' ? '▲' : c.delta === 'negative' ? '▼' : '●'}</span>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)' }}>{c.message}</span>
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>{compactDate(c.timestamp)}</span>
                            </div>
                        ))}
                    </div>
                </PortSection>

                {/* Quick Actions — top placement for quick access */}
                <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.015)' }}>
                    <button onClick={handleOpenTicket} style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '5px', cursor: 'pointer', fontFamily: 'inherit' }}>⟳ Trading Ticket</button>
                    <button onClick={() => navigate(`/chart/${locode}_${fuel.toUpperCase()}`)} style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700, backgroundColor: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '5px', cursor: 'pointer', fontFamily: 'inherit' }}>◈ Chart View</button>
                    <button onClick={handleWatchlist} style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700, backgroundColor: inWatchlist ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)', color: inWatchlist ? '#f59e0b' : 'rgba(255,255,255,0.45)', border: `1px solid ${inWatchlist ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '5px', cursor: 'pointer', fontFamily: 'inherit' }}>{inWatchlist ? '★ In Watchlist' : '☆ Watchlist'}</button>
                    <button onClick={handleShare} style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700, backgroundColor: copied ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', color: copied ? '#10b981' : 'rgba(255,255,255,0.45)', border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '5px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>{copied ? '✓ Copied' : '🔗 Share'}</button>
                    <button onClick={() => navigate(`/compare?a=${locode}`)} style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', cursor: 'pointer', fontFamily: 'inherit' }}>⊡ Compare</button>
                    <div style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(255,255,255,0.18)', fontStyle: 'italic', flexShrink: 0 }}>DEMO</div>
                </div>

                {/* S2: Prices */}
                <PortSection id="prices" title="PRICES — ALL FUELS">
                    <PricesTab profile={profile} fuel={fuel} currency={currency} basis={basis} />
                </PortSection>

                {/* S3: Suppliers */}
                <PortSection id="suppliers" title={`SUPPLIERS (${profile.suppliers.length})`}>
                    <SuppliersTab profile={profile} />
                </PortSection>

                {/* S4: Marketplace */}
                <PortSection id="marketplace" title="MARKETPLACE · ORDER BOOK">
                    <MarketplaceTab
                        profile={profile} fuel={fuel} currency={currency} basis={basis}
                        displayPrice={displayPrice} onOpenTicket={setTicketDraft}
                    />
                </PortSection>

                {/* S5: Intel Feed */}
                <PortSection id="intel" title="PORT INTEL FEED">
                    <div style={{ padding: '10px 20px 6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {INTEL_TYPES.map(t => <Chip key={t} label={t} active={intelTypes.has(t)} color={TYPE_COLOR[t]} toggle={() => toggleType(t)} />)}
                        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                        {PRIORITIES.map(p => <Chip key={p} label={p} active={intelPrios.has(p)} color={PRI_COLOR[p]} toggle={() => togglePrio(p)} />)}
                    </div>
                    <div style={{ padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {intelFeed.length === 0 && <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', padding: '8px 0' }}>No items match current filters.</div>}
                        {intelFeed.map(item => (
                            <div key={item.id} style={{ padding: '10px 12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px', borderLeft: `2px solid ${TYPE_COLOR[item.type]}40` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '9px', fontWeight: 700, color: TYPE_COLOR[item.type], letterSpacing: '0.06em' }}>{item.type}</span>
                                        <span style={{ fontSize: '9px', fontWeight: 700, color: PRI_COLOR[item.priority] }}>{item.priority}</span>
                                    </div>
                                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>{compactDate(item.timestamp)}</span>
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>{item.title}</div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginBottom: '4px' }}>{item.summary}</div>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>{item.source} · {item.tags.map(t => `#${t}`).join(' ')}</div>
                            </div>
                        ))}
                    </div>
                </PortSection>

                {/* S6: Compliance */}
                <PortSection id="compliance" title="CONSTRAINTS · READINESS · COMPLIANCE">
                    <div style={{ padding: '10px 20px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {compliance.map(c => (
                            <div key={c.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.025)', borderRadius: '5px', borderLeft: `2px solid ${STATUS_COLOR[c.status]}40` }}>
                                <div style={{ minWidth: '90px', flexShrink: 0 }}>
                                    <span style={{ fontSize: '9px', fontWeight: 700, color: STATUS_COLOR[c.status], letterSpacing: '0.05em' }}>{STATUS_LABEL[c.status]}</span>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{c.label}</div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{c.detail}</div>
                                </div>
                                <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', padding: '1px 5px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '3px' }}>{c.category}</span>
                                </div>
                            </div>
                        ))}
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '4px', fontStyle: 'italic' }}>Demo data only · not regulatory advice</div>
                    </div>
                </PortSection>

                {/* Bottom padding */}
                <div style={{ height: '60px' }} />
            </div>

            {/* Trading Ticket */}
            {ticketDraft && <TradingTicket draft={ticketDraft} onClose={() => setTicketDraft(null)} />}
        </div>
    );
};

export default PortTerminalPage;
