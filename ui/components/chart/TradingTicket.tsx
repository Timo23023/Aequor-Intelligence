/**
 * ui/components/chart/TradingTicket.tsx
 * Phase 13: Inline trading ticket for TradingChartPage.
 * NOT a popup — it sits in the page layout.
 *
 * Fields: Price, Volume (MT), Total (computed).
 * Buttons: Place Bid (emerald) | Place Ask (rose).
 */
import React, { useState, useEffect } from 'react';
import { Panel, PanelHeader } from '../primitives/Panel';

interface TradingTicketProps {
    instrument: string;     // e.g. 'NLRTM_VLSFO'
    lastPrice?: number;     // Pre-fill price
    currency?: string;
}

export interface TicketSubmission {
    instrument: string;
    side: 'bid' | 'ask';
    price: number;
    volume: number;
    total: number;
    currency: string;
    submittedAt: string;
}

const TradingTicket: React.FC<TradingTicketProps> = ({ instrument, lastPrice = 0, currency = 'USD' }) => {
    const [side, setSide] = useState<'bid' | 'ask'>('bid');
    const [price, setPrice] = useState(lastPrice.toFixed(2));
    const [volume, setVolume] = useState('500');
    const [submitted, setSubmitted] = useState<TicketSubmission | null>(null);

    // Update price when lastPrice changes externally
    useEffect(() => {
        if (lastPrice > 0) setPrice(lastPrice.toFixed(2));
    }, [lastPrice]);

    const numPrice = parseFloat(price) || 0;
    const numVol = parseFloat(volume) || 0;
    const total = numPrice * numVol;

    const isBid = side === 'bid';
    const accentColor = isBid ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    const glowToken = isBid ? 'var(--glow-emerald-sm)' : 'var(--glow-rose-sm)';
    const dimColor = isBid ? 'var(--accent-emerald-dim)' : 'var(--accent-rose-dim)';

    const handleSubmit = () => {
        const draft: TicketSubmission = {
            instrument, side,
            price: numPrice,
            volume: numVol,
            total,
            currency,
            submittedAt: new Date().toISOString(),
        };
        setSubmitted(draft);
        setTimeout(() => setSubmitted(null), 3000);
    };

    const INP: React.CSSProperties = {
        width: '100%',
        padding: '0 10px',
        height: 'var(--input-h)',
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--border-mid)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)',
        fontSize: 'var(--font-body)',
        fontFamily: 'inherit',
        fontVariantNumeric: 'tabular-nums',
        boxSizing: 'border-box' as const,
        outline: 'none',
    };

    const LBL: React.CSSProperties = {
        fontSize: 'var(--font-label)',
        fontWeight: 700,
        letterSpacing: 'var(--lsp-caps)',
        color: 'var(--text-dim-2)',
        textTransform: 'uppercase' as const,
        marginBottom: '4px',
    };

    return (
        <Panel style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <PanelHeader title="Trading Ticket" />

            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {/* Instrument */}
                <div>
                    <div style={LBL}>Instrument</div>
                    <div style={{ fontSize: 'var(--font-body-md)', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                        {instrument}
                    </div>
                </div>

                {/* Side selector */}
                <div>
                    <div style={LBL}>Side</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {(['bid', 'ask'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setSide(s)}
                                style={{
                                    height: 'var(--btn-h)',
                                    fontSize: 'var(--font-body)',
                                    fontWeight: 700,
                                    fontFamily: 'inherit',
                                    borderRadius: 'var(--radius-sm)',
                                    border: `1px solid ${side === s ? (s === 'bid' ? 'rgba(16,185,129,0.4)' : 'rgba(244,63,94,0.4)') : 'var(--border-mid)'}`,
                                    background: side === s ? (s === 'bid' ? 'var(--accent-emerald-dim)' : 'var(--accent-rose-dim)') : 'transparent',
                                    color: side === s ? (s === 'bid' ? 'var(--accent-emerald)' : 'var(--accent-rose)') : 'var(--text-dim-2)',
                                    cursor: 'pointer',
                                    transition: 'all 0.12s',
                                    textTransform: 'uppercase' as const,
                                    letterSpacing: '0.05em',
                                    boxShadow: side === s ? (s === 'bid' ? 'var(--glow-emerald-sm)' : 'var(--glow-rose-sm)') : 'none',
                                }}
                            >
                                {s === 'bid' ? '▲ Bid' : '▼ Ask'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Price */}
                <div>
                    <div style={LBL}>Price ({currency}/MT)</div>
                    <input
                        type="number"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        step="0.50"
                        min="0"
                        style={INP}
                    />
                </div>

                {/* Volume */}
                <div>
                    <div style={LBL}>Volume (MT)</div>
                    <input
                        type="number"
                        value={volume}
                        onChange={e => setVolume(e.target.value)}
                        step="100"
                        min="0"
                        style={INP}
                    />
                </div>

                {/* Total (computed) */}
                <div>
                    <div style={LBL}>Total ({currency})</div>
                    <div style={{
                        height: 'var(--input-h)',
                        display: 'flex', alignItems: 'center',
                        padding: '0 10px',
                        backgroundColor: 'var(--surface-3)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-body-md)',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--text-primary)',
                    }}>
                        {total > 0 ? total.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
                    </div>
                </div>

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={numPrice <= 0 || numVol <= 0}
                    style={{
                        width: '100%',
                        height: '36px',
                        fontSize: 'var(--font-body-md)',
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${accentColor}55`,
                        background: dimColor,
                        color: accentColor,
                        cursor: numPrice <= 0 || numVol <= 0 ? 'not-allowed' : 'pointer',
                        opacity: numPrice <= 0 || numVol <= 0 ? 0.5 : 1,
                        transition: 'all 0.12s',
                        boxShadow: glowToken,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase' as const,
                        marginTop: 'auto',
                    }}
                >
                    {isBid ? '▲ Place Bid' : '▼ Place Ask'}
                </button>

                {/* Success toast */}
                {submitted && (
                    <div style={{
                        padding: '8px 12px',
                        backgroundColor: 'var(--accent-emerald-dim)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-body)',
                        color: 'var(--accent-emerald)',
                        fontWeight: 600,
                        textAlign: 'center',
                        boxShadow: 'var(--glow-emerald-sm)',
                    }}>
                        ✓ Order {'submitted (DEMO)'} — {submitted.side.toUpperCase()} {submitted.volume} MT @ {submitted.price}
                    </div>
                )}

                {/* Demo disclaimer */}
                <div style={{ fontSize: '10px', color: 'var(--text-dim-3)', textAlign: 'center', marginTop: 'auto', lineHeight: 1.5 }}>
                    DEMO MODE · No real execution · Indicative prices only
                </div>
            </div>
        </Panel>
    );
};

export default TradingTicket;
