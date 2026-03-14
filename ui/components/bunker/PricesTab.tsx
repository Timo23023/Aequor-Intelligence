/**
 * ui/components/bunker/PricesTab.tsx
 * Terminal-style prices table with sticky header, row hover, selected-fuel indicator.
 */
import React, { useState } from 'react';
import { BunkerProfile, FuelProduct, Currency, PriceBasis } from '../../../domain/bunker/types';
import { computeDisplayPrice } from '../../../services/BunkerPricingService';
import { formatMoney, formatRange } from './format';

interface Props {
    profile: BunkerProfile;
    fuel: FuelProduct;
    currency: Currency;
    basis: PriceBasis;
}

const CORE_FUELS: FuelProduct[] = ['e_methanol', 'e_ammonia', 'vlsfo', 'mgo'];
const E_FUELS: FuelProduct[] = ['e_methanol', 'e_ammonia'];

const FUEL_LABEL: Record<FuelProduct, string> = {
    e_methanol: 'e-Methanol', e_ammonia: 'e-Ammonia',
    vlsfo: 'VLSFO', mgo: 'MGO', other: 'Other',
};

const TH: React.CSSProperties = {
    textAlign: 'left', padding: '7px 10px',
    fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
    color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1,
};

const PricesTab: React.FC<Props> = ({ profile, fuel, currency, basis }) => {
    const [hovered, setHovered] = useState<FuelProduct | null>(null);

    return (
        <div style={{ padding: '0', overflow: 'auto', maxHeight: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                    <tr>
                        <th style={TH}>Fuel</th>
                        <th style={{ ...TH, textAlign: 'center' }}>CI</th>
                        <th style={{ ...TH, textAlign: 'right' }}>Avg</th>
                        <th style={{ ...TH, textAlign: 'right' }}>Range</th>
                        <th style={{ ...TH }}>Unit</th>
                    </tr>
                </thead>
                <tbody>
                    {CORE_FUELS.map(f => {
                        const dp = computeDisplayPrice(profile, f, currency, basis);
                        const isSelected = f === fuel;
                        const isEFuel = E_FUELS.includes(f);
                        const ciRaw = isEFuel ? (profile.node.ciGrade[f] ?? '—') : '—';
                        const ci = (ciRaw === 'unknown' || String(ciRaw) === '') ? '—' : String(ciRaw);
                        const isHovered = hovered === f;

                        const rowBg = isHovered
                            ? 'rgba(59,130,246,0.07)'
                            : isSelected
                                ? 'rgba(59,130,246,0.04)'
                                : 'transparent';

                        return (
                            <tr
                                key={f}
                                style={{ backgroundColor: rowBg, borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                                onMouseEnter={() => setHovered(f)}
                                onMouseLeave={() => setHovered(null)}
                            >
                                {/* Fuel cell */}
                                <td style={{ padding: '9px 10px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                    <span style={{
                                        display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                                        backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                                        border: `1px solid ${isSelected ? '#3b82f6' : 'transparent'}`,
                                        marginRight: '6px', verticalAlign: 'middle', flexShrink: 0,
                                    }} />
                                    {FUEL_LABEL[f]}
                                </td>

                                {/* CI cell */}
                                <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                                    {ci !== '—' ? (
                                        <span style={{ padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(192,132,252,0.15)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.2)' }}>
                                            {ci}
                                        </span>
                                    ) : (
                                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>—</span>
                                    )}
                                </td>

                                {/* Avg */}
                                <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: dp ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: '13px' }}>
                                    {dp ? formatMoney(dp.avg, currency) : '—'}
                                </td>

                                {/* Range */}
                                <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                    {dp ? formatRange(dp.low, dp.high) : '—'}
                                </td>

                                {/* Unit */}
                                <td style={{ padding: '9px 10px', color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
                                    {dp ? dp.unit : ''}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Microcopy */}
            <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
                    Indicative demo prices · Seeds only
                </span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
                    ● selected fuel
                </span>
            </div>
        </div>
    );
};

export default PricesTab;
