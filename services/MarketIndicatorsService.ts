/**
 * services/MarketIndicatorsService.ts
 * Deterministic seeded market indicators service.
 * No external APIs — all data generated from stable hash functions.
 * Phase 12: supports Series, Deltas, Narratives, FX, Volatility.
 *
 * BDI note: Since 2018, BDI is composed of Capesize/Panamax/Supramax only.
 * Baltic Handysize (BHSI) is a separate standalone benchmark index.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IndicatorCategory = 'Freight' | 'Bunker' | 'Commodity' | 'Energy' | 'Macro';
export type VolatilityLevel = 'low' | 'med' | 'high';

export interface IndicatorMeta {
    id: string;
    name: string;
    shortName: string;
    category: IndicatorCategory;
    unit: string;
    source: string;
    sourceNote: string;
    /** locode this indicator maps to (for Port Terminal link), if applicable */
    locodeMap?: string;
    /** fuel product match for CommandRail context */
    fuelMatch?: string;
    baseValue: number;
}

export interface SeriesPoint {
    date: string;     // ISO date string
    value: number;
}

export interface DeltaResult {
    abs: number;
    pct: number;
}

export interface Deltas {
    d1: DeltaResult;
    d7: DeltaResult;
    d30: DeltaResult;
}

export interface WhatChangedItem {
    id: string;
    message: string;
    delta: 'positive' | 'negative' | 'neutral';
    timestamp: string;
}

export interface IndicatorNarrative {
    methodology: string;
    whyItMatters: string[];
    disclaimer: string;
}

// ---------------------------------------------------------------------------
// Indicator definitions
// ---------------------------------------------------------------------------

const INDICATORS: IndicatorMeta[] = [
    // Freight
    {
        id: 'bdi', name: 'Baltic Dry Index', shortName: 'BDI',
        category: 'Freight', unit: 'Points',
        source: 'Baltic Exchange', sourceNote: 'Composite of Capesize, Panamax & Supramax TCE assessments (post-2018 reweighting).',
        baseValue: 1540,
    },
    {
        id: 'bci', name: 'Baltic Capesize Index', shortName: 'BCI',
        category: 'Freight', unit: 'Points',
        source: 'Baltic Exchange', sourceNote: 'Capesize time-charter assessment benchmark.',
        baseValue: 1850,
    },
    {
        id: 'bpi', name: 'Baltic Panamax Index', shortName: 'BPI',
        category: 'Freight', unit: 'Points',
        source: 'Baltic Exchange', sourceNote: 'Panamax time-charter assessment benchmark.',
        baseValue: 1420,
    },
    {
        id: 'bsi', name: 'Baltic Supramax Index', shortName: 'BSI',
        category: 'Freight', unit: 'Points',
        source: 'Baltic Exchange', sourceNote: 'Supramax time-charter assessment benchmark.',
        baseValue: 1050,
    },
    {
        id: 'bhsi', name: 'Baltic Handysize Index', shortName: 'BHSI',
        category: 'Freight', unit: 'Points',
        source: 'Baltic Exchange', sourceNote: 'Handysize standalone benchmark (not part of BDI composition since 2018).',
        baseValue: 680,
    },
    // Bunker
    {
        id: 'vlsfo_rtm', name: 'VLSFO Rotterdam', shortName: 'VLSFO RTM',
        category: 'Bunker', unit: 'USD/mt',
        source: 'Port Assessment', sourceNote: 'Indicative benchmark assessment — not a live price feed (demo data).',
        locodeMap: 'NLRTM', fuelMatch: 'vlsfo',
        baseValue: 580.50,
    },
    {
        id: 'vlsfo_sin', name: 'VLSFO Singapore', shortName: 'VLSFO SIN',
        category: 'Bunker', unit: 'USD/mt',
        source: 'Port Assessment', sourceNote: 'Indicative benchmark assessment — not a live price feed (demo data).',
        locodeMap: 'SGSIN', fuelMatch: 'vlsfo',
        baseValue: 610.25,
    },
    {
        id: 'lsmgo_rtm', name: 'LSMGO Rotterdam', shortName: 'LSMGO RTM',
        category: 'Bunker', unit: 'USD/mt',
        source: 'Port Assessment', sourceNote: 'Indicative benchmark assessment — not a live price feed (demo data).',
        locodeMap: 'NLRTM', fuelMatch: 'mgo',
        baseValue: 820.00,
    },
    {
        id: 'lsmgo_sin', name: 'LSMGO Singapore', shortName: 'LSMGO SIN',
        category: 'Bunker', unit: 'USD/mt',
        source: 'Port Assessment', sourceNote: 'Indicative benchmark assessment — not a live price feed (demo data).',
        locodeMap: 'SGSIN', fuelMatch: 'mgo',
        baseValue: 845.50,
    },
    // Commodity / Energy
    {
        id: 'brent', name: 'Brent Crude', shortName: 'Brent',
        category: 'Commodity', unit: 'USD/bbl',
        source: 'Exchange Proxy', sourceNote: 'Indicative proxy — not ICE live data (demo only).',
        baseValue: 88.50,
    },
    {
        id: 'ttf', name: 'TTF Natural Gas', shortName: 'TTF',
        category: 'Energy', unit: 'EUR/MWh',
        source: 'Exchange Proxy', sourceNote: 'Indicative proxy — not TTF live data (demo only).',
        baseValue: 34.20,
    },
    {
        id: 'lng_spot', name: 'LNG Spot Asia', shortName: 'LNG Asia',
        category: 'Energy', unit: 'USD/MMBtu',
        source: 'Spot Proxy', sourceNote: 'Indicative Asian LNG spot proxy — not a live benchmark (demo only).',
        baseValue: 11.80,
    },
];

// ---------------------------------------------------------------------------
// Deterministic hash / LCG PRNG
// ---------------------------------------------------------------------------

function hash32(str: string): number {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
    }
    return h;
}

/** Linear Congruential Generator seeded deterministically */
function lcg(seed: number) {
    let s = seed >>> 0;
    return () => {
        s = Math.imul(s, 1664525) + 1013904223;
        s = s >>> 0;
        return s / 4294967296;
    };
}

// Reference epoch for date calculations
const REF_DATE = new Date('2026-03-01T00:00:00Z');
const REF_MS = REF_DATE.getTime();

function dateFromOffset(daysAgo: number): string {
    const d = new Date(REF_MS - daysAgo * 86_400_000);
    return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Series generation
// ---------------------------------------------------------------------------

const RANGE_DAYS: Record<string, number> = { '1M': 30, '3M': 90, '1Y': 365 };

/**
 * Generate a deterministic time series for `range` days.
 * Uses a GBM-like daily walk seeded per indicator ID.
 */
export function getIndicatorSeries(id: string, range: '1M' | '3M' | '1Y' = '3M'): SeriesPoint[] {
    const meta = INDICATORS.find(i => i.id === id);
    if (!meta) return [];
    const days = RANGE_DAYS[range] ?? 90;
    const prng = lcg(hash32(id + range));
    // volatility per day (1–3% for indices, 0.4–0.8% for monetary)
    const isMonetary = meta.unit.startsWith('USD') || meta.unit.startsWith('EUR');
    const dailySigma = isMonetary ? 0.006 : 0.014;
    // trend drift (slightly positive for freight, slightly negative for energy)
    const drift = meta.category === 'Freight' ? 0.0005
        : meta.category === 'Energy' ? -0.0003
            : 0.0001;

    const pts: SeriesPoint[] = [];
    let v = meta.baseValue * (0.88 + prng() * 0.24); // start offset
    for (let i = days; i >= 0; i--) {
        const r = prng() * 2 - 1; // [-1, 1]
        v = v * (1 + drift + dailySigma * r);
        if (v <= 0) v = meta.baseValue * 0.5;
        pts.push({ date: dateFromOffset(i), value: Math.round(v * 100) / 100 });
    }
    return pts;
}

// ---------------------------------------------------------------------------
// Latest value + delta computation
// ---------------------------------------------------------------------------

export function getLatestValue(series: SeriesPoint[]): number {
    return series[series.length - 1]?.value ?? 0;
}

export function computeDeltas(series: SeriesPoint[]): Deltas {
    const last = series.length;
    const v = (offset: number) => series[Math.max(0, last - 1 - offset)]?.value ?? 0;
    const current = v(0);
    const d1 = current - v(1);
    const d7 = current - v(7);
    const d30 = current - v(30);
    const safeDiv = (a: number, b: number) => b !== 0 ? a / b : 0;
    return {
        d1: { abs: d1, pct: safeDiv(d1, v(1)) * 100 },
        d7: { abs: d7, pct: safeDiv(d7, v(7)) * 100 },
        d30: { abs: d30, pct: safeDiv(d30, v(30)) * 100 },
    };
}

export function deriveVolatility(series: SeriesPoint[]): VolatilityLevel {
    if (series.length < 7) return 'low';
    const slice = series.slice(-30);
    const vals = slice.map(p => p.value);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length;
    const cv = Math.sqrt(variance) / mean; // coefficient of variation
    if (cv > 0.08) return 'high';
    if (cv > 0.04) return 'med';
    return 'low';
}

// ---------------------------------------------------------------------------
// FX transform for bunker prices (USD → EUR deterministic rate)
// ---------------------------------------------------------------------------

const EUR_USD_RATE = 1.085; // deterministic demo rate

export function applyFX(value: number, unit: string, currency: 'USD' | 'EUR'): { value: number; unit: string } {
    if (currency === 'EUR' && unit.startsWith('USD')) {
        return { value: Math.round((value / EUR_USD_RATE) * 100) / 100, unit: unit.replace('USD', 'EUR') };
    }
    return { value, unit };
}

// ---------------------------------------------------------------------------
// What Changed feed (deterministic, per indicator)
// ---------------------------------------------------------------------------

const FREIGHT_CHANGES = [
    { message: 'Capesize fleet utilisation reached 78% (4-week high)', delta: 'positive' as const },
    { message: 'Brazilian iron ore export volumes beat estimates', delta: 'positive' as const },
    { message: 'Pacific grain demand driving Panamax fixtures higher', delta: 'positive' as const },
    { message: 'China steel mill restocking phase extended by 2 weeks', delta: 'positive' as const },
    { message: 'Coal demand from India elevated, absorbing Handy tonnage', delta: 'positive' as const },
    { message: 'Atlantic fleet congestion easing faster than forecast', delta: 'positive' as const },
    { message: 'Vessel scrapping pace slowed — fleet supply steady', delta: 'neutral' as const },
    { message: 'Q2 newbuild deliveries forecast slightly above market expectations', delta: 'negative' as const },
    { message: 'Grain season winding down — activity softening at key routes', delta: 'negative' as const },
    { message: 'Chinese steel imports declined month-on-month', delta: 'negative' as const },
    { message: 'Fleet repositioning adding idle days at key anchorages', delta: 'negative' as const },
    { message: 'Index rebalancing applied — methodology unchanged', delta: 'neutral' as const },
];

const BUNKER_CHANGES = [
    { message: 'Crude complex pushed marine fuel higher — refinery margin wide', delta: 'positive' as const },
    { message: 'Regional supply tightness at ARA warehouse stocks', delta: 'positive' as const },
    { message: 'Rotterdam availability firm — operator restocking complete', delta: 'positive' as const },
    { message: 'Brent rally (+$2.3/bbl) lifted crack spread assumptions', delta: 'positive' as const },
    { message: 'Vessel demand elevated — container segment lifted large stems', delta: 'positive' as const },
    { message: 'Refinery run cut in NW Europe tightening distillate supply', delta: 'negative' as const },
    { message: 'VLSFO crack narrowing as crude outpaced products', delta: 'negative' as const },
    { message: 'Singapore inventory build (MASMA data) suggests softening', delta: 'negative' as const },
    { message: 'Crude drop absorbed — bunker lagged, narrowing premium', delta: 'neutral' as const },
    { message: 'Benchmark assessment methodology note: indicative demo data', delta: 'neutral' as const },
];

const ENERGY_CHANGES = [
    { message: 'LNG demand recovery in Europe lifted gas complex broadly', delta: 'positive' as const },
    { message: 'US LNG export volumes at record levels — supply tightening', delta: 'positive' as const },
    { message: 'Norwegian pipeline maintenance extended (1 week delay)', delta: 'negative' as const },
    { message: 'Mild weather forecast reducing European gas demand pressure', delta: 'negative' as const },
    { message: 'OPEC+ voluntary cut compliance maintained at 95%', delta: 'positive' as const },
    { message: 'Geopolitical risk premium partially unwound', delta: 'neutral' as const },
    { message: 'EIA inventory draw below consensus — crude supported', delta: 'positive' as const },
    { message: 'Asian LNG demand dip ahead of shoulder season', delta: 'negative' as const },
    { message: 'Spot cargo overhang building in Atlantic basin', delta: 'negative' as const },
    { message: 'Price proxy — not live exchange data (demo note)', delta: 'neutral' as const },
];

export function getWhatChanged(id: string): WhatChangedItem[] {
    const meta = INDICATORS.find(i => i.id === id);
    if (!meta) return [];
    const pool = meta.category === 'Freight' ? FREIGHT_CHANGES
        : meta.category === 'Bunker' ? BUNKER_CHANGES
            : ENERGY_CHANGES;
    const h = hash32(id);
    const count = 3 + (h % 4); // 3–6
    const used = new Set<number>();
    const items: WhatChangedItem[] = [];
    for (let i = 0; i < count; i++) {
        let idx = (h + i * 7) % pool.length;
        while (used.has(idx)) idx = (idx + 1) % pool.length;
        used.add(idx);
        const tmpl = pool[idx];
        const hoursAgo = 2 + ((hash32(id + i) % 48));
        const ts = new Date(REF_MS - hoursAgo * 3_600_000).toISOString();
        items.push({ id: `${id}-chg-${i}`, message: tmpl.message, delta: tmpl.delta, timestamp: ts });
    }
    return items;
}

// ---------------------------------------------------------------------------
// Narratives
// ---------------------------------------------------------------------------

const NARRATIVES: Record<string, IndicatorNarrative> = {
    bdi: {
        methodology: 'The Baltic Dry Index (BDI) is a composite assessment of Capesize, Panamax, and Supramax time-charter rates, reweighted since 2018. Published daily by the Baltic Exchange (London). Represents the cost of chartering ships to carry dry bulk cargo globally.',
        whyItMatters: ['Key leading indicator of global trade activity and commodity flows.', 'Drives bunker demand expectations — high BDI implies strong vessel fuel consumption.', 'Used by shipping operators, commodity traders, and macro analysts.'],
        disclaimer: 'Demo data only — not a live Baltic Exchange feed.',
    },
    bci: {
        methodology: 'Baltic Capesize Index (BCI): assessment of time-charter equivalent earnings for Capesize vessels (>100,000 DWT). Dominated by iron ore and coal trade routes.',
        whyItMatters: ['Iron ore export volumes from Brazil and Australia are the primary driver.', 'High BCI often signals strong Chinese steel production — relevant for energy demand.', 'Capesize is the largest and most volatile segment of the dry bulk market.'],
        disclaimer: 'Demo data only — not a live Baltic Exchange feed.',
    },
    bpi: {
        methodology: 'Baltic Panamax Index (BPI): covers vessels of 60,000–80,000 DWT. Primarily grain, coal, and minor bulk trades across Atlantic and Pacific basins.',
        whyItMatters: ['Grain season (Q1/Q4) is the primary driver — US, Brazil, and Black Sea exports.', 'Coal demand from India and SE Asia provides second leg of support.', 'Wide geographic diversification makes BPI a balanced freight gauge.'],
        disclaimer: 'Demo data only — not a live Baltic Exchange feed.',
    },
    bsi: {
        methodology: 'Baltic Supramax Index (BSI): 50,000–60,000 DWT sector. Minor bulks, agri products, cement, and fertilisers. High route diversification.',
        whyItMatters: ['More resilient to single-route disruptions than Capesize.', 'Fertiliser and agri demand cycles are key seasonal drivers.', 'Useful proxy for global industrial and agricultural activity.'],
        disclaimer: 'Demo data only — not a live Baltic Exchange feed.',
    },
    bhsi: {
        methodology: 'Baltic Handysize Index (BHSI): standalone index for vessels of 25,000–40,000 DWT. Note: not part of BDI composition since 2018. Covers short-haul trades, regional cargo, and minor commodities.',
        whyItMatters: ['Reflects regional trade health, particularly in developing markets.', 'High BHSI can signal port congestion at smaller terminals.', 'Good indicator of overall fleet utilisation across all vessel sizes.'],
        disclaimer: 'Demo data only — not a live Baltic Exchange feed. BHSI is a separate index not in BDI.',
    },
    vlsfo_rtm: {
        methodology: 'VLSFO (Very Low Sulphur Fuel Oil, ≤0.5% S) Rotterdam indicative benchmark price, expressed per metric tonne. Assessed from port-level indicative pricing data.',
        whyItMatters: ['Primary compliance fuel for vessels operating under IMO 2020 sulphur cap.', 'Rotterdam is the world\'s largest bunkering port — sets NW Europe price reference.', 'Directly impacts vessel voyage economics for all mainstream fleet.'],
        disclaimer: 'Indicative benchmark assessment — not a live traded price (demo data).',
    },
    vlsfo_sin: {
        methodology: 'VLSFO Singapore indicative benchmark price per metric tonne. Singapore is Asia-Pacific\'s largest bunkering hub.',
        whyItMatters: ['Sets the price reference for Asia-Pacific bunkering operations.', 'Spread vs Rotterdam reflects regional supply/demand imbalances.', 'Critical for voyages through Strait of Malacca and East-West routes.'],
        disclaimer: 'Indicative benchmark assessment — not a live traded price (demo data).',
    },
    lsmgo_rtm: {
        methodology: 'Low Sulphur Marine Gas Oil (LSMGO, ≤0.1% S) Rotterdam indicative benchmark price per metric tonne. Required in ECAs (Emission Control Areas).',
        whyItMatters: ['Mandatory in Northern European ECA zones — all vessels must switch on approach.', 'Higher crack spread vs. VLSFO reflects distillate market tightness.', 'Key cost input for operators on North Sea, Baltic, and Channel routes.'],
        disclaimer: 'Indicative benchmark assessment — not a live traded price (demo data).',
    },
    lsmgo_sin: {
        methodology: 'LSMGO Singapore indicative benchmark. Required for SEA ECA compliance and increasingly preferred for operational flexibility.',
        whyItMatters: ['Required for ECA compliance in certain Asian waters.', 'Typically commands premium over VLSFO — signals refinery distillation margins.', 'Relevant for LNG-ready fleet as fallback transition fuel.'],
        disclaimer: 'Indicative benchmark assessment — not a live traded price (demo data).',
    },
    brent: {
        methodology: 'Brent Crude (ICE Futures) is the global benchmark for light sweet crude oil from the North Sea. Denominated in USD per barrel.',
        whyItMatters: ['Drives marine fuel price formation — VLSFO and LSMGO are crude derivatives.', 'Upstream shipping demand (tanker segment) positively correlates with crude price.', 'Key input for voyage cost modelling and P&L forecasting.'],
        disclaimer: 'Indicative proxy — not ICE live data (demo only).',
    },
    ttf: {
        methodology: 'TTF (Title Transfer Facility) is the European natural gas hub benchmark, traded on ICE Endex. Denominated in EUR/MWh.',
        whyItMatters: ['Relevant for LNG-fuelled vessel economics and e-fuel production cost.', 'High TTF increases e-methanol production costs — upstream pressure on green fuel prices.', 'Proxy for European energy market stress (heating demand, storage, LNG imports).'],
        disclaimer: 'Indicative proxy — not TTF live data (demo only).',
    },
    lng_spot: {
        methodology: 'Asian LNG spot price proxy (JKM benchmark proxy) denominated in USD/MMBtu. Reflects the marginal cost of LNG cargoes delivered to Northeast Asia.',
        whyItMatters: ['Drives LNG bunker economics for vessels near Asian ports.', 'High JKM signals Asian demand competition for US/Middle East LNG supply.', 'Useful proxy for e-fuel feedstock cost trends in Asia.'],
        disclaimer: 'Indicative spot proxy — not JKM live data (demo only).',
    },
};

export function getIndicatorNarrative(id: string): IndicatorNarrative {
    return NARRATIVES[id] ?? {
        methodology: 'Indicative benchmark. Derived from seeded demo data.',
        whyItMatters: ['Relevant to global shipping economics.'],
        disclaimer: 'Demo data only.',
    };
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

export function getIndicators(): IndicatorMeta[] {
    return INDICATORS;
}

export function getIndicatorById(id: string): IndicatorMeta | undefined {
    return INDICATORS.find(i => i.id === id);
}

/** Last update timestamp (deterministic per indicator) */
export function getLastUpdated(id: string): string {
    const h = hash32(id);
    const minutesAgo = 5 + (h % (60 * 8)); // 5 min – 8h ago
    return new Date(REF_MS - minutesAgo * 60_000).toISOString();
}
