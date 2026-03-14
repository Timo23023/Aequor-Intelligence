/**
 * ui/components/bunker/SuppliersTab.tsx
 * Compact supplier cards with reliability bar and Demo RFQ button.
 */
import React from 'react';
import { BunkerProfile, FuelProduct } from '../../../domain/bunker/types';

interface Props { profile: BunkerProfile; }

const E_FUELS: FuelProduct[] = ['e_methanol', 'e_ammonia'];

const FUEL_LABEL: Record<FuelProduct, string> = {
    e_methanol: 'e-Methanol', e_ammonia: 'e-Ammonia',
    vlsfo: 'VLSFO', mgo: 'MGO', other: 'Other',
};

const SuppliersTab: React.FC<Props> = ({ profile }) => (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {profile.suppliers.map(s => {
            const rel = s.reliabilityScore ?? 0;
            const relColor = rel >= 85 ? '#10b981' : rel >= 70 ? '#f59e0b' : '#ef4444';

            return (
                <div key={s.supplierId} style={{ padding: '10px 12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '7px' }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                        <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>{s.name}</span>
                        <button
                            style={{ padding: '2px 9px', fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(59,130,246,0.10)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '4px', cursor: 'pointer', letterSpacing: '0.04em' }}
                            title="Demo only — no actual order sent"
                        >
                            RFQ · Demo
                        </button>
                    </div>

                    {/* Fuel chips */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '7px' }}>
                        {s.fuels.map(f => (
                            <span key={f} style={{
                                padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 600,
                                backgroundColor: E_FUELS.includes(f) ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)',
                                color: E_FUELS.includes(f) ? '#34d399' : '#818cf8',
                                border: `1px solid ${E_FUELS.includes(f) ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`,
                            }}>
                                {FUEL_LABEL[f]}
                            </span>
                        ))}
                    </div>

                    {/* Meta row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        {/* Delivery */}
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Delivery: <strong style={{ color: 'var(--text-primary)' }}>
                                {s.typicalDeliveryWindowDays.min}–{s.typicalDeliveryWindowDays.max} days
                            </strong>
                        </span>

                        {/* Reliability bar + % */}
                        {s.reliabilityScore !== undefined && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                                <div style={{ width: '52px', height: '4px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${rel}%`, height: '100%', backgroundColor: relColor, borderRadius: '2px' }} />
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: relColor, minWidth: '30px' }}>{rel}%</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        })}
    </div>
);

export default SuppliersTab;
