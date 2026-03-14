/**
 * ui/components/bunker/TradingTicket.tsx
 * Unified order-entry modal. Used by BunkerProfileDrawer for both
 * "Place Bid/Ask" (calculated defaults) and row-click (exact prefill).
 * Demo only — no execution.
 */
import React, { useState } from 'react';

export interface TicketDraft {
    side: 'bid' | 'ask';
    price: string;
    volumeMt: string;
    currency: string;
    basis: string;
    deliveryFrom: string;
    deliveryTo: string;
    portLocode: string;
    portName: string;
    fuel: string;
    prefillSource?: 'calculated' | 'row';
}

interface Props {
    draft: TicketDraft;
    onClose: () => void;
}

interface Errs { price?: string; volumeMt?: string; delivery?: string; }

const FUEL_LABEL: Record<string, string> = {
    e_methanol: 'e-Methanol', e_ammonia: 'e-Ammonia',
    vlsfo: 'VLSFO', mgo: 'MGO', other: 'Other',
};

function validate(d: TicketDraft): Errs {
    const e: Errs = {};
    if (!d.price || parseFloat(d.price) <= 0) e.price = 'Price must be > 0';
    if (!d.volumeMt || parseFloat(d.volumeMt) <= 0) e.volumeMt = 'Volume must be > 0';
    if (d.deliveryFrom && d.deliveryTo && d.deliveryFrom > d.deliveryTo)
        e.delivery = 'Delivery start must be ≤ end';
    return e;
}

const TradingTicket: React.FC<Props> = ({ draft, onClose }) => {
    const [form, setForm] = useState<TicketDraft>(draft);
    const [submitted, setSubmitted] = useState(false);
    const [touched, setTouched] = useState(false);

    const color = form.side === 'bid' ? '#10b981' : '#ef4444';
    const label = form.side === 'bid' ? 'BID' : 'ASK';
    const errs = touched ? validate(form) : {};

    const set = (k: keyof TicketDraft) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
            setForm(p => ({ ...p, [k]: e.target.value }));

    const handleSubmit = () => {
        setTouched(true);
        if (Object.keys(validate(form)).length > 0) return;
        setSubmitted(true);
    };

    const INPUT: React.CSSProperties = {
        width: '100%', padding: '6px 8px', backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)', borderRadius: '4px',
        color: 'var(--text-primary)', fontSize: '12px', boxSizing: 'border-box',
    };
    const LBL: React.CSSProperties = {
        fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)',
        letterSpacing: '0.06em', display: 'block', marginBottom: '3px',
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '360px', backgroundColor: 'var(--bg-secondary)', border: `1px solid ${color}40`, borderRadius: '10px', padding: '20px', boxShadow: '0 16px 48px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '15px', color }}>Place {label}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                            Port: {form.portName} ({form.portLocode}) · {FUEL_LABEL[form.fuel] ?? form.fuel} · Mode: Demo
                        </div>
                        {form.prefillSource === 'row' && (
                            <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '2px' }}>
                                Prefilled from indicative order (demo)
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '3px 8px', borderRadius: '4px' }}>✕</button>
                </div>

                {submitted ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div style={{ fontSize: '28px', marginBottom: '10px' }}>🚧</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Demo Mode</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Order captured locally — not executed.
                        </div>
                        <button onClick={onClose} style={{ marginTop: '16px', padding: '8px 24px', backgroundColor: color + '20', color, border: `1px solid ${color}40`, borderRadius: '5px', cursor: 'pointer', fontWeight: 700 }}>Close</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                            <label style={LBL}>PRICE ({form.currency}/mt)</label>
                            <input type="number" value={form.price} onChange={set('price')}
                                style={{ ...INPUT, borderColor: errs.price ? '#ef4444' : undefined }} />
                            {errs.price && <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '3px' }}>{errs.price}</div>}
                        </div>
                        <div>
                            <label style={LBL}>VOLUME (mt)</label>
                            <input type="number" value={form.volumeMt} onChange={set('volumeMt')}
                                style={{ ...INPUT, borderColor: errs.volumeMt ? '#ef4444' : undefined }} />
                            {errs.volumeMt && <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '3px' }}>{errs.volumeMt}</div>}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={LBL}>CURRENCY</label>
                                <select value={form.currency} onChange={set('currency')} style={INPUT}>
                                    <option value="USD">USD</option><option value="EUR">EUR</option>
                                </select>
                            </div>
                            <div>
                                <label style={LBL}>BASIS</label>
                                <select value={form.basis} onChange={set('basis')} style={INPUT}>
                                    <option value="posted">POSTED</option><option value="dap">DAP</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={LBL}>DELIVERY FROM</label>
                                <input type="date" value={form.deliveryFrom} onChange={set('deliveryFrom')} style={INPUT} />
                            </div>
                            <div>
                                <label style={LBL}>DELIVERY TO</label>
                                <input type="date" value={form.deliveryTo} onChange={set('deliveryTo')} style={INPUT} />
                            </div>
                        </div>
                        {errs.delivery && <div style={{ fontSize: '10px', color: '#ef4444' }}>{errs.delivery}</div>}
                        <button onClick={handleSubmit} style={{ width: '100%', padding: '10px', backgroundColor: color + '20', color, border: `1px solid ${color}40`, borderRadius: '5px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', marginTop: '4px' }}>
                            Submit {label} (Demo)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TradingTicket;
