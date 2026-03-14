/**
 * services/MarketIntelService.ts
 * Deterministic data generators for Market Intelligence 2.0.
 * Pure functions — no network, no random. Keyed by locode.
 */
import { BunkerProfile } from '../domain/bunker/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IntelType = 'Supply' | 'Demand' | 'Regulation' | 'Disruption' | 'Project' | 'Port Update' | 'Price Proxy';
export type Priority = 'P1' | 'P2' | 'P3';

export interface ChangeItem {
    id: string;
    message: string;
    delta: 'positive' | 'negative' | 'neutral';
    timestamp: string;
}

export interface IntelItem {
    id: string;
    type: IntelType;
    priority: Priority;
    title: string;
    summary: string;
    source: string;
    tags: string[];
    timestamp: string;
}

export interface SavedView {
    name: string;
    filterAvail: boolean;
    filterHighConf: boolean;
    filterEFuels: boolean;
    filterRegions: string[];
    filterAvailStatus: string[];
    filterCIGrades: string[];
    filterMinSuppliers: number;
    filterPriceMin: string;
    filterPriceMax: string;
    sortCol: string;
    sortDir: 'asc' | 'desc';
}

// ---------------------------------------------------------------------------
// Deterministic hash (0–2^32) keyed by locode
// ---------------------------------------------------------------------------
function hash(locode: string): number {
    let h = 5381;
    for (let i = 0; i < locode.length; i++) {
        h = ((h * 33) ^ locode.charCodeAt(i)) >>> 0;
    }
    return h;
}

function pick<T>(arr: T[], seed: number): T {
    return arr[seed % arr.length];
}

// ---------------------------------------------------------------------------
// Reference epoch: 2026-03-01T00:00:00Z (stable across runs)
// ---------------------------------------------------------------------------
const REF_MS = new Date('2026-03-01T00:00:00Z').getTime();

export function getLastUpdated(locode: string): string {
    const h = hash(locode);
    const minutesAgo = 10 + (h % (72 * 60));    // 10 min – 72 h ago
    return new Date(REF_MS - minutesAgo * 60_000).toISOString();
}

function fakeTs(locode: string, offset: number): string {
    const h = hash(locode + String(offset));
    const minutesAgo = 30 + (h % (48 * 60));
    return new Date(REF_MS - minutesAgo * 60_000).toISOString();
}

// ---------------------------------------------------------------------------
// Delivery window (from supplier profiles)
// ---------------------------------------------------------------------------
export function getDeliveryWindow(profile: BunkerProfile): string {
    if (!profile.suppliers.length) return '—';
    const mins = profile.suppliers.map(s => s.typicalDeliveryWindowDays.min).sort((a, b) => a - b);
    const maxs = profile.suppliers.map(s => s.typicalDeliveryWindowDays.max).sort((a, b) => a - b);
    const mid = Math.floor(mins.length / 2);
    return `${mins[mid]}–${maxs[mid]}d`;
}

// ---------------------------------------------------------------------------
// What Changed feed (3–6 items per locode)
// ---------------------------------------------------------------------------
const CHANGE_POOL: { message: string; delta: ChangeItem['delta'] }[] = [
    { message: 'Availability upgraded Limited → Available', delta: 'positive' },
    { message: 'New supplier registered at terminal', delta: 'positive' },
    { message: 'Confidence score increased (+8)', delta: 'positive' },
    { message: 'Price spread narrowed (−$12/mt)', delta: 'positive' },
    { message: 'CI grade upgraded C → B', delta: 'positive' },
    { message: 'Delivery lead time shortened (−1d)', delta: 'positive' },
    { message: 'Availability downgraded Available → Limited', delta: 'negative' },
    { message: 'Supplier suspended operations (maintenance)', delta: 'negative' },
    { message: 'Port congestion reported (+2d delay)', delta: 'negative' },
    { message: 'Price spread widened (+$18/mt)', delta: 'negative' },
    { message: 'Regulatory review pending (e-methanol cert)', delta: 'neutral' },
    { message: 'Quarterly data refresh applied', delta: 'neutral' },
    { message: 'Order book depth increased', delta: 'positive' },
    { message: 'Terminal expansion phase 2 announced', delta: 'positive' },
    { message: 'Confidence data source quality flag cleared', delta: 'positive' },
];

export function getChangeFeed(locode: string): ChangeItem[] {
    const h = hash(locode);
    const count = 3 + (h % 4); // 3–6
    const items: ChangeItem[] = [];
    for (let i = 0; i < count; i++) {
        const seed = hash(locode + String(i));
        const tmpl = pick(CHANGE_POOL, seed);
        items.push({
            id: `${locode}-change-${i}`,
            message: tmpl.message,
            delta: tmpl.delta,
            timestamp: fakeTs(locode, i * 100),
        });
    }
    return items;
}

// ---------------------------------------------------------------------------
// Intel feed (8–15 items per locode)
// ---------------------------------------------------------------------------
const INTEL_POOL: { type: IntelType; priority: Priority; title: string; summary: string; source: string; tags: string[] }[] = [
    { type: 'Supply', priority: 'P1', title: 'e-Methanol terminal capacity expansion confirmed', summary: 'Local operator has confirmed Phase 2 expansion adding 15,000 MT storage capacity, targeting Q3 2026 commissioning.', source: 'Port Authority Release', tags: ['e-methanol', 'capacity', 'Q3-2026'] },
    { type: 'Supply', priority: 'P2', title: 'Green ammonia bunkering trial completed', summary: 'First commercial green ammonia stem delivered to container vessel. Trial deemed successful by operator.', source: 'Operator Bulletin', tags: ['e-ammonia', 'trial', 'green'] },
    { type: 'Demand', priority: 'P2', title: 'Increased container traffic forecast +12% YoY', summary: 'Port authority projects 12% increase in container throughput, implying higher bunker demand through H2.', source: 'Port Statistics Q1', tags: ['demand', 'containers'] },
    { type: 'Regulation', priority: 'P1', title: 'FuelEU Maritime obligation enters force', summary: 'Vessels calling this port must present GHG intensity declarations from 2026-01-01. Port offers declaration assistance.', source: 'EU Registry', tags: ['FuelEU', 'GHG', 'compliance'] },
    { type: 'Regulation', priority: 'P2', title: 'Carbon levy adjustment for e-fuel offset credits', summary: 'Regional authorities confirmed offset credit mechanism applicable to e-methanol and e-ammonia.', source: 'Regulatory Gazette', tags: ['carbon', 'offset', 'credits'] },
    { type: 'Disruption', priority: 'P1', title: 'Terminal 3 maintenance outage — partial capacity', summary: 'Scheduled maintenance on Terminal 3 storage manifold reduces available bunkering capacity by ~30% until further notice.', source: 'Operator NOTAM', tags: ['maintenance', 'capacity', 'disruption'] },
    { type: 'Disruption', priority: 'P3', title: 'Minor congestion reported at outer anchorage', summary: 'Waiting times at outer anchorage averaging 6–8h due to weather-related vessel bunching. No terminal impact.', source: 'VTS Report', tags: ['congestion', 'anchorage', 'weather'] },
    { type: 'Project', priority: 'P2', title: 'Hydrogen-ready terminal infrastructure awarded', summary: 'Port authority selected consortium to design H₂-ready bunkering infrastructure, targeting 2027 readiness.', source: 'Press Release', tags: ['hydrogen', 'project', 'infrastructure'] },
    { type: 'Project', priority: 'P3', title: 'Green corridor MOU signed with Singapore MPA', summary: 'Bilateral MOU signed establishing green corridor with preferential pricing/berthing for e-fuel vessels.', source: 'MPA Announcement', tags: ['green-corridor', 'MOU', 'Singapore'] },
    { type: 'Port Update', priority: 'P3', title: 'New dedicated e-fuel berth (Berth F7) operational', summary: 'Dedicated e-fuel bunkering berth operational since March 2026, capable of simultaneous VLSFO and e-methanol delivery.', source: 'Port Operations', tags: ['berth', 'e-methanol', 'VLSFO'] },
    { type: 'Port Update', priority: 'P2', title: 'STS bunkering service expanded to LNG-ready vessels', summary: 'Ship-to-ship bunkering extended to LNG-ready vessels at anchorage, pending full e-fuel STS approval.', source: 'Port Circular', tags: ['STS', 'LNG', 'bunkering'] },
    { type: 'Price Proxy', priority: 'P2', title: 'Regional VLSFO spot price increased +$22/mt', summary: 'Regional spot assessments show VLSFO up $22/mt vs prior settlement driven by refinery run cuts in NW Europe.', source: 'Price Proxy (Platts)', tags: ['VLSFO', 'spot', 'price'] },
    { type: 'Price Proxy', priority: 'P1', title: 'e-Methanol assessed at $910–980/mt DAP', summary: 'Latest indicative assessment places e-methanol in the $910–980/mt DAP range, slightly above prior quarter.', source: 'Price Proxy (LSEG)', tags: ['e-methanol', 'assessment', 'DAP'] },
    { type: 'Price Proxy', priority: 'P3', title: 'MGO crack spread normalised after spike', summary: 'MGO crack returned to $210–220/mt range vs crude following two-week distillation outage.', source: 'Price Proxy (Argus)', tags: ['MGO', 'crack-spread'] },
    { type: 'Supply', priority: 'P3', title: 'Seasonal low-sulphur VLSFO supply tightness easing', summary: 'Refinery restarts in Rotterdam region expected to ease LSVLSFO availability over next 4–6 weeks.', source: 'Supply Monitor', tags: ['VLSFO', 'LSSF', 'tightness'] },
    { type: 'Demand', priority: 'P3', title: 'Tanker segment bunker lift volumes up 8%', summary: 'Tanker sector lifted 8% more bunker volume vs same period prior year at this port, driven by VLCC traffic.', source: 'Port Statistics', tags: ['tanker', 'volume', 'VLCC'] },
    { type: 'Regulation', priority: 'P3', title: 'CII rating thresholds tighten from 2026-01-01', summary: 'IMO CII Rating D/E vessels at risk of improvement plan requirements. Port offers advisory services.', source: 'IMO Circular', tags: ['CII', 'IMO', 'rating'] },
    { type: 'Project', priority: 'P2', title: 'Direct e-ammonia supply pipeline from production facility', summary: 'Pipeline connecting ammonia production facility and port terminal approved; commissioning target H1 2027.', source: 'Project Bulletin', tags: ['e-ammonia', 'pipeline', 'H1-2027'] },
];

export function getIntelFeed(locode: string): IntelItem[] {
    const h = hash(locode);
    const count = 8 + (h % 8); // 8–15
    const items: IntelItem[] = [];
    const used = new Set<number>();
    for (let i = 0; i < count; i++) {
        let idx = (h + i * 7) % INTEL_POOL.length;
        // avoid duplicates by shifting
        while (used.has(idx)) idx = (idx + 1) % INTEL_POOL.length;
        used.add(idx);
        const tmpl = INTEL_POOL[idx];
        items.push({
            id: `${locode}-intel-${i}`,
            type: tmpl.type,
            priority: tmpl.priority,
            title: tmpl.title,
            summary: tmpl.summary,
            source: tmpl.source,
            tags: tmpl.tags,
            timestamp: fakeTs(locode, i * 37),
        });
    }
    // sort newest first
    return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ---------------------------------------------------------------------------
// Saved views: default presets
// ---------------------------------------------------------------------------
export const DEFAULT_VIEWS: Record<string, SavedView> = {
    'Default': {
        name: 'Default', filterAvail: false, filterHighConf: false, filterEFuels: false,
        filterRegions: [], filterAvailStatus: [], filterCIGrades: [],
        filterMinSuppliers: 0, filterPriceMin: '', filterPriceMax: '',
        sortCol: 'portName', sortDir: 'asc',
    },
    'E-Fuel Ready Hubs': {
        name: 'E-Fuel Ready Hubs', filterAvail: true, filterHighConf: false, filterEFuels: true,
        filterRegions: [], filterAvailStatus: ['available'], filterCIGrades: [],
        filterMinSuppliers: 0, filterPriceMin: '', filterPriceMax: '',
        sortCol: 'confidenceScore', sortDir: 'desc',
    },
    'High Confidence Only': {
        name: 'High Confidence Only', filterAvail: false, filterHighConf: true, filterEFuels: false,
        filterRegions: [], filterAvailStatus: [], filterCIGrades: [],
        filterMinSuppliers: 0, filterPriceMin: '', filterPriceMax: '',
        sortCol: 'confidenceScore', sortDir: 'desc',
    },
};
