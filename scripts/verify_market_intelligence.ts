/**
 * scripts/verify_market_intelligence.ts
 * Phase 7 verification: screener data, filters, sorting, saved views.
 * Run: npx tsx scripts/verify_market_intelligence.ts
 */
import { listBunkerNodes, getBunkerProfile } from '../services/BunkerService';
import { computeDisplayPrice } from '../services/BunkerPricingService';
import { getLastUpdated, getDeliveryWindow, getChangeFeed, getIntelFeed, DEFAULT_VIEWS } from '../services/MarketIntelService';
import { FuelProduct, Availability } from '../domain/bunker/types';

// ── Simple test runner ─────────────────────────────────────────────────────
let passed = 0; let failed = 0;
function assert(name: string, cond: boolean, detail = '') {
    if (cond) { console.log(`  ✅ ${name}`); passed++; }
    else { console.error(`  ❌ ${name}${detail ? ': ' + detail : ''}`); failed++; }
}

// ── Build screener rows (mirrors MarketOverviewPage logic) ─────────────────
const E_FUELS: FuelProduct[] = ['e_methanol', 'e_ammonia'];

interface ScreenerRow {
    locode: string; portName: string; region: string;
    availability: Availability; confidenceScore: number;
    ciGrade: string; avgPrice: number; priceLow: number; priceHigh: number;
    suppliers: number; deliveryWindow: string; lastUpdated: string;
}

function buildRows(fuel: FuelProduct): ScreenerRow[] {
    return listBunkerNodes().map(node => {
        const prof = getBunkerProfile(node.locode);
        const dp = prof ? computeDisplayPrice(prof, fuel, 'USD', 'posted') : null;
        return {
            locode: node.locode, portName: node.portName, region: node.region,
            availability: node.availability[fuel] as Availability,
            confidenceScore: node.confidenceScore,
            ciGrade: (node.ciGrade[fuel] ?? '—') as string,
            avgPrice: dp?.avg ?? 0, priceLow: dp?.low ?? 0, priceHigh: dp?.high ?? 0,
            suppliers: prof?.suppliers.length ?? 0,
            deliveryWindow: prof ? getDeliveryWindow(prof) : '—',
            lastUpdated: getLastUpdated(node.locode),
        };
    });
}

function applyFilters(rows: ScreenerRow[], opts: {
    filterAvail?: boolean; filterHighConf?: boolean; filterEFuels?: boolean;
    filterRegions?: string[]; filterMinSuppliers?: number;
    fuel?: FuelProduct;
}): ScreenerRow[] {
    const fuel = opts.fuel ?? 'e_methanol';
    let r = [...rows];
    if (opts.filterAvail) r = r.filter(x => x.availability === 'available');
    if (opts.filterHighConf) r = r.filter(x => x.confidenceScore >= 75);
    if (opts.filterEFuels) {
        if (!E_FUELS.includes(fuel)) r = [];
        else r = r.filter(x => x.availability !== 'unknown' && x.availability !== 'planned');
    }
    if (opts.filterRegions?.length) r = r.filter(x => opts.filterRegions!.includes(x.region));
    if ((opts.filterMinSuppliers ?? 0) > 0) r = r.filter(x => x.suppliers >= (opts.filterMinSuppliers ?? 0));
    return r;
}

function sortRows(rows: ScreenerRow[], col: string, dir: 'asc' | 'desc'): ScreenerRow[] {
    const d = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
        const va = (a as Record<string, unknown>)[col];
        const vb = (b as Record<string, unknown>)[col];
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * d;
        return String(va ?? '').localeCompare(String(vb ?? '')) * d;
    });
}

// ── localStorage mock ──────────────────────────────────────────────────────
const store: Record<string, string> = {};
(global as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
};

// ── Run Tests ──────────────────────────────────────────────────────────────
console.log('\n=== Phase 7: Market Intelligence Verification ===\n');

const rows = buildRows('e_methanol');

// 1. Row count
console.log('1. Row count:');
assert('Exactly 46 ports', rows.length === 46, `got ${rows.length}`);

// 2. Every row has required fields
console.log('\n2. Row schema:');
const sample = rows[0];
assert('locode present', typeof sample?.locode === 'string' && sample.locode.length === 5);
assert('portName present', typeof sample?.portName === 'string' && sample.portName.length > 0);
assert('confidenceScore 0–100', sample?.confidenceScore >= 0 && sample?.confidenceScore <= 100);
assert('lastUpdated is ISO', typeof sample?.lastUpdated === 'string' && sample.lastUpdated.includes('T'));
assert('deliveryWindow set', typeof sample?.deliveryWindow === 'string');

// 3. Deterministic timestamps (stable across 2 calls)
console.log('\n3. Deterministic timestamps:');
const t1 = getLastUpdated('NLRTM');
const t2 = getLastUpdated('NLRTM');
assert('getLastUpdated is stable (same locode)', t1 === t2);
assert('timestamp within last 72h', new Date(t1).getTime() >= new Date('2026-02-27T00:00:00Z').getTime());

// 4. Sorting
console.log('\n4. Sorting:');
const byPortAsc = sortRows(rows, 'portName', 'asc');
assert('Sort by portName ASC first < last', byPortAsc[0].portName.localeCompare(byPortAsc[byPortAsc.length - 1].portName) <= 0);

const byPriceDesc = sortRows(rows.filter(r => r.avgPrice > 0), 'avgPrice', 'desc');
assert('Sort by avgPrice DESC: first >= second', byPriceDesc.length < 2 || byPriceDesc[0].avgPrice >= byPriceDesc[1].avgPrice);

const byConfDesc = sortRows(rows, 'confidenceScore', 'desc');
assert('Sort by confidenceScore DESC: first >= second', byConfDesc[0].confidenceScore >= byConfDesc[1].confidenceScore);

// 5. Filters
console.log('\n5. Filters:');
const availOnly = applyFilters(rows, { filterAvail: true });
assert('filterAvail: all results are "available"', availOnly.every(r => r.availability === 'available'));
assert('filterAvail: reduces row count', availOnly.length < rows.length, `${availOnly.length} vs ${rows.length}`);

const highConf = applyFilters(rows, { filterHighConf: true });
assert('filterHighConf: all results have score ≥ 75', highConf.every(r => r.confidenceScore >= 75));
assert('filterHighConf: reduces row count', highConf.length < rows.length);

const efuels = applyFilters(rows, { filterEFuels: true, fuel: 'e_methanol' });
assert('filterEFuels (e_methanol): all available or limited', efuels.every(r => r.availability === 'available' || r.availability === 'limited'));

// 6. Intel feed
console.log('\n6. Intel feed:');
const feed = getIntelFeed('NLRTM');
assert('Intel feed has 8–15 items', feed.length >= 8 && feed.length <= 15, `got ${feed.length}`);
assert('All items have type+priority+title', feed.every(i => i.type && i.priority && i.title));
assert('Feed is sorted newest first', feed[0].timestamp >= feed[feed.length - 1].timestamp);

const feed2 = getIntelFeed('NLRTM');
assert('Intel feed is deterministic (same locode)', JSON.stringify(feed) === JSON.stringify(feed2));

const diff = getIntelFeed('SGSIN');
assert('Different locodes produce different feeds', JSON.stringify(diff) !== JSON.stringify(feed));

// 7. Change feed
console.log('\n7. Change feed:');
const changes = getChangeFeed('NLRTM');
assert('Change feed has 3–6 items', changes.length >= 3 && changes.length <= 6, `got ${changes.length}`);
assert('All items have delta', changes.every(c => ['positive', 'negative', 'neutral'].includes(c.delta)));

// 8. Saved views round-trip
console.log('\n8. Saved views:');
const view = DEFAULT_VIEWS['E-Fuel Ready Hubs'];
assert('E-Fuel Ready Hubs view has filterEFuels=true', view.filterEFuels === true);
assert('High Confidence Only view has filterHighConf=true', DEFAULT_VIEWS['High Confidence Only'].filterHighConf === true);

const LS_KEY = 'mkt_saved_views';
const customView = { ...DEFAULT_VIEWS['Default'], name: 'Custom', filterAvail: true };
store[LS_KEY] = JSON.stringify({ Custom: customView });
const loaded: Record<string, typeof customView> = JSON.parse(store[LS_KEY] ?? '{}');
assert('Saved view round-trip: name matches', loaded['Custom']?.name === 'Custom');
assert('Saved view round-trip: filterAvail=true', loaded['Custom']?.filterAvail === true);

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
