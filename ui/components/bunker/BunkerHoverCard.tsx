/**
 * ui/components/bunker/BunkerHoverCard.tsx
 * Floating mini-card that follows the cursor over a bunker node.
 */
import React from 'react';
import { BunkerNode, FuelProduct, Currency, PriceBasis, Availability } from '../../../domain/bunker/types';
import { DisplayPrice } from '../../../services/BunkerPricingService';

interface Props {
    node: BunkerNode;
    displayPrice: DisplayPrice | null;
    fuel: FuelProduct;
    currency: Currency;
    basis: PriceBasis;
    position: { x: number; y: number };
}

const AVAIL_COLORS: Record<Availability, string> = {
    available: '#10b981',
    limited: '#f59e0b',
    planned: '#3b82f6',
    unknown: '#6b7280',
};

const E_FUELS: FuelProduct[] = ['e_methanol', 'e_ammonia'];
const FUEL_LABELS: Record<FuelProduct, string> = {
    e_methanol: 'e-Methanol',
    e_ammonia: 'e-Ammonia',
    vlsfo: 'VLSFO',
    mgo: 'MGO',
    other: 'Other',
};

const BunkerHoverCard: React.FC<Props> = ({ node, displayPrice, fuel, currency, basis, position }) => {
    const avail = node.availability[fuel];
    const ciGrade = E_FUELS.includes(fuel) ? node.ciGrade[fuel] : undefined;

    // Clamp to viewport
    const left = Math.min(position.x + 14, window.innerWidth - 280);
    const top = Math.min(position.y - 10, window.innerHeight - 220);

    return (
        <div style={{
            position: 'fixed', left, top, zIndex: 9999, pointerEvents: 'none',
            width: '260px',
            backgroundColor: 'rgba(10,14,26,0.97)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
            fontSize: '12px',
        }}>
            {/* Header */}
            <div style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {node.portName}
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {node.locode} · {node.region.replace('_', ' ')}
                </div>
            </div>

            {/* Availability */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '11px',
                    backgroundColor: AVAIL_COLORS[avail] + '20',
                    color: AVAIL_COLORS[avail],
                    border: `1px solid ${AVAIL_COLORS[avail]}40`,
                }}>
                    {avail.toUpperCase()}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>{FUEL_LABELS[fuel]}</span>
            </div>

            {/* Price */}
            {displayPrice ? (
                <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--accent-primary)' }}>
                        {currency} {displayPrice.avg.toLocaleString()} <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>/{displayPrice.unit}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                        {displayPrice.low.toLocaleString()} – {displayPrice.high.toLocaleString()} · {basis.toUpperCase()}
                    </div>
                </div>
            ) : (
                <div style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    No price data for {FUEL_LABELS[fuel]}
                </div>
            )}

            {/* Confidence + CI */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                    Confidence: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {node.confidenceScore} ({node.confidenceLabel})
                    </span>
                </span>
                {ciGrade && (
                    <span style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(168,85,247,0.15)', color: '#a855f7', fontWeight: 700, fontSize: '11px' }}>
                        CI: {ciGrade}
                    </span>
                )}
            </div>
        </div>
    );
};

export default BunkerHoverCard;
