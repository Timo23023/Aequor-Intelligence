/**
 * ui/pages/EFuelMapPage.tsx — Phase 5
 * TerminalHeader, Guided Demo overlay, URL ?port= deep-link, compare swap.
 */
import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FuelProduct, Currency, PriceBasis, BunkerNode, Availability } from '../../domain/bunker/types';
import { listBunkerNodes, getBunkerProfile } from '../../services/BunkerService';
import { computeDisplayPrice, DisplayPrice } from '../../services/BunkerPricingService';
import { parseGlobalParams, applyGlobalParams, needsCanonical } from '../../services/AppStateService';
import BunkerMapCanvas from '../components/bunker/BunkerMapCanvas';
import BunkerHoverCard from '../components/bunker/BunkerHoverCard';
import BunkerProfileDrawer from '../components/bunker/BunkerProfileDrawer';
import BunkerMapMapLibre, { BunkerMarkerProps } from '../components/bunker/BunkerMapMapLibre';
import CommandRail from '../components/bunker/CommandRail';
import ComparePanel from '../components/bunker/ComparePanel';

// ---------------------------------------------------------------------------
const MAPTILER_KEY = ((import.meta.env.VITE_MAPTILER_API_KEY as string) || '').trim();
const USE_MAPTILER = MAPTILER_KEY.length > 0;

const E_FUELS: FuelProduct[] = ['e_methanol', 'e_ammonia'];

// ---------------------------------------------------------------------------
// Guided Demo steps
// ---------------------------------------------------------------------------
const DEMO_STEPS = [
    { step: 1, text: 'Press / and search "Rotterdam" — map flies to the port' },
    { step: 2, text: 'Click any port dot → open Bunker Profile (Prices tab)' },
    { step: 3, text: 'Open Marketplace tab → click an order row → Trading Ticket' },
    { step: 4, text: 'Toggle Compare → click 2 ports → side-by-side analysis' },
];

const GuidedDemo: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const [idx, setIdx] = useState(0);
    const s = DEMO_STEPS[idx];
    return (
        <div style={{ position: 'absolute', top: '90px', left: '50%', transform: 'translateX(-50%)', zIndex: 90, pointerEvents: 'auto', backgroundColor: 'rgba(9,13,23,0.97)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '10px', padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.55)', minWidth: '320px', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#d97706', letterSpacing: '0.1em' }}>GUIDED DEMO — STEP {s.step} / {DEMO_STEPS.length}</span>
                <button onClick={onExit} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '12px' }}>✕ Exit</button>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', lineHeight: 1.4 }}>{s.text}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* Step dots */}
                <div style={{ display: 'flex', gap: '5px' }}>
                    {DEMO_STEPS.map((_, i) => (
                        <div key={i} onClick={() => setIdx(i)} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: i === idx ? '#f59e0b' : 'rgba(255,255,255,0.15)', cursor: 'pointer', transition: 'background 0.15s' }} />
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button disabled={idx === 0} onClick={() => setIdx(i => i - 1)} style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 600, background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: idx === 0 ? 'rgba(255,255,255,0.2)' : 'var(--text-secondary)', borderRadius: '4px', cursor: idx === 0 ? 'default' : 'pointer' }}>← Prev</button>
                    {idx < DEMO_STEPS.length - 1
                        ? <button onClick={() => setIdx(i => i + 1)} style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', cursor: 'pointer' }}>Next →</button>
                        : <button onClick={onExit} style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', cursor: 'pointer' }}>✓ Done</button>
                    }
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
const EFuelMapPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { fuel: selectedFuel, currency: selectedCurrency, basis: selectedBasis } = parseGlobalParams(searchParams);

    const setSelectedFuel = (f: FuelProduct) => setSearchParams(sp => applyGlobalParams(sp, { fuel: f, currency: selectedCurrency, basis: selectedBasis }), { replace: true });
    const setSelectedCurrency = (c: Currency) => setSearchParams(sp => applyGlobalParams(sp, { fuel: selectedFuel, currency: c, basis: selectedBasis }), { replace: true });
    const setSelectedBasis = (b: PriceBasis) => setSearchParams(sp => applyGlobalParams(sp, { fuel: selectedFuel, currency: selectedCurrency, basis: b }), { replace: true });

    // Interaction
    const [hoveredNode, setHoveredNode] = useState<BunkerNode | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [selectedNode, setSelectedNode] = useState<BunkerNode | null>(null);

    // Search + flyTo
    const searchRef = useRef<HTMLInputElement>(null);
    const [flyToTarget, setFlyToTarget] = useState<{ lon: number; lat: number } | null>(null);

    // Compare
    const [compareMode, setCompareMode] = useState(false);
    const [compareA, setCompareA] = useState<BunkerNode | null>(null);
    const [compareB, setCompareB] = useState<BunkerNode | null>(null);

    // Fast filters
    const [filterAvail, setFilterAvail] = useState(false);
    const [filterHighConf, setFilterHighConf] = useState(false);
    const [filterEFuels, setFilterEFuels] = useState(false);

    // Guided demo
    const [demoOpen, setDemoOpen] = useState(false);

    // Data
    const nodes = useMemo(() => listBunkerNodes(), []);
    const nodeMap = useMemo(() => {
        const m = new Map<string, BunkerNode>();
        nodes.forEach(n => m.set(n.locode, n));
        return m;
    }, [nodes]);

    // URL deep-link: ?port=LOCODE on mount; also ensure canonical global params
    useEffect(() => {
        if (needsCanonical(searchParams)) {
            setSearchParams(sp => applyGlobalParams(sp, { fuel: selectedFuel, currency: selectedCurrency, basis: selectedBasis }), { replace: true });
        }
        const port = searchParams.get('port')?.toUpperCase();
        if (!port) return;
        const allNodes = listBunkerNodes();
        const node = allNodes.find(n => n.locode === port);
        if (node) { setSelectedNode(node); setFlyToTarget({ lon: node.lon, lat: node.lat }); }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const displayPriceMap = useMemo<Map<string, DisplayPrice | null>>(() => {
        const m = new Map<string, DisplayPrice | null>();
        for (const node of nodes) {
            const prof = getBunkerProfile(node.locode);
            m.set(node.locode, prof ? computeDisplayPrice(prof, selectedFuel, selectedCurrency, selectedBasis) : null);
        }
        return m;
    }, [nodes, selectedFuel, selectedCurrency, selectedBasis]);

    const getDisplayPrice = useCallback((locode: string): DisplayPrice | null => displayPriceMap.get(locode) ?? null, [displayPriceMap]);

    const compareLabelMap = useMemo(() => {
        const m = new Map<string, '' | 'A' | 'B'>();
        if (compareA) m.set(compareA.locode, 'A');
        if (compareB) m.set(compareB.locode, 'B');
        return m;
    }, [compareA, compareB]);

    const mlMarkers = useMemo<BunkerMarkerProps[]>(() =>
        nodes.map(n => {
            const dp = displayPriceMap.get(n.locode) ?? null;
            const avail: Availability = n.availability[selectedFuel];
            return {
                locode: n.locode, portName: n.portName, region: n.region,
                lat: n.lat, lon: n.lon, availability: avail,
                confidenceScore: n.confidenceScore, confidenceLabel: n.confidenceLabel,
                ciGrade: String(n.ciGrade[selectedFuel] ?? '—'),
                priceAvg: dp?.avg ?? 0, priceLow: dp?.low ?? 0, priceHigh: dp?.high ?? 0,
                unit: dp?.unit ?? 'mt', asOf: dp?.asOf ?? '',
                selectedFuel, currency: selectedCurrency, basis: selectedBasis,
                hasPrice: dp !== null, compareLabel: compareLabelMap.get(n.locode) ?? '',
            };
        }),
        [nodes, displayPriceMap, selectedFuel, selectedCurrency, selectedBasis, compareLabelMap]);

    const filteredMarkers = useMemo(() => mlMarkers.filter(m => {
        if (filterAvail && m.availability !== 'available') return false;
        if (filterHighConf && m.confidenceScore < 75) return false;
        if (filterEFuels) {
            if (!E_FUELS.includes(selectedFuel)) return false;
            if (m.availability === 'unknown' || m.availability === 'planned') return false;
        }
        return true;
    }), [mlMarkers, filterAvail, filterHighConf, filterEFuels, selectedFuel]);

    const selectedProfile = selectedNode ? getBunkerProfile(selectedNode.locode) : null;
    const compareProfileA = compareA ? getBunkerProfile(compareA.locode) : null;
    const compareProfileB = compareB ? getBunkerProfile(compareB.locode) : null;

    // Handlers
    const handleHover = useCallback((node: BunkerNode | null, x: number, y: number) => {
        setHoveredNode(node); if (node) setMousePos({ x, y });
    }, []);

    const handleNodeClick = useCallback((node: BunkerNode) => {
        if (compareMode) {
            if (!compareA) { setCompareA(node); return; }
            if (!compareB && node.locode !== compareA.locode) { setCompareB(node); return; }
            setCompareA(node); setCompareB(null); return;
        }
        setSelectedNode(prev => prev?.locode === node.locode ? null : node);
        setHoveredNode(null);
    }, [compareMode, compareA, compareB]);

    const handleMlHover = useCallback((_l: string, _p: BunkerMarkerProps, x: number, y: number) => {
        const node = nodeMap.get(_l) ?? null;
        setHoveredNode(node); if (node) setMousePos({ x, y });
    }, [nodeMap]);
    const handleMlLeave = useCallback(() => setHoveredNode(null), []);
    const handleMlClick = useCallback((_l: string, p: BunkerMarkerProps) => {
        const node = nodeMap.get(p.locode);
        if (node) handleNodeClick(node);
    }, [nodeMap, handleNodeClick]);

    const handleClose = useCallback(() => setSelectedNode(null), []);

    const handleSearchSelect = useCallback((node: BunkerNode) => {
        if (compareMode) { handleNodeClick(node); return; }
        setFlyToTarget({ lon: node.lon, lat: node.lat });
        setSelectedNode(node); setHoveredNode(null);
    }, [compareMode, handleNodeClick]);

    const handleCompareToggle = useCallback(() => {
        setCompareMode(m => { if (m) { setCompareA(null); setCompareB(null); } return !m; });
    }, []);

    const handleSwap = useCallback(() => {
        setCompareA(compareB);
        setCompareB(compareA);
    }, [compareA, compareB]);

    // Global hotkeys
    useEffect(() => {
        const FUELS: Record<string, FuelProduct> = { '1': 'e_methanol', '2': 'e_ammonia', '3': 'vlsfo', '4': 'mgo' };
        const CCYS: Record<string, Currency> = { u: 'USD', e: 'EUR' };
        const BASES: Record<string, PriceBasis> = { p: 'posted', d: 'dap' };

        const handler = (ev: KeyboardEvent) => {
            const tag = (ev.target as HTMLElement).tagName;
            if (ev.key === '/' && tag !== 'INPUT') { ev.preventDefault(); searchRef.current?.focus(); return; }
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
            if (FUELS[ev.key]) { setSelectedFuel(FUELS[ev.key]); return; }
            if (CCYS[ev.key.toLowerCase()]) { setSelectedCurrency(CCYS[ev.key.toLowerCase()]); return; }
            if (BASES[ev.key.toLowerCase()]) { setSelectedBasis(BASES[ev.key.toLowerCase()]); return; }
            if (ev.key === 'Escape' && !selectedNode && compareMode) {
                setCompareMode(false); setCompareA(null); setCompareB(null);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedNode, compareMode]);

    return (
        <div style={{ position: 'relative', height: '100vh', width: '100%', backgroundColor: '#08111f', overflow: 'hidden' }}>

            {/* ── Command Rail ──────────────────────────────────────────────── */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: selectedNode ? '420px' : 0, zIndex: 50 }}>
                <CommandRail
                    selectedFuel={selectedFuel} selectedCurrency={selectedCurrency}
                    selectedBasis={selectedBasis} filterAvail={filterAvail}
                    filterHighConf={filterHighConf} filterEFuels={filterEFuels}
                    compareMode={compareMode} useMaptiler={USE_MAPTILER}
                    filteredCount={filteredMarkers.length} totalCount={nodes.length}
                    guidedDemoOpen={demoOpen} nodes={nodes}
                    searchRef={searchRef as React.RefObject<HTMLInputElement>}
                    onFuelChange={setSelectedFuel} onCurrencyChange={setSelectedCurrency}
                    onBasisChange={setSelectedBasis} onFilterAvail={() => setFilterAvail(f => !f)}
                    onFilterHighConf={() => setFilterHighConf(f => !f)}
                    onFilterEFuels={() => setFilterEFuels(f => !f)}
                    onCompareToggle={handleCompareToggle}
                    onSearchSelect={handleSearchSelect}
                    onGuidedDemo={() => setDemoOpen(d => !d)}
                    onCopyShareLink={() => navigator.clipboard.writeText(window.location.href)}
                />
            </div>

            {/* ── SVG fallback banner ──────────────────────────────────────── */}
            {!USE_MAPTILER && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 60, padding: '6px 16px', fontSize: '11px', backgroundColor: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', textAlign: 'center' }}>
                    ⚠ No MapTiler key — SVG map active. Set <strong>VITE_MAPTILER_API_KEY</strong>.
                </div>
            )}

            {/* ── Map ─────────────────────────────────────────────────────── */}
            {USE_MAPTILER ? (
                <BunkerMapMapLibre apiKey={MAPTILER_KEY} markers={filteredMarkers} flyToTarget={flyToTarget}
                    onHover={handleMlHover} onLeave={handleMlLeave} onClick={handleMlClick} />
            ) : (
                <BunkerMapCanvas nodes={nodes} getDisplayPrice={getDisplayPrice}
                    selectedFuel={selectedFuel} selectedNode={selectedNode}
                    onHover={handleHover} onClick={handleNodeClick} />
            )}

            {/* ── Hover Card ───────────────────────────────────────────────── */}
            {hoveredNode && !selectedNode && !compareMode && (
                <BunkerHoverCard node={hoveredNode} displayPrice={getDisplayPrice(hoveredNode.locode)}
                    fuel={selectedFuel} currency={selectedCurrency} basis={selectedBasis} position={mousePos} />
            )}

            {/* ── Profile Drawer ───────────────────────────────────────────── */}
            {selectedNode && selectedProfile && (
                <BunkerProfileDrawer profile={selectedProfile} fuel={selectedFuel}
                    currency={selectedCurrency} basis={selectedBasis} onClose={handleClose} />
            )}

            {/* ── Compare Panel ────────────────────────────────────────────── */}
            {compareMode && (
                <ComparePanel
                    nodeA={compareA} nodeB={compareB}
                    profileA={compareProfileA} profileB={compareProfileB}
                    fuel={selectedFuel} currency={selectedCurrency} basis={selectedBasis}
                    onOpenA={() => { if (compareA) { setSelectedNode(compareA); setCompareMode(false); } }}
                    onOpenB={() => { if (compareB) { setSelectedNode(compareB); setCompareMode(false); } }}
                    onClear={() => { setCompareMode(false); setCompareA(null); setCompareB(null); }}
                    onSwap={handleSwap}
                />
            )}

            {/* ── Guided Demo ──────────────────────────────────────────────── */}
            {demoOpen && <GuidedDemo onExit={() => setDemoOpen(false)} />}
        </div>
    );
};

export default EFuelMapPage;
