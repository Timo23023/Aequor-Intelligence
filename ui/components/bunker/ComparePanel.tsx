/**
 * ui/components/bunker/ComparePanel.tsx
 * A/B port comparison panel — minimize, swap A/B, "Open A / Open B" labels.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BunkerNode, FuelProduct, Currency, PriceBasis } from '../../../domain/bunker/types';
import { BunkerProfile } from '../../../domain/bunker/types';
import { computeDisplayPrice } from '../../../services/BunkerPricingService';
import { formatMoney, formatRange } from './format';

interface Props {
    nodeA: BunkerNode | null;
    nodeB: BunkerNode | null;
    profileA: BunkerProfile | null;
    profileB: BunkerProfile | null;
    fuel: FuelProduct;
    currency: Currency;
    basis: PriceBasis;
    onOpenA: () => void;
    onOpenB: () => void;
    onClear: () => void;
    onSwap?: () => void;
}

const E_FUELS: FuelProduct[] = ['e_methanol', 'e_ammonia'];

const AVAIL_COLOR = (a: string) =>
    a === 'available' ? '#10b981' : a === 'limited' ? '#f59e0b' : '#6b7280';

interface SlotProps {
    label: 'A' | 'B';
    color: string;
    node: BunkerNode | null;
    profile: BunkerProfile | null;
    fuel: FuelProduct;
    currency: Currency;
    basis: PriceBasis;
    onOpen: () => void;
}

const Slot: React.FC<SlotProps> = ({ label, color, node, profile, fuel, currency, basis, onOpen }) => {
    const dp = profile ? computeDisplayPrice(profile, fuel, currency, basis) : null;
    const avail = node?.availability[fuel] ?? 'unknown';

    return (
        <div style={{ flex: 1, padding: '10px 12px', borderLeft: label === 'B' ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <div style={{ fontWeight: 800, fontSize: '10px', color, marginBottom: '6px', letterSpacing: '0.08em' }}>SLOT {label}</div>
            {!node ? (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Click a port on map…</div>
            ) : (
                <>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>{node.portName}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace', marginBottom: '5px' }}>{node.locode}</div>
                    <div style={{ fontSize: '11px', marginBottom: '2px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>Avail: </span>
                        <span style={{ color: AVAIL_COLOR(avail), fontWeight: 600 }}>{avail}</span>
                    </div>
                    <div style={{ fontSize: '11px', marginBottom: '2px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>Conf: </span>
                        <span>{node.confidenceScore} ({node.confidenceLabel})</span>
                    </div>
                    {E_FUELS.includes(fuel) && (
                        <div style={{ fontSize: '11px', marginBottom: '2px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.3)' }}>CI: </span>
                            <span style={{ color: '#c084fc' }}>{String(node.ciGrade[fuel] ?? '—')}</span>
                        </div>
                    )}
                    <div style={{ fontSize: '11px', marginBottom: '6px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>Suppliers: </span>
                        <span>{profile?.suppliers.length ?? '—'}</span>
                    </div>
                    {dp ? (
                        <div style={{ padding: '4px 7px', backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: '4px', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace', fontSize: '13px' }}>{formatMoney(dp.avg, currency)}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{formatRange(dp.low, dp.high)}</div>
                        </div>
                    ) : <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginBottom: '8px' }}>No price data</div>}
                    <button onClick={onOpen} style={{ width: '100%', padding: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: color + '15', color, border: `1px solid ${color}30`, borderRadius: '4px', cursor: 'pointer' }}>
                        Open {label}
                    </button>
                </>
            )}
        </div>
    );
};

const ComparePanel: React.FC<Props> = (p) => {
    const navigate = useNavigate();
    const [minimized, setMinimized] = useState(false);
    const nameA = p.nodeA?.portName ?? 'A';
    const nameB = p.nodeB?.portName ?? 'B';

    return (
        <div style={{ position: 'absolute', bottom: '10px', left: '12px', width: minimized ? 'auto' : '440px', backgroundColor: 'rgba(9,13,23,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', boxShadow: '0 8px 28px rgba(0,0,0,0.55)', zIndex: 60, overflow: 'hidden' }}>
            {/* Header bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderBottom: minimized ? 'none' : '1px solid rgba(255,255,255,0.06)', gap: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                    {minimized ? `COMPARE  ${nameA} vs ${nameB}` : 'COMPARE MODE'}
                </span>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {p.nodeA && p.nodeB && !minimized && (
                        <button onClick={() => navigate(`/compare?a=${p.nodeA!.locode}&b=${p.nodeB!.locode}`)}
                            style={{ fontSize: '10px', padding: '2px 7px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', borderRadius: '4px', cursor: 'pointer' }}>⊡ Full Compare</button>
                    )}
                    {p.onSwap && !minimized && (
                        <button onClick={p.onSwap} title="Swap A and B"
                            style={{ fontSize: '10px', padding: '2px 7px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', borderRadius: '4px', cursor: 'pointer' }}>⇄ Swap</button>
                    )}
                    <button onClick={() => setMinimized(m => !m)}
                        style={{ fontSize: '10px', padding: '2px 7px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', borderRadius: '4px', cursor: 'pointer' }}>
                        {minimized ? '▲' : '▼'}
                    </button>
                    <button onClick={p.onClear}
                        style={{ fontSize: '10px', padding: '2px 7px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', borderRadius: '4px', cursor: 'pointer' }}>Clear</button>
                </div>
            </div>
            {/* Body — hidden when minimized */}
            {!minimized && (
                <div style={{ display: 'flex' }}>
                    <Slot label="A" color="#facc15" node={p.nodeA} profile={p.profileA} fuel={p.fuel} currency={p.currency} basis={p.basis} onOpen={p.onOpenA} />
                    <Slot label="B" color="#f97316" node={p.nodeB} profile={p.profileB} fuel={p.fuel} currency={p.currency} basis={p.basis} onOpen={p.onOpenB} />
                </div>
            )}
        </div>
    );
};

export default ComparePanel;
