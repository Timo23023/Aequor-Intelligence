/**
 * ui/pages/TradingChartPage.tsx
 * Phase 13 — Full-page trading chart terminal.
 * Route: /chart/:instrument (e.g. NLRTM_VLSFO)
 *
 * Layout:
 *   CommandRail (52px)
 *   ─────────────────────────────────────────
 *   ChartArea (flex-1)     │ OrderBook (280px)
 *   ─────────────────────────────────────────
 *                          │ TradingTicket  (320px)
 */
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import CommandRail from '../components/bunker/CommandRail';
import CandlestickChart from '../components/chart/CandlestickChart';
import OrderBook, { OrderBookEntry } from '../components/chart/OrderBook';
import TradingTicket from '../components/chart/TradingTicket';
import { Panel, PanelHeader } from '../components/primitives/Panel';
import { listBunkerNodes } from '../../services/BunkerService';
import { parseGlobalParams, applyGlobalParams, needsCanonical } from '../../services/AppStateService';
import type { FuelProduct, Currency, PriceBasis } from '../../domain/bunker/types';
import type { BunkerNode } from '../../domain/bunker/types';

const MAPTILER_KEY = ((import.meta.env.VITE_MAPTILER_API_KEY as string) || '').trim();
const USE_MAPTILER = MAPTILER_KEY.length > 0;

// ── OHLCV data generation ────────────────────────────────────────────────────

interface OHLCVBar {
    time: string; // YYYY-MM-DD
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y';

const TF_DAYS: Record<Timeframe, number> = {
    '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365,
};

/** Deterministic seeded random (mulberry32) */
function seeded(seed: number) {
    let s = seed;
    return () => {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function generateOHLCV(instrument: string, days: number): OHLCVBar[] {
    // Seed from instrument string for determinism
    const seed = instrument.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rng = seeded(seed);

    const basePrice = 400 + rng() * 500; // 400–900 USD/MT range
    const now = new Date();
    const bars: OHLCVBar[] = [];

    let price = basePrice;
    for (let i = days; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        // Skip weekends
        if (d.getDay() === 0 || d.getDay() === 6) continue;

        const move = (rng() - 0.48) * 0.025; // slight upward bias
        const open = price;
        const close = open * (1 + move);
        const range = Math.abs(close - open) * (0.5 + rng() * 1.5);
        const high = Math.max(open, close) + range * rng();
        const low = Math.min(open, close) - range * rng();
        const volume = 500 + rng() * 4500;

        bars.push({
            time: d.toISOString().slice(0, 10),
            open: +open.toFixed(2),
            high: +high.toFixed(2),
            low: +low.toFixed(2),
            close: +close.toFixed(2),
            volume: Math.round(volume),
        });
        price = close;
    }
    return bars;
}

function generateOrderBook(lastPrice: number, seed: number): { bids: OrderBookEntry[]; asks: OrderBookEntry[] } {
    const rng = seeded(seed);
    const bids: OrderBookEntry[] = [];
    const asks: OrderBookEntry[] = [];
    let bidTotal = 0;
    let askTotal = 0;

    for (let i = 0; i < 12; i++) {
        const bidPrice = lastPrice - (i + 1) * (0.25 + rng() * 0.5);
        const bidSize = Math.round(200 + rng() * 2000);
        bidTotal += bidSize;
        bids.push({ price: +bidPrice.toFixed(2), size: bidSize, total: bidTotal });

        const askPrice = lastPrice + (i + 1) * (0.25 + rng() * 0.5);
        const askSize = Math.round(200 + rng() * 2000);
        askTotal += askSize;
        asks.push({ price: +askPrice.toFixed(2), size: askSize, total: askTotal });
    }
    return { bids, asks };
}

// ── TradingChartPage ─────────────────────────────────────────────────────────

const TradingChartPage: React.FC = () => {
    const { instrument = 'NLRTM_VLSFO' } = useParams<{ instrument: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const searchRef = useRef<HTMLInputElement>(null);

    const { fuel, currency, basis } = parseGlobalParams(searchParams);
    const setFuel = (f: FuelProduct) => setSearchParams(sp => applyGlobalParams(sp, { fuel: f, currency, basis }), { replace: true });
    const setCurrency = (c: Currency) => setSearchParams(sp => applyGlobalParams(sp, { fuel, currency: c, basis }), { replace: true });
    const setBasis = (b: PriceBasis) => setSearchParams(sp => applyGlobalParams(sp, { fuel, currency, basis: b }), { replace: true });

    useEffect(() => {
        if (needsCanonical(searchParams)) {
            setSearchParams(sp => applyGlobalParams(sp, { fuel, currency, basis }), { replace: true });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const [nodes] = useState<BunkerNode[]>(() => listBunkerNodes());

    const [timeframe, setTimeframe] = useState<Timeframe>('1M');

    // OHLCV data (deterministic per instrument + timeframe)
    const ohlcvData = useMemo(() => {
        const days = TF_DAYS[timeframe];
        return generateOHLCV(instrument, days);
    }, [instrument, timeframe]);

    const lastBar = ohlcvData[ohlcvData.length - 1];
    const lastPrice = lastBar?.close ?? 0;
    const prevClose = ohlcvData[ohlcvData.length - 2]?.close ?? lastPrice;
    const dayChange = lastPrice - prevClose;
    const dayChangePct = prevClose > 0 ? (dayChange / prevClose) * 100 : 0;

    // Order book (deterministic per instrument + last price)
    const { bids, asks } = useMemo(() => {
        const seedVal = instrument.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + Math.floor(lastPrice);
        return generateOrderBook(lastPrice, seedVal);
    }, [instrument, lastPrice]);

    // Parse instrument name
    const [locode, fuelCode] = instrument.split('_');

    const handleNodeSelect = useCallback((node: BunkerNode) => {
        navigate(`/port/${node.locode}?fuel=${fuel}&ccy=${currency}&basis=${basis}`);
    }, [navigate, fuel, currency, basis]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--surface-0)' }}>
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
                onSearchSelect={handleNodeSelect}
                onCopyShareLink={() => navigator.clipboard.writeText(window.location.href)}
            />

            {/* Header bar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '0 16px', height: '44px',
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--surface-1)',
                flexShrink: 0,
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'none', border: '1px solid var(--border-mid)',
                        color: 'var(--text-dim-2)', borderRadius: 'var(--radius-sm)',
                        padding: '3px 10px', fontSize: 'var(--font-body)', cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    ← Back
                </button>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                        {locode}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim-2)' }}>
                        {fuelCode?.replace('_', '-')}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {lastPrice.toFixed(2)}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim-2)' }}>{currency}/MT</span>
                    <span style={{
                        fontSize: '13px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                        color: dayChange >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                    }}>
                        {dayChange >= 0 ? '+' : ''}{dayChange.toFixed(2)} ({dayChangePct >= 0 ? '+' : ''}{dayChangePct.toFixed(2)}%)
                    </span>
                </div>

                <div style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-dim-3)', fontStyle: 'italic' }}>
                    DEMO · Synthetic data · Not real market prices
                </div>
            </div>

            {/* Body: Chart | OrderBook + Ticket */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

                {/* ── Chart area ── */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <CandlestickChart
                        data={ohlcvData}
                        title={`${instrument} · ${currency}/MT`}
                        onTimeframeChange={setTimeframe}
                    />
                </div>

                {/* ── Right panel: OrderBook + Ticket ── */}
                <div style={{
                    width: '300px', minWidth: '260px', flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    borderLeft: '1px solid var(--border-panel)',
                    overflow: 'hidden',
                }}>
                    {/* Order Book */}
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <Panel style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 0, border: 0, borderBottom: '1px solid var(--border-panel)' }}>
                            <PanelHeader title="Order Book" />
                            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                <OrderBook
                                    bids={bids}
                                    asks={asks}
                                    lastPrice={lastPrice}
                                    currency={currency}
                                />
                            </div>
                        </Panel>
                    </div>

                    {/* Trading Ticket */}
                    <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-panel)' }}>
                        <TradingTicket
                            instrument={instrument}
                            lastPrice={lastPrice}
                            currency={currency}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TradingChartPage;
