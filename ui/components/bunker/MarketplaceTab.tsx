/**
 * ui/components/bunker/MarketplaceTab.tsx
 * Professional split bid/ask order book. Phase 5: readability improvements
 * (monospace numbers, compact dates, lower depth-bar opacity, Demo Mode footer).
 */
import React, { useCallback } from 'react';
import { BunkerProfile, FuelProduct, Currency, PriceBasis } from '../../../domain/bunker/types';
import { OrderBookLevel } from '../../../domain/bunker/types';
import { DisplayPrice } from '../../../services/BunkerPricingService';
import { TicketDraft } from './TradingTicket';
import { formatVolume } from './format';

interface Props {
    profile: BunkerProfile;
    fuel: FuelProduct;
    currency: Currency;
    basis: PriceBasis;
    displayPrice: DisplayPrice | null;
    onOpenTicket: (draft: TicketDraft) => void;
}

// ---------------------------------------------------------------------------
const fmt8 = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const compactDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch { return iso.slice(5, 10); }
};

const FUEL_LABEL: Record<FuelProduct, string> = {
    e_methanol: 'e-Methanol', e_ammonia: 'e-Ammonia', vlsfo: 'VLSFO', mgo: 'MGO', other: 'Other',
};

const STATUS_STYLE = (s: string): React.CSSProperties => ({
    padding: '1px 5px', borderRadius: '3px', fontSize: '9px', fontWeight: 700,
    backgroundColor: s === 'firm' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
    color: s === 'firm' ? '#10b981' : '#f59e0b',
});

// ---------------------------------------------------------------------------
function draftFromRow(row: OrderBookLevel, profile: BunkerProfile, fuel: FuelProduct): TicketDraft {
    return {
        side: row.side, price: String(row.price), volumeMt: String(row.volumeMt),
        currency: row.currency, basis: row.basis,
        deliveryFrom: row.deliveryWindow.startISO.slice(0, 10),
        deliveryTo: row.deliveryWindow.endISO.slice(0, 10),
        portLocode: profile.node.locode, portName: profile.node.portName,
        fuel, prefillSource: 'row',
    };
}

function draftFromButton(
    side: 'bid' | 'ask', profile: BunkerProfile, fuel: FuelProduct,
    currency: string, basis: string, displayPrice: DisplayPrice | null, orderBook: OrderBookLevel[],
): TicketDraft {
    const today = new Date();
    const avg = displayPrice?.avg ?? 0;
    const defaultPrice = avg > 0 ? (side === 'bid' ? (avg * 0.98).toFixed(1) : (avg * 1.02).toFixed(1)) : '';
    const sideRows = [...orderBook.filter(l => l.side === side)].sort((a, b) => a.volumeMt - b.volumeMt);
    const medVol = sideRows.length > 0 ? sideRows[Math.floor(sideRows.length / 2)].volumeMt : 2000;
    return {
        side, currency, basis, price: defaultPrice, volumeMt: String(Math.round(medVol)),
        deliveryFrom: fmt8(addDays(today, 7)), deliveryTo: fmt8(addDays(today, 14)),
        portLocode: profile.node.locode, portName: profile.node.portName,
        fuel, prefillSource: 'calculated',
    };
}

// ---------------------------------------------------------------------------
const COLS = '2.4fr 2fr 1.6fr 1.6fr 1.4fr';

interface BookTableProps {
    rows: OrderBookLevel[];
    side: 'bid' | 'ask';
    maxVol: number;
    onRowClick: (row: OrderBookLevel) => void;
    onPlace: () => void;
}

const BookTable: React.FC<BookTableProps> = ({ rows, side, maxVol, onRowClick, onPlace }) => {
    const color = side === 'bid' ? '#10b981' : '#ef4444';
    // lower opacity depth bars to not overpower text
    const depthRgba = side === 'bid' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)';

    return (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Side header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', borderBottom: `1px solid ${color}25` }}>
                <span style={{ fontWeight: 800, fontSize: '11px', color, letterSpacing: '0.07em' }}>{side.toUpperCase()}S</span>
                <button onClick={onPlace} style={{ padding: '2px 8px', fontSize: '10px', fontWeight: 700, backgroundColor: color + '12', color, border: `1px solid ${color}28`, borderRadius: '4px', cursor: 'pointer' }}>
                    Place {side === 'bid' ? 'Bid' : 'Ask'}
                </button>
            </div>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '3px 8px', fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>PRICE</span><span>VOL (mt)</span><span>BASIS</span><span>STATUS</span><span>DATE</span>
            </div>
            {/* Rows */}
            {rows.map((row, i) => {
                const pct = maxVol > 0 ? Math.round((row.volumeMt / maxVol) * 100) : 0;
                return (
                    <div key={i} tabIndex={0} role="row"
                        onClick={() => onRowClick(row)}
                        onKeyDown={e => { if (e.key === 'Enter') onRowClick(row); }}
                        style={{ display: 'grid', gridTemplateColumns: COLS, padding: '5px 8px', fontSize: '11px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.025)', outline: 'none' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = color + '0d'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                        onFocus={e => { (e.currentTarget as HTMLElement).style.outline = `1px solid ${color}40`; }}
                        onBlur={e => { (e.currentTarget as HTMLElement).style.outline = 'none'; }}
                    >
                        <span style={{ fontWeight: 700, color, fontFamily: 'monospace', fontSize: '12px' }}>
                            {row.price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                        </span>
                        <span style={{ fontFamily: 'monospace', backgroundImage: `linear-gradient(to right, ${depthRgba} ${pct}%, transparent ${pct}%)`, borderRadius: '2px', fontSize: '11px' }}>
                            {formatVolume(row.volumeMt)}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{row.basis.toUpperCase()}</span>
                        <span><span style={STATUS_STYLE(row.status)}>{row.status}</span></span>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{compactDate(row.timestamp)}</span>
                    </div>
                );
            })}
        </div>
    );
};

// ---------------------------------------------------------------------------
const MarketplaceTab: React.FC<Props> = ({ profile, fuel, currency, basis, displayPrice, onOpenTicket }) => {
    const bids = [...profile.orderBook.filter(l => l.side === 'bid')].sort((a, b) => b.price - a.price).slice(0, 10);
    const asks = [...profile.orderBook.filter(l => l.side === 'ask')].sort((a, b) => a.price - b.price).slice(0, 10);
    const maxBid = Math.max(...bids.map(r => r.volumeMt), 1);
    const maxAsk = Math.max(...asks.map(r => r.volumeMt), 1);

    const openRow = useCallback((row: OrderBookLevel) => onOpenTicket(draftFromRow(row, profile, fuel)), [onOpenTicket, profile, fuel]);
    const openBid = useCallback(() => onOpenTicket(draftFromButton('bid', profile, fuel, currency, basis, displayPrice, profile.orderBook)), [onOpenTicket, profile, fuel, currency, basis, displayPrice]);
    const openAsk = useCallback(() => onOpenTicket(draftFromButton('ask', profile, fuel, currency, basis, displayPrice, profile.orderBook)), [onOpenTicket, profile, fuel, currency, basis, displayPrice]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Order book rows */}
            <div style={{ display: 'flex', gap: '1px', flex: 1, overflow: 'hidden', padding: '4px 4px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <BookTable rows={bids} side="bid" maxVol={maxBid} onRowClick={openRow} onPlace={openBid} />
                <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.06)', flexShrink: 0, margin: '0 2px' }} />
                <BookTable rows={asks} side="ask" maxVol={maxAsk} onRowClick={openRow} onPlace={openAsk} />
            </div>
            {/* Demo Mode footer */}
            <div style={{ padding: '5px 10px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>
                    {FUEL_LABEL[fuel]} · Indicative order book · Seeds only
                </span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#d97706', letterSpacing: '0.06em' }}>
                    DEMO MODE
                </span>
            </div>
        </div>
    );
};

export default MarketplaceTab;
