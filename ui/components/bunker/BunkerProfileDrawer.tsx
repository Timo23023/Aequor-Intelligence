/**
 * ui/components/bunker/BunkerProfileDrawer.tsx
 * Thin orchestrator. Owns ticket state (TradingTicket).
 * ESC chain: ticket open → close ticket; else → close drawer.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BunkerProfile, FuelProduct, Currency, PriceBasis } from '../../../domain/bunker/types';
import { computeDisplayPrice } from '../../../services/BunkerPricingService';
import DrawerHeader from './DrawerHeader';
import PricesTab from './PricesTab';
import SuppliersTab from './SuppliersTab';
import MarketplaceTab from './MarketplaceTab';
import TradingTicket, { TicketDraft } from './TradingTicket';

interface Props {
    profile: BunkerProfile;
    fuel: FuelProduct;
    currency: Currency;
    basis: PriceBasis;
    onClose: () => void;
}

type TabId = 'prices' | 'suppliers' | 'marketplace';

const BunkerProfileDrawer: React.FC<Props> = ({ profile, fuel, currency, basis, onClose }) => {
    const navigate = useNavigate();
    const [tab, setTab] = useState<TabId>('prices');
    const [ticketDraft, setTicketDraft] = useState<TicketDraft | null>(null);

    // ESC chain: ticket → drawer
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (ticketDraft) { setTicketDraft(null); return; }
            onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [ticketDraft, onClose]);

    const handleOpenTicket = useCallback((draft: TicketDraft) => setTicketDraft(draft), []);
    const handleCloseTicket = useCallback(() => setTicketDraft(null), []);

    const displayPrice = computeDisplayPrice(profile, fuel, currency, basis);

    const TAB_BTN = (id: TabId, lbl: string) => (
        <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: '9px 4px', background: 'none', border: 'none', borderBottom: tab === id ? '2px solid var(--accent-primary)' : '2px solid transparent', color: tab === id ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: tab === id ? 700 : 500, cursor: 'pointer', fontSize: '12px', transition: 'all 0.12s', outline: 'none' }}
            onFocus={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(59,130,246,0.06)'; }}
            onBlur={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
            {lbl}
        </button>
    );

    return (
        <>
            <div role="dialog" aria-label={`${profile.node.portName} bunker profile`}
                style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '420px', backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)', zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: '-6px 0 32px rgba(0,0,0,0.45)' }}
            >
                <DrawerHeader node={profile.node} fuel={fuel} currency={currency} basis={basis} onClose={onClose} />

                <div role="tablist" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
                    {TAB_BTN('prices', 'Prices')}
                    {TAB_BTN('suppliers', `Suppliers (${profile.suppliers.length})`)}
                    {TAB_BTN('marketplace', 'Marketplace')}
                </div>

                {/* Open Full Profile link */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '5px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                    <button onClick={() => { onClose(); navigate(`/port/${profile.node.locode}?fuel=${fuel}&ccy=${currency}&basis=${basis}`); }}
                        style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                        Open Full Profile →
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: tab === 'marketplace' ? 'hidden' : 'auto' }}>
                    {tab === 'prices' && <PricesTab profile={profile} fuel={fuel} currency={currency} basis={basis} />}
                    {tab === 'suppliers' && <SuppliersTab profile={profile} />}
                    {tab === 'marketplace' && (
                        <MarketplaceTab
                            profile={profile}
                            fuel={fuel}
                            currency={currency}
                            basis={basis}
                            displayPrice={displayPrice}
                            onOpenTicket={handleOpenTicket}
                        />
                    )}
                </div>

                {profile.notes && profile.notes.length > 0 && (
                    <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(245,158,11,0.05)', flexShrink: 0 }}>
                        {profile.notes.map((n, i) => (
                            <div key={i} style={{ fontSize: '10px', color: '#f59e0b' }}>⚠ {n}</div>
                        ))}
                    </div>
                )}
            </div>

            {ticketDraft && <TradingTicket draft={ticketDraft} onClose={handleCloseTicket} />}
        </>
    );
};

export default BunkerProfileDrawer;
