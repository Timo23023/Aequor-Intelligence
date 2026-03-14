/**
 * ui/pages/MarketOverviewPage.tsx — Phase 9: URL-driven state spine
 * Global params (fuel/ccy/basis) + all filter dimensions ↔ URL.
 * sel=LOCODE persists selected row + Intel panel.
 * Filter writes debounced 200ms to URL.
 */
import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FuelProduct, Currency, PriceBasis, BunkerNode, Availability } from '../../domain/bunker/types';
import { listBunkerNodes, getBunkerProfile } from '../../services/BunkerService';
import { computeDisplayPrice, DisplayPrice } from '../../services/BunkerPricingService';
import { getLastUpdated, getDeliveryWindow } from '../../services/MarketIntelService';
import { parseGlobalParams, applyGlobalParams, needsCanonical, applyMarketFilters } from '../../services/AppStateService';
import CommandRail from '../components/bunker/CommandRail';
import FilterPanel, { FilterState } from '../components/market/FilterPanel';
import PortScreener, { ScreenerRow } from '../components/market/PortScreener';
import IntelPanel from '../components/market/IntelPanel';
import BunkerProfileDrawer from '../components/bunker/BunkerProfileDrawer';
import TradingTicket, { TicketDraft } from '../components/bunker/TradingTicket';

const MAPTILER_KEY = ((import.meta.env.VITE_MAPTILER_API_KEY as string) || '').trim();
const USE_MAPTILER = MAPTILER_KEY.length > 0;

const E_FUELS: FuelProduct[] = ['e_methanol', 'e_ammonia'];

// ── URL ↔ FilterState converters ─────────────────────────────────────────
function filterFromURL(sp: URLSearchParams): FilterState {
    const pipe = (key: string) => sp.get(key)?.split('|').filter(Boolean) ?? [];
    const csv = (key: string) => sp.get(key)?.split(',').filter(Boolean) ?? [];
    const q = pipe('q');
    return {
        filterAvail: q.includes('available'),
        filterHighConf: q.includes('conf75'),
        filterEFuels: q.includes('efuels'),
        filterRegions: csv('region'),
        filterAvailStatus: pipe('avail'),
        filterCIGrades: csv('ci'),
        filterMinSuppliers: parseInt(sp.get('minSup') ?? '0', 10) || 0,
        filterPriceMin: sp.get('priceMin') ?? '',
        filterPriceMax: sp.get('priceMax') ?? '',
        sortCol: sp.get('sort') ?? 'portName',
        sortDir: (sp.get('dir') === 'desc' ? 'desc' : 'asc'),
    };
}

function filterToURLParams(f: FilterState, sel: string): Record<string, string> {
    const q: string[] = [];
    if (f.filterAvail) q.push('available');
    if (f.filterHighConf) q.push('conf75');
    if (f.filterEFuels) q.push('efuels');
    const out: Record<string, string> = {
        q: q.join('|'),
        avail: f.filterAvailStatus.join('|'),
        region: f.filterRegions.join(','),
        ci: f.filterCIGrades.join(','),
        minSup: f.filterMinSuppliers > 0 ? String(f.filterMinSuppliers) : '',
        priceMin: f.filterPriceMin,
        priceMax: f.filterPriceMax,
        sort: f.sortCol !== 'portName' ? f.sortCol : '',
        dir: f.sortDir !== 'asc' ? f.sortDir : '',
        sel,
    };
    return out;
}

// ── Page ─────────────────────────────────────────────────────────────────
const MarketOverviewPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // ── Global params from URL ──────────────────────────────────────────
    const { fuel, currency, basis } = parseGlobalParams(searchParams);

    const setFuel = (f: FuelProduct) => setSearchParams(sp => applyGlobalParams(sp, { fuel: f, currency, basis }), { replace: true });
    const setCurrency = (c: Currency) => setSearchParams(sp => applyGlobalParams(sp, { fuel, currency: c, basis }), { replace: true });
    const setBasis = (b: PriceBasis) => setSearchParams(sp => applyGlobalParams(sp, { fuel, currency, basis: b }), { replace: true });

    // ── Filter state from URL (local mirror for immediate UI response) ──
    const [filters, setFilters] = useState<FilterState>(() => filterFromURL(searchParams));
    const [sortCol, setSortCol] = useState(() => searchParams.get('sort') ?? 'portName');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() => searchParams.get('dir') === 'desc' ? 'desc' : 'asc');
    const [selectedLocode, setSelectedLocode] = useState<string | null>(() => searchParams.get('sel') || null);

    // Drawer / ticket state
    const [drawerProfile, setDrawerProfile] = useState<ReturnType<typeof getBunkerProfile>>(null);
    const [ticketDraft, setTicketDraft] = useState<TicketDraft | null>(null);

    // Search ref for CommandRail
    const searchRef = useRef<HTMLInputElement>(null);
    const filterSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // All nodes
    const nodes = useMemo(() => listBunkerNodes(), []);

    // ── Ensure canonical global params on mount ─────────────────────────
    useEffect(() => {
        if (needsCanonical(searchParams)) {
            setSearchParams(sp => applyGlobalParams(sp, { fuel, currency, basis }), { replace: true });
        }
        // Restore sel= from URL into selectedLocode
        const sel = searchParams.get('sel');
        if (sel && !selectedLocode) setSelectedLocode(sel);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Debounced filter → URL sync ────────────────────────────────────
    useEffect(() => {
        if (filterSyncTimer.current) clearTimeout(filterSyncTimer.current);
        filterSyncTimer.current = setTimeout(() => {
            const params = filterToURLParams(filters, selectedLocode ?? '');
            setSearchParams(sp => {
                const next = new URLSearchParams(sp);
                for (const [k, v] of Object.entries(params)) {
                    if (v) next.set(k, v); else next.delete(k);
                }
                return next;
            }, { replace: true });
        }, 200);
        return () => { if (filterSyncTimer.current) clearTimeout(filterSyncTimer.current); };
    }, [filters, sortCol, sortDir, selectedLocode]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Display price map ──────────────────────────────────────────────
    const displayPriceMap = useMemo<Map<string, DisplayPrice | null>>(() => {
        const m = new Map<string, DisplayPrice | null>();
        for (const node of nodes) {
            const prof = getBunkerProfile(node.locode);
            m.set(node.locode, prof ? computeDisplayPrice(prof, fuel, currency, basis) : null);
        }
        return m;
    }, [nodes, fuel, currency, basis]);

    // ── Build screener rows ────────────────────────────────────────────
    const allRows = useMemo<ScreenerRow[]>(() => nodes.map(node => {
        const dp = displayPriceMap.get(node.locode) ?? null;
        const profile = getBunkerProfile(node.locode);
        const delivWindow = profile ? getDeliveryWindow(profile) : '—';
        const ciGrade = (node.ciGrade[fuel] ?? '—') as string;
        return {
            locode: node.locode, portName: node.portName, region: node.region,
            availability: node.availability[fuel] as Availability,
            confidenceScore: node.confidenceScore, confidenceLabel: node.confidenceLabel,
            ciGrade, avgPrice: dp?.avg ?? 0, priceLow: dp?.low ?? 0, priceHigh: dp?.high ?? 0,
            currency, suppliers: profile?.suppliers.length ?? 0, deliveryWindow: delivWindow,
            lastUpdated: getLastUpdated(node.locode), fuel,
        };
    }), [nodes, displayPriceMap, fuel, currency]);

    // ── Apply filters ──────────────────────────────────────────────────
    const filteredRows = useMemo<ScreenerRow[]>(() => {
        let rows = [...allRows];
        if (filters.filterAvail) rows = rows.filter(r => r.availability === 'available');
        if (filters.filterHighConf) rows = rows.filter(r => r.confidenceScore >= 75);
        if (filters.filterEFuels) {
            if (!E_FUELS.includes(fuel)) rows = [];
            else rows = rows.filter(r => r.availability !== 'unknown' && r.availability !== 'planned');
        }
        if (filters.filterRegions.length) rows = rows.filter(r => filters.filterRegions.includes(r.region));
        if (filters.filterAvailStatus.length) rows = rows.filter(r => filters.filterAvailStatus.includes(r.availability));
        if (filters.filterCIGrades.length) rows = rows.filter(r => filters.filterCIGrades.includes(r.ciGrade));
        if (filters.filterMinSuppliers > 0) rows = rows.filter(r => r.suppliers >= filters.filterMinSuppliers);
        if (filters.filterPriceMin !== '') rows = rows.filter(r => r.avgPrice >= Number(filters.filterPriceMin));
        if (filters.filterPriceMax !== '') rows = rows.filter(r => r.avgPrice > 0 && r.avgPrice <= Number(filters.filterPriceMax));
        return rows;
    }, [allRows, filters, fuel]);

    // ── Apply sort ─────────────────────────────────────────────────────
    const sortedRows = useMemo<ScreenerRow[]>(() => {
        const dir = sortDir === 'asc' ? 1 : -1;
        return [...filteredRows].sort((a, b) => {
            const va = (a as unknown as Record<string, unknown>)[sortCol];
            const vb = (b as unknown as Record<string, unknown>)[sortCol];
            if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
            return String(va ?? '').localeCompare(String(vb ?? '')) * dir;
        });
    }, [filteredRows, sortCol, sortDir]);

    const handleSort = useCallback((col: string) => {
        const newDir = col === sortCol ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
        setSortDir(newDir);
        setSortCol(col);
        // Immediately update filter state too so debounce picks it up
        setFilters(f => ({ ...f, sortCol: col, sortDir: newDir }));
    }, [sortCol, sortDir]);

    const handleFilterChange = useCallback((next: FilterState) => {
        setFilters(next);
        setSortCol(next.sortCol);
        setSortDir(next.sortDir);
    }, []);

    // ── Selected port ──────────────────────────────────────────────────
    const selectedProfile = selectedLocode ? getBunkerProfile(selectedLocode) : null;
    const selectedDisplayPrice = selectedLocode ? (displayPriceMap.get(selectedLocode) ?? null) : null;

    const handleSelectPort = useCallback((locode: string) => {
        setSelectedLocode(l => l === locode ? null : locode);
    }, []);

    const handleSearchSelect = useCallback((node: BunkerNode) => {
        setSelectedLocode(node.locode);
        // Also navigate if we're in /market — sel param will be synced via debounce
        searchRef.current?.blur();
    }, []);

    const handleOpenDrawer = useCallback(() => {
        if (selectedLocode) setDrawerProfile(getBunkerProfile(selectedLocode));
    }, [selectedLocode]);

    const handleOpenTicket = useCallback(() => {
        if (!selectedProfile || !selectedLocode) return;
        const dp = selectedDisplayPrice;
        const avgP = dp?.avg ?? 0;
        const today = new Date();
        const fmt8 = (d: Date) => d.toISOString().slice(0, 10);
        const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
        const draft: TicketDraft = {
            side: 'bid', price: avgP > 0 ? (avgP * 0.98).toFixed(1) : '',
            volumeMt: '2000', currency, basis,
            deliveryFrom: fmt8(addDays(today, 7)), deliveryTo: fmt8(addDays(today, 14)),
            portLocode: selectedLocode, portName: selectedProfile.node.portName,
            fuel, prefillSource: 'calculated',
        };
        setTicketDraft(draft);
    }, [selectedProfile, selectedLocode, selectedDisplayPrice, currency, basis, fuel]);

    // Copy share link — window.location.href already has all URL params
    const handleCopyShareLink = useCallback(() => {
        navigator.clipboard.writeText(window.location.href);
    }, []);

    // ── Hotkeys ────────────────────────────────────────────────────────
    useEffect(() => {
        const FUELS: Record<string, FuelProduct> = { '1': 'e_methanol', '2': 'e_ammonia', '3': 'vlsfo', '4': 'mgo' };
        const handler = (ev: KeyboardEvent) => {
            const tag = (ev.target as HTMLElement).tagName;
            if (ev.key === '/' && tag !== 'INPUT') { ev.preventDefault(); searchRef.current?.focus(); return; }
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
            if (FUELS[ev.key]) { setFuel(FUELS[ev.key]); return; }
            if (ev.key.toLowerCase() === 'u') { setCurrency('USD'); return; }
            if (ev.key.toLowerCase() === 'e') { setCurrency('EUR'); return; }
            if (ev.key.toLowerCase() === 'p') { setBasis('posted'); return; }
            if (ev.key.toLowerCase() === 'd') { setBasis('dap'); return; }
            if (ev.key === 'Escape') { setTicketDraft(null); setDrawerProfile(null); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [fuel, currency, basis]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
            {/* ── CommandRail ── */}
            <CommandRail
                selectedFuel={fuel} selectedCurrency={currency}
                selectedBasis={basis} filterAvail={filters.filterAvail}
                filterHighConf={filters.filterHighConf} filterEFuels={filters.filterEFuels}
                compareMode={false} useMaptiler={USE_MAPTILER}
                filteredCount={sortedRows.length} totalCount={nodes.length}
                guidedDemoOpen={false} nodes={nodes}
                searchRef={searchRef as React.RefObject<HTMLInputElement>}
                onFuelChange={setFuel} onCurrencyChange={setCurrency}
                onBasisChange={setBasis}
                onFilterAvail={() => setFilters(f => ({ ...f, filterAvail: !f.filterAvail }))}
                onFilterHighConf={() => setFilters(f => ({ ...f, filterHighConf: !f.filterHighConf }))}
                onFilterEFuels={() => setFilters(f => ({ ...f, filterEFuels: !f.filterEFuels }))}
                onCompareToggle={() => navigate('/compare')}
                onSearchSelect={handleSearchSelect}
                onGuidedDemo={() => { }}
                onCopyShareLink={handleCopyShareLink}
            />

            {/* ── 3-column body ── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* LEFT: filters */}
                <FilterPanel state={{ ...filters, sortCol, sortDir }} onChange={handleFilterChange} />

                {/* CENTER: screener */}
                <PortScreener
                    rows={sortedRows} selectedLocode={selectedLocode}
                    onSelect={handleSelectPort} sortCol={sortCol} sortDir={sortDir}
                    onSort={handleSort}
                />

                {/* RIGHT: intel panel */}
                <IntelPanel
                    profile={selectedProfile} fuel={fuel} currency={currency} basis={basis}
                    displayPrice={selectedDisplayPrice}
                    onOpenDrawer={handleOpenDrawer} onOpenTicket={handleOpenTicket}
                />
            </div>

            {/* ── Drawer ── */}
            {drawerProfile && (
                <BunkerProfileDrawer
                    profile={drawerProfile} fuel={fuel} currency={currency} basis={basis}
                    onClose={() => setDrawerProfile(null)}
                />
            )}

            {/* ── Trading ticket ── */}
            {ticketDraft && (
                <TradingTicket draft={ticketDraft} onClose={() => setTicketDraft(null)} />
            )}
        </div>
    );
};

export default MarketOverviewPage;
