/**
 * ui/pages/CompareTerminalPage.tsx
 * Side-by-side compare at /compare?a=LOCODE&b=LOCODE.
 * Delta summary + two synchronized port dossier columns.
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FuelProduct, Currency, PriceBasis, BunkerNode } from '../../domain/bunker/types';
import { listBunkerNodes } from '../../services/BunkerService';
import { buildPortTerminalModel } from '../../services/PortTerminalService';
import { parseGlobalParams, applyGlobalParams, needsCanonical } from '../../services/AppStateService';
import CommandRail from '../components/bunker/CommandRail';
import DeltaSummary from '../components/port/DeltaSummary';
import PortSummaryStrip from '../components/port/PortSummaryStrip';
import PricesTab from '../components/bunker/PricesTab';
import SuppliersTab from '../components/bunker/SuppliersTab';
import MarketplaceTab from '../components/bunker/MarketplaceTab';
import PortSearchBar from '../components/bunker/PortSearchBar';
import TradingTicket, { TicketDraft } from '../components/bunker/TradingTicket';

const MAPTILER_KEY = ((import.meta.env.VITE_MAPTILER_API_KEY as string) || '').trim();
const USE_MAPTILER = MAPTILER_KEY.length > 0;

const SecHdr: React.FC<{ title: string }> = ({ title }) => (
    <div style={{ padding: '8px 14px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(8,11,20,0.95)', position: 'sticky', top: 0, zIndex: 5 }}>
        {title}
    </div>
);

interface ColumnProps {
    label: 'A' | 'B';
    color: string;
    locode: string;
    fuel: FuelProduct;
    currency: Currency;
    basis: PriceBasis;
    scrollRef: React.RefObject<HTMLDivElement>;
    onScroll: () => void;
    onOpenTicket: (draft: TicketDraft) => void;
    onOpenFull: () => void;
}

const Column: React.FC<ColumnProps> = ({ label, color, locode, fuel, currency, basis, scrollRef, onScroll, onOpenTicket, onOpenFull }) => {
    const model = useMemo(() => buildPortTerminalModel(locode, { fuel, currency, basis }), [locode, fuel, currency, basis]);

    if (!model) return (
        <div style={{ flex: 1, padding: '20px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Port not found: {locode}</div>
    );

    const { profile, displayPrice, deliveryWindow, lastUpdated } = model;
    const node = profile.node;

    return (
        <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', borderLeft: label === 'B' ? '1px solid rgba(255,255,255,0.08)' : 'none', display: 'flex', flexDirection: 'column' }}>
            {/* Column header */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: color + '08', flexShrink: 0 }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color, letterSpacing: '0.1em' }}>PORT {label}</span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{node.portName}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{locode}</span>
                <button onClick={onOpenFull} style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: '10px', fontWeight: 600, backgroundColor: color + '15', color, border: `1px solid ${color}30`, borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>
                    Open Full →
                </button>
            </div>

            {/* Summary */}
            <SecHdr title="SUMMARY" />
            <PortSummaryStrip profile={profile} fuel={fuel} currency={currency} displayPrice={displayPrice} deliveryWindow={deliveryWindow} lastUpdated={lastUpdated} compact />

            {/* Prices */}
            <SecHdr title="PRICES" />
            <PricesTab profile={profile} fuel={fuel} currency={currency} basis={basis} />

            {/* Suppliers */}
            <SecHdr title={`SUPPLIERS (${profile.suppliers.length})`} />
            <SuppliersTab profile={profile} />

            {/* Marketplace */}
            <SecHdr title="ORDER BOOK" />
            <MarketplaceTab profile={profile} fuel={fuel} currency={currency} basis={basis} displayPrice={displayPrice} onOpenTicket={onOpenTicket} />

            <div style={{ height: '60px', flexShrink: 0 }} />
        </div>
    );
};

// ── Port Picker (empty slot) ──────────────────────────────────────────────
const PortPicker: React.FC<{ label: 'A' | 'B'; color: string; nodes: BunkerNode[]; onSelect: (l: string) => void }> = ({ label, color, nodes, onSelect }) => {
    const pickerRef = useRef<HTMLInputElement>(null);
    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', borderLeft: label === 'B' ? '1px solid rgba(255,255,255,0.08)' : 'none', padding: '40px 20px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color, letterSpacing: '0.1em' }}>SELECT PORT {label}</div>
            <div style={{ width: '300px' }}>
                <PortSearchBar nodes={nodes} onSelect={n => onSelect(n.locode)} inputRef={pickerRef as unknown as React.RefObject<HTMLInputElement>} />
            </div>
        </div>
    );
};


// ── Main Component ─────────────────────────────────────────────────────────
const CompareTerminalPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // URL-driven global params (canonical state)
    const { fuel, currency, basis } = parseGlobalParams(searchParams);
    const setFuel = (f: FuelProduct) => setSearchParams(sp => applyGlobalParams(sp, { fuel: f, currency, basis }), { replace: true });
    const setCurrency = (c: Currency) => setSearchParams(sp => applyGlobalParams(sp, { fuel, currency: c, basis }), { replace: true });
    const setBasis = (b: PriceBasis) => setSearchParams(sp => applyGlobalParams(sp, { fuel, currency, basis: b }), { replace: true });

    const [syncScroll, setSyncScroll] = useState(true);
    const [ticketDraft, setTicketDraft] = useState<TicketDraft | null>(null);

    const locodeA = searchParams.get('a') ?? '';
    const locodeB = searchParams.get('b') ?? '';

    const nodes = useMemo(() => listBunkerNodes(), []);
    const searchRef = useRef<HTMLInputElement>(null);
    const colARef = useRef<HTMLDivElement>(null);
    const colBRef = useRef<HTMLDivElement>(null);
    const scrollingRef = useRef<'A' | 'B' | null>(null);

    // Build models only when both locodes are present (for delta)
    const modelA = useMemo(() => locodeA ? buildPortTerminalModel(locodeA, { fuel, currency, basis }) : null, [locodeA, fuel, currency, basis]);
    const modelB = useMemo(() => locodeB ? buildPortTerminalModel(locodeB, { fuel, currency, basis }) : null, [locodeB, fuel, currency, basis]);

    // Ensure canonical params on mount
    useEffect(() => {
        if (needsCanonical(searchParams)) {
            setSearchParams(sp => applyGlobalParams(sp, { fuel, currency, basis }), { replace: true });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // URL helpers
    const setLocode = (slot: 'a' | 'b', locode: string) => {
        const p = new URLSearchParams(searchParams);
        p.set(slot, locode);
        setSearchParams(p, { replace: true });
    };

    const handleSwap = useCallback(() => {
        const p = new URLSearchParams(searchParams);
        const a = p.get('a') ?? ''; const b = p.get('b') ?? '';
        p.set('a', b); p.set('b', a);
        setSearchParams(p, { replace: true });
    }, [searchParams, setSearchParams]);

    // Sync scroll
    const handleScrollA = useCallback(() => {
        if (!syncScroll || scrollingRef.current === 'B') return;
        scrollingRef.current = 'A';
        const a = colARef.current; const b = colBRef.current;
        if (a && b) { const ratio = a.scrollTop / (a.scrollHeight - a.clientHeight || 1); b.scrollTop = ratio * (b.scrollHeight - b.clientHeight); }
        setTimeout(() => { scrollingRef.current = null; }, 50);
    }, [syncScroll]);

    const handleScrollB = useCallback(() => {
        if (!syncScroll || scrollingRef.current === 'A') return;
        scrollingRef.current = 'B';
        const a = colARef.current; const b = colBRef.current;
        if (a && b) { const ratio = b.scrollTop / (b.scrollHeight - b.clientHeight || 1); a.scrollTop = ratio * (a.scrollHeight - a.clientHeight); }
        setTimeout(() => { scrollingRef.current = null; }, 50);
    }, [syncScroll]);

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
            if (ev.key === 'Escape') setTicketDraft(null);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
            {/* CommandRail */}
            <CommandRail
                selectedFuel={fuel} selectedCurrency={currency} selectedBasis={basis}
                filterAvail={false} filterHighConf={false} filterEFuels={false}
                compareMode={true} useMaptiler={USE_MAPTILER}
                filteredCount={nodes.length} totalCount={nodes.length}
                guidedDemoOpen={false} nodes={nodes}
                searchRef={searchRef as React.RefObject<HTMLInputElement>}
                onFuelChange={setFuel} onCurrencyChange={setCurrency} onBasisChange={setBasis}
                onFilterAvail={() => { }} onFilterHighConf={() => { }} onFilterEFuels={() => { }}
                onCompareToggle={() => navigate('/efuels')} onGuidedDemo={() => { }}
                onSearchSelect={n => setLocode(locodeA ? 'b' : 'a', n.locode)}
                onCopyShareLink={() => navigator.clipboard.writeText(window.location.href)}
            />

            {/* Sticky compare header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(8,11,20,0.98)', flexShrink: 0, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>COMPARE MODE</span>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#facc15' }}>{locodeA || '—'}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>⊕</span>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#f97316' }}>{locodeB || '—'}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <button onClick={() => setSyncScroll(s => !s)} style={{ padding: '3px 9px', fontSize: '9px', fontWeight: 600, background: 'none', border: `1px solid ${syncScroll ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`, color: syncScroll ? 'var(--accent-primary)' : 'rgba(255,255,255,0.4)', borderRadius: '4px', cursor: 'pointer' }}>⇅ Sync Scroll</button>
                    <button onClick={handleSwap} disabled={!locodeA || !locodeB} style={{ padding: '3px 9px', fontSize: '9px', fontWeight: 600, background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)', borderRadius: '4px', cursor: 'pointer', opacity: (!locodeA || !locodeB) ? 0.4 : 1 }}>⇄ Swap A/B</button>
                    <button onClick={() => navigate(-1)} style={{ padding: '3px 9px', fontSize: '9px', fontWeight: 600, background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', borderRadius: '4px', cursor: 'pointer' }}>← Back</button>
                </div>
            </div>

            {/* Delta Summary (when both locodes present) */}
            {modelA && modelB && (
                <div style={{ flexShrink: 0, overflowX: 'auto' }}>
                    <DeltaSummary modelA={modelA} modelB={modelB} fuel={fuel} />
                </div>
            )}

            {/* 2-column body */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {locodeA ? (
                    <Column label="A" color="#facc15" locode={locodeA} fuel={fuel} currency={currency} basis={basis}
                        scrollRef={colARef as React.RefObject<HTMLDivElement>} onScroll={handleScrollA}
                        onOpenTicket={setTicketDraft}
                        onOpenFull={() => navigate(`/port/${locodeA}?fuel=${fuel}&ccy=${currency}&basis=${basis}`)} />
                ) : (
                    <PortPicker label="A" color="#facc15" nodes={nodes} onSelect={l => setLocode('a', l)} />
                )}
                {locodeB ? (
                    <Column label="B" color="#f97316" locode={locodeB} fuel={fuel} currency={currency} basis={basis}
                        scrollRef={colBRef as React.RefObject<HTMLDivElement>} onScroll={handleScrollB}
                        onOpenTicket={setTicketDraft}
                        onOpenFull={() => navigate(`/port/${locodeB}?fuel=${fuel}&ccy=${currency}&basis=${basis}`)} />
                ) : (
                    <PortPicker label="B" color="#f97316" nodes={nodes} onSelect={l => setLocode('b', l)} />
                )}
            </div>

            {ticketDraft && <TradingTicket draft={ticketDraft} onClose={() => setTicketDraft(null)} />}
        </div>
    );
};

export default CompareTerminalPage;
