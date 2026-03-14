/**
 * ui/components/bunker/DrawerHeader.tsx
 * Compact terminal-style drawer header with confidence meter, CI badge,
 * Copy Share Link, and Print Profile buttons.
 */
import React, { useState } from 'react';
import { BunkerNode, FuelProduct, Currency, PriceBasis, Availability } from '../../../domain/bunker/types';
import { formatConfidence } from './format';

interface Props {
    node: BunkerNode;
    fuel: FuelProduct;
    currency: Currency;
    basis: PriceBasis;
    onClose: () => void;
}

const E_FUELS: FuelProduct[] = ['e_methanol', 'e_ammonia'];

const AVAIL_COLOR: Record<Availability, string> = {
    available: '#10b981', limited: '#f59e0b', planned: '#3b82f6', unknown: '#6b7280',
};

const FUEL_LABEL: Record<FuelProduct, string> = {
    e_methanol: 'e-Methanol', e_ammonia: 'e-Ammonia', vlsfo: 'VLSFO', mgo: 'MGO', other: 'Other',
};

const ICON_BTN: React.CSSProperties = {
    background: 'none', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '10px',
    padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap', transition: 'all 0.12s',
};

const DrawerHeader: React.FC<Props> = ({ node, fuel, currency, basis, onClose }) => {
    const avail = node.availability[fuel];
    const availColor = AVAIL_COLOR[avail];
    const conf = formatConfidence(node.confidenceScore);
    const isEFuel = E_FUELS.includes(fuel);
    const ciGrade = isEFuel ? (node.ciGrade[fuel] ?? '—') : null;
    const [copied, setCopied] = useState(false);

    const handleCopyLink = () => {
        const url = `${window.location.origin}/efuels?port=${node.locode}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handlePrint = () => {
        const prev = document.title;
        document.title = `Bunker Profile — ${node.portName} (${node.locode})`;
        window.print();
        document.title = prev;
    };

    return (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
            {/* Title row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '7px' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        {node.portName}
                    </h3>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'monospace' }}>
                        {node.locode} · {node.region.replace(/_/g, ' ')}
                    </div>
                </div>
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button style={ICON_BTN} onClick={handleCopyLink} title="Copy share link">
                        {copied ? '✓ Copied' : '🔗 Share'}
                    </button>
                    <button style={ICON_BTN} onClick={handlePrint} title="Print profile">
                        🖨 Print
                    </button>
                    <button onClick={onClose} aria-label="Close drawer"
                        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '4px 8px', borderRadius: '4px', flexShrink: 0 }}>
                        ✕
                    </button>
                </div>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '7px' }}>
                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: availColor + '1a', color: availColor, border: `1px solid ${availColor}33` }}>
                    {avail.toUpperCase()} · {FUEL_LABEL[fuel]}
                </span>
                {ciGrade && ciGrade !== '—' && String(ciGrade) !== 'unknown' && (
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' }}>
                        CI: {ciGrade}
                    </span>
                )}
            </div>

            {/* Confidence meter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', width: '68px', flexShrink: 0 }}>Confidence</span>
                <div style={{ flex: 1, height: '4px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${node.confidenceScore}%`, height: '100%', backgroundColor: conf.color, borderRadius: '2px', transition: 'width 0.3s ease' }} />
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: conf.color, width: '66px', textAlign: 'right', flexShrink: 0 }}>
                    {node.confidenceScore} ({conf.label})
                </span>
            </div>

            {/* Subtitle */}
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
                Basis: <strong style={{ color: 'rgba(255,255,255,0.5)' }}>{basis.toUpperCase()}</strong>
                {' • '}Currency: <strong style={{ color: 'rgba(255,255,255,0.5)' }}>{currency}</strong>
                {' • '}Unit: <strong style={{ color: 'rgba(255,255,255,0.5)' }}>mt</strong>
            </div>
        </div>
    );
};

export default DrawerHeader;
