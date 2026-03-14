/**
 * ui/components/port/PortSummaryStrip.tsx
 * Horizontal summary grid for PortTerminalPage and CompareTerminalPage columns.
 */
import React from 'react';
import { BunkerProfile, FuelProduct, Currency, Availability } from '../../../domain/bunker/types';
import { DisplayPrice } from '../../../services/BunkerPricingService';

interface Props {
    profile: BunkerProfile;
    fuel: FuelProduct;
    currency: Currency;
    displayPrice: DisplayPrice | null;
    deliveryWindow: string;
    lastUpdated: string;
    compact?: boolean; // narrower layout for CompareTerminalPage columns
}

const AVAIL_COLOR: Record<Availability, string> = {
    available: '#10b981', limited: '#f59e0b', planned: '#3b82f6', unknown: '#6b7280',
};

const FMT_DATE = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso.slice(0, 16).replace('T', ' '); }
};

const Metric: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; color?: string; compact?: boolean }> = ({ label, value, sub, color, compact }) => (
    <div style={{ padding: compact ? '8px 12px' : '10px 16px', borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: compact ? '12px' : '14px', fontWeight: 800, fontFamily: 'monospace', color: color ?? 'var(--text-primary)', lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{sub}</div>}
    </div>
);

const PortSummaryStrip: React.FC<Props> = ({ profile, fuel, currency, displayPrice, deliveryWindow, lastUpdated, compact }) => {
    const node = profile.node;
    const avail = node.availability[fuel] as Availability;
    const avColor = AVAIL_COLOR[avail];
    const ci = (node.ciGrade[fuel] ?? '—') as string;

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
            {/* Availability */}
            <div style={{ padding: compact ? '8px 12px' : '10px 16px', borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>AVAILABILITY</div>
                <span style={{ padding: '3px 9px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: avColor + '18', color: avColor }}>{avail}</span>
            </div>

            {/* Confidence */}
            <div style={{ padding: compact ? '8px 12px' : '10px 16px', borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>CONFIDENCE</div>
                <div style={{ fontSize: compact ? '12px' : '14px', fontWeight: 800, fontFamily: 'monospace', color: node.confidenceScore >= 75 ? '#10b981' : node.confidenceScore >= 45 ? '#f59e0b' : '#ef4444' }}>
                    {node.confidenceScore}<span style={{ fontSize: '9px', fontWeight: 400, color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>{node.confidenceLabel}</span>
                </div>
                <div style={{ marginTop: '4px', height: '3px', borderRadius: '2px', width: compact ? '60px' : '80px', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                    <div style={{ width: `${node.confidenceScore}%`, height: '100%', borderRadius: '2px', backgroundColor: node.confidenceScore >= 75 ? '#10b981' : '#f59e0b' }} />
                </div>
            </div>

            {/* CI */}
            <Metric compact={compact} label="CI GRADE" color={ci !== '—' ? '#c084fc' : 'rgba(255,255,255,0.2)'} value={ci} />

            {/* Avg Price */}
            {displayPrice ? (
                <Metric compact={compact} label={`AVG PRICE (${currency}/mt)`} color="var(--accent-primary)"
                    value={displayPrice.avg.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    sub={`${displayPrice.low.toFixed(0)} – ${displayPrice.high.toFixed(0)} range`} />
            ) : (
                <Metric compact={compact} label={`AVG PRICE (${currency}/mt)`} value="—" color="rgba(255,255,255,0.2)" />
            )}

            {/* Suppliers */}
            <Metric compact={compact} label="SUPPLIERS" value={profile.suppliers.length} />

            {/* Delivery */}
            <Metric compact={compact} label="DELIVERY" value={deliveryWindow} />

            {/* Updated */}
            <div style={{ padding: compact ? '8px 12px' : '10px 16px', flexShrink: 0 }}>
                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>UPDATED</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{FMT_DATE(lastUpdated)}</div>
            </div>
        </div>
    );
};

export default PortSummaryStrip;
