/**
 * ui/components/port/DeltaSummary.tsx
 * Compare-only: delta summary table between port A and port B.
 */
import React from 'react';
import { PortTerminalModel } from '../../../services/PortTerminalService';
import { FuelProduct } from '../../../domain/bunker/types';

interface Props {
    modelA: PortTerminalModel;
    modelB: PortTerminalModel;
    fuel: FuelProduct;
}

const signed = (n: number, unit = '') => {
    if (n === 0) return <span style={{ color: 'rgba(255,255,255,0.3)' }}>= {n}{unit}</span>;
    const color = n > 0 ? '#ef4444' : '#10b981'; // price up = bad (red), price down = good (green)
    return <span style={{ color, fontWeight: 700 }}>{n > 0 ? '+' : ''}{n}{unit}</span>;
};

const confSigned = (n: number) => {
    if (n === 0) return <span style={{ color: 'rgba(255,255,255,0.3)' }}>= {n}</span>;
    const color = n > 0 ? '#10b981' : '#ef4444'; // higher conf = good
    return <span style={{ color, fontWeight: 700 }}>{n > 0 ? '+' : ''}{n}</span>;
};

const TH: React.CSSProperties = { padding: '7px 14px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' };
const TD: React.CSSProperties = { padding: '8px 14px', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' };

const DeltaSummary: React.FC<Props> = ({ modelA, modelB, fuel }) => {
    const nodeA = modelA.profile.node;
    const nodeB = modelB.profile.node;
    const dpA = modelA.displayPrice;
    const dpB = modelB.displayPrice;

    const priceDelta = dpA && dpB ? Math.round(dpA.avg - dpB.avg) : null;
    const confDelta = nodeA.confidenceScore - nodeB.confidenceScore;
    const suppliersDelta = modelA.profile.suppliers.length - modelB.profile.suppliers.length;
    const availA = nodeA.availability[fuel];
    const availB = nodeB.availability[fuel];
    const ciA = (nodeA.ciGrade[fuel] ?? '—') as string;
    const ciB = (nodeB.ciGrade[fuel] ?? '—') as string;

    const AVAIL_COLOR = (a: string) => a === 'available' ? '#10b981' : a === 'limited' ? '#f59e0b' : '#6b7280';

    return (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.015)' }}>
            <div style={{ padding: '6px 14px 2px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>DELTA SUMMARY — A vs B</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                    <tr>
                        <th style={{ ...TH, width: '160px' }}>METRIC</th>
                        <th style={{ ...TH, color: '#facc15' }}>A — {nodeA.portName}</th>
                        <th style={{ ...TH, color: '#f97316' }}>B — {nodeB.portName}</th>
                        <th style={{ ...TH }}>Δ A − B</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={{ ...TD, color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em' }}>AVAILABILITY</td>
                        <td style={{ ...TD, color: AVAIL_COLOR(availA), fontWeight: 600 }}>{availA}</td>
                        <td style={{ ...TD, color: AVAIL_COLOR(availB), fontWeight: 600 }}>{availB}</td>
                        <td style={{ ...TD, color: availA === availB ? 'rgba(255,255,255,0.3)' : '#f59e0b' }}>{availA === availB ? 'same' : 'mismatch'}</td>
                    </tr>
                    <tr>
                        <td style={{ ...TD, color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em' }}>AVG PRICE</td>
                        <td style={{ ...TD, fontFamily: 'monospace' }}>{dpA ? dpA.avg.toFixed(0) : '—'}</td>
                        <td style={{ ...TD, fontFamily: 'monospace' }}>{dpB ? dpB.avg.toFixed(0) : '—'}</td>
                        <td style={{ ...TD, fontFamily: 'monospace' }}>{priceDelta !== null ? signed(priceDelta) : '—'}</td>
                    </tr>
                    <tr>
                        <td style={{ ...TD, color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em' }}>CONFIDENCE</td>
                        <td style={{ ...TD, fontFamily: 'monospace', color: nodeA.confidenceScore >= 75 ? '#10b981' : '#f59e0b' }}>{nodeA.confidenceScore}</td>
                        <td style={{ ...TD, fontFamily: 'monospace', color: nodeB.confidenceScore >= 75 ? '#10b981' : '#f59e0b' }}>{nodeB.confidenceScore}</td>
                        <td style={{ ...TD, fontFamily: 'monospace' }}>{confSigned(confDelta)}</td>
                    </tr>
                    <tr>
                        <td style={{ ...TD, color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em' }}>CI GRADE</td>
                        <td style={{ ...TD, color: '#c084fc', fontWeight: 700 }}>{ciA}</td>
                        <td style={{ ...TD, color: '#c084fc', fontWeight: 700 }}>{ciB}</td>
                        <td style={{ ...TD, color: ciA === ciB ? 'rgba(255,255,255,0.3)' : '#f59e0b' }}>{ciA === ciB ? 'same' : `${ciA} vs ${ciB}`}</td>
                    </tr>
                    <tr>
                        <td style={{ ...TD, color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em' }}>SUPPLIERS</td>
                        <td style={{ ...TD, fontFamily: 'monospace' }}>{modelA.profile.suppliers.length}</td>
                        <td style={{ ...TD, fontFamily: 'monospace' }}>{modelB.profile.suppliers.length}</td>
                        <td style={{ ...TD, fontFamily: 'monospace' }}>{confSigned(suppliersDelta)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default DeltaSummary;
