/**
 * ui/components/chart/OrderBook.tsx
 * Phase 13: Bid/Ask order book panel.
 * Green rows = bids, red rows = asks. Tabular numeric formatting.
 */
import React from 'react';

export interface OrderBookEntry {
    price: number;
    size: number;
    total: number;
}

interface OrderBookProps {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
    lastPrice?: number;
    currency?: string;
}

const fmt = (n: number, dp = 2) => n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

const OrderBook: React.FC<OrderBookProps> = ({ bids, asks, lastPrice, currency = 'USD' }) => {
    const maxTotal = Math.max(
        ...bids.map(b => b.total),
        ...asks.map(a => a.total),
        1,
    );

    const Row: React.FC<{ entry: OrderBookEntry; side: 'bid' | 'ask' }> = ({ entry, side }) => {
        const isBid = side === 'bid';
        const bgColor = isBid ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.06)';
        const barColor = isBid ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.18)';
        const priceColor = isBid ? 'var(--accent-emerald)' : 'var(--accent-rose)';
        const pct = Math.min((entry.total / maxTotal) * 100, 100);

        return (
            <tr style={{ position: 'relative', cursor: 'default' }}>
                <td style={{
                    ...TD,
                    color: priceColor, fontWeight: 600,
                    position: 'relative',
                }}>
                    {/* Depth bar behind row */}
                    <div style={{
                        position: 'absolute',
                        top: 0, bottom: 0,
                        right: 0, width: `${pct}%`,
                        background: barColor,
                        pointerEvents: 'none',
                    }} />
                    <span style={{ position: 'relative' }}>{fmt(entry.price)}</span>
                </td>
                <td style={{ ...TD, color: 'var(--text-dim-1)', textAlign: 'right', background: bgColor }}>
                    {fmt(entry.size, 0)}
                </td>
                <td style={{ ...TD, color: 'var(--text-dim-2)', textAlign: 'right', background: bgColor }}>
                    {fmt(entry.total, 0)}
                </td>
            </tr>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontSize: 'var(--font-table)', fontVariantNumeric: 'tabular-nums' }}>
            {/* Asks (top — reversed so best ask is nearest last price) */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: '40%' }} />
                        <col style={{ width: '30%' }} />
                        <col style={{ width: '30%' }} />
                    </colgroup>
                    <tbody>
                        {[...asks].reverse().map((ask, i) => (
                            <Row key={i} entry={ask} side="ask" />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Spread / last price divider */}
            <div style={{
                padding: '4px 10px',
                borderTop: '1px solid var(--border-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: 'var(--surface-2)',
                flexShrink: 0,
            }}>
                <span style={{ fontSize: 'var(--font-label)', color: 'var(--text-dim-2)', textTransform: 'uppercase', letterSpacing: 'var(--lsp-caps)' }}>
                    Last Price
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {lastPrice ? fmt(lastPrice) : '—'} <span style={{ fontSize: '10px', color: 'var(--text-dim-2)' }}>{currency}/MT</span>
                </span>
            </div>

            {/* Bids (bottom) */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: '40%' }} />
                        <col style={{ width: '30%' }} />
                        <col style={{ width: '30%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            {['Price', 'Size (MT)', 'Total'].map(h => (
                                <th key={h} style={TH}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {bids.map((bid, i) => (
                            <Row key={i} entry={bid} side="bid" />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const TH: React.CSSProperties = {
    padding: '4px 10px',
    fontSize: 'var(--font-label)',
    fontWeight: 700,
    letterSpacing: 'var(--lsp-caps)',
    color: 'var(--text-dim-2)',
    textTransform: 'uppercase',
    position: 'sticky',
    top: 0,
    backgroundColor: 'var(--surface-1)',
    boxShadow: '0 1px 0 var(--border-subtle)',
    whiteSpace: 'nowrap',
    textAlign: 'left',
};

const TD: React.CSSProperties = {
    padding: '3px 10px',
    height: 'var(--row-h)',
    fontSize: 'var(--font-table)',
    borderBottom: '1px solid var(--border-subtle)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    verticalAlign: 'middle',
};

export default OrderBook;
