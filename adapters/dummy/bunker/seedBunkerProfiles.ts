/**
 * adapters/dummy/bunker/seedBunkerProfiles.ts
 *
 * Deterministic BunkerProfile seeds for every node in SEED_BUNKER_NODES.
 * No randomness — all values derived from the node's locode and
 * a set of regional price anchors + fixed FX rate constants.
 *
 * Price realism ranges (USD/mt):
 *   e_methanol  : 700–1 100  (green premium)
 *   e_ammonia   : 800–1 200
 *   vlsfo       : 490–620
 *   mgo         : 620–780
 *
 * FX: 1 USD = 0.925 EUR (fixed demo rate)
 * Basis spread: posted = avg; dap = avg + 8–12% (delivery surcharge)
 */

import {
    BunkerProfile,
    FuelPricePoint,
    SupplierCard,
    OrderBookLevel,
    FuelProduct,
    Currency,
    PriceBasis,
    CIGrade,
} from '../../../domain/bunker/types';
import { SEED_BUNKER_NODES } from './seedBunkerNodes';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USD_EUR = 0.925; // fixed demo FX rate

// Regional price anchors (USD avg, spread half-width) per fuel
interface PriceAnchor { avg: number; spread: number; }

// Per-region base prices for e_methanol
const EM_ANCHORS: Record<string, PriceAnchor> = {
    north_europe: { avg: 980, spread: 60 },
    mediterranean: { avg: 1010, spread: 65 },
    middle_east: { avg: 1050, spread: 70 },
    asia: { avg: 920, spread: 55 },
    north_america: { avg: 960, spread: 58 },
    south_america: { avg: 1080, spread: 75 },
    africa: { avg: 1100, spread: 80 },
    oceania: { avg: 1040, spread: 70 },
    global: { avg: 1000, spread: 65 },
    other: { avg: 1000, spread: 65 },
};

// e_ammonia always 90–110 USD above e_methanol avg
const EA_DELTA = 100;

// vlsfo anchors (tighter spread)
const VL_ANCHORS: Record<string, PriceAnchor> = {
    north_europe: { avg: 545, spread: 28 },
    mediterranean: { avg: 562, spread: 30 },
    middle_east: { avg: 510, spread: 25 },
    asia: { avg: 532, spread: 26 },
    north_america: { avg: 555, spread: 28 },
    south_america: { avg: 580, spread: 32 },
    africa: { avg: 595, spread: 35 },
    oceania: { avg: 575, spread: 30 },
    global: { avg: 550, spread: 28 },
    other: { avg: 550, spread: 28 },
};

// mgo = vlsfo avg + 100–120 with same spread
const MGO_DELTA = 110;

// DAP surcharge on top of posted: 9%
const DAP_SURCHARGE = 0.09;

// ---------------------------------------------------------------------------
// Price factories
// ---------------------------------------------------------------------------

function makePrice(
    fuel: FuelProduct,
    currency: Currency,
    basis: PriceBasis,
    avgUSD: number,
    spread: number,
    asOf: string,
    sources: string[],
): FuelPricePoint {
    const postedAvg = currency === 'USD' ? avgUSD : +(avgUSD * USD_EUR).toFixed(2);
    const postedLow = currency === 'USD' ? avgUSD - spread : +((avgUSD - spread) * USD_EUR).toFixed(2);
    const postedHigh = currency === 'USD' ? avgUSD + spread : +((avgUSD + spread) * USD_EUR).toFixed(2);

    if (basis === 'posted') {
        return {
            fuel, currency, basis,
            avg: postedAvg, low: postedLow, high: postedHigh,
            unit: 'mt', asOf, sources,
        };
    }

    // DAP
    const dapAvg = +(postedAvg * (1 + DAP_SURCHARGE)).toFixed(2);
    const dapLow = +(postedLow * (1 + DAP_SURCHARGE)).toFixed(2);
    const dapHigh = +(postedHigh * (1 + DAP_SURCHARGE)).toFixed(2);
    return {
        fuel, currency, basis: 'dap',
        avg: dapAvg, low: dapLow, high: dapHigh,
        unit: 'mt', asOf, sources,
    };
}

function buildPrices(region: string, asOf: string, sources: string[]): FuelPricePoint[] {
    const em = EM_ANCHORS[region] ?? EM_ANCHORS.other;
    const vl = VL_ANCHORS[region] ?? VL_ANCHORS.other;
    const eaAvg = em.avg + EA_DELTA;
    const mgoAvg = vl.avg + MGO_DELTA;

    const fuels: Array<{ fuel: FuelProduct; avgUSD: number; spread: number }> = [
        { fuel: 'e_methanol', avgUSD: em.avg, spread: em.spread },
        { fuel: 'e_ammonia', avgUSD: eaAvg, spread: em.spread + 5 },
        { fuel: 'vlsfo', avgUSD: vl.avg, spread: vl.spread },
        { fuel: 'mgo', avgUSD: mgoAvg, spread: vl.spread + 5 },
    ];

    const prices: FuelPricePoint[] = [];
    const currencies: Currency[] = ['USD', 'EUR'];
    const bases: PriceBasis[] = ['posted', 'dap'];

    for (const { fuel, avgUSD, spread } of fuels) {
        for (const currency of currencies) {
            for (const basis of bases) {
                prices.push(makePrice(fuel, currency, basis, avgUSD, spread, asOf, sources));
            }
        }
    }

    return prices;
}

// ---------------------------------------------------------------------------
// Supplier factories
// ---------------------------------------------------------------------------

// Pool of supplier templates (reused across nodes with index rotation)
const SUPPLIER_POOL: Omit<SupplierCard, 'supplierId'>[] = [
    { name: 'NorthSea Bunkering AS', fuels: ['e_methanol', 'vlsfo', 'mgo'], ciGrades: { e_methanol: 'A' }, typicalDeliveryWindowDays: { min: 2, max: 5 }, reliabilityScore: 92 },
    { name: 'GreenFuel Marine Ltd', fuels: ['e_methanol', 'e_ammonia'], ciGrades: { e_methanol: 'A', e_ammonia: 'A' }, typicalDeliveryWindowDays: { min: 3, max: 7 }, reliabilityScore: 88 },
    { name: 'Peninsula Bunkering', fuels: ['vlsfo', 'mgo'], typicalDeliveryWindowDays: { min: 1, max: 3 }, reliabilityScore: 95 },
    { name: 'OceanFuel Solutions', fuels: ['e_methanol', 'vlsfo', 'mgo'], ciGrades: { e_methanol: 'B' }, typicalDeliveryWindowDays: { min: 2, max: 6 }, reliabilityScore: 82 },
    { name: 'Azimuth Energy GmbH', fuels: ['e_methanol', 'e_ammonia', 'vlsfo'], ciGrades: { e_methanol: 'A', e_ammonia: 'B' }, typicalDeliveryWindowDays: { min: 4, max: 9 }, reliabilityScore: 79 },
    { name: 'AsiaMarine Fuel Corp', fuels: ['vlsfo', 'mgo', 'e_methanol'], ciGrades: { e_methanol: 'B' }, typicalDeliveryWindowDays: { min: 1, max: 4 }, reliabilityScore: 90 },
    { name: 'Meridian Shipping Fuel', fuels: ['vlsfo', 'mgo'], typicalDeliveryWindowDays: { min: 2, max: 5 }, reliabilityScore: 85 },
    { name: 'StellarBunker International', fuels: ['e_methanol', 'vlsfo'], ciGrades: { e_methanol: 'C' }, typicalDeliveryWindowDays: { min: 3, max: 8 }, reliabilityScore: 76 },
    { name: 'Delta Marine Energy', fuels: ['mgo', 'vlsfo'], typicalDeliveryWindowDays: { min: 1, max: 3 }, reliabilityScore: 93 },
    { name: 'HydroPrime Bunker Co', fuels: ['e_ammonia', 'e_methanol'], ciGrades: { e_ammonia: 'A', e_methanol: 'A' }, typicalDeliveryWindowDays: { min: 5, max: 12 }, reliabilityScore: 74 },
];

// Pick N suppliers deterministically from pool, starting at locode-derived offset
function buildSuppliers(locode: string, count: number): SupplierCard[] {
    // Derive offset from sum of char codes in the locode
    const offset = locode.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % SUPPLIER_POOL.length;
    const selected: SupplierCard[] = [];
    for (let i = 0; i < count; i++) {
        const src = SUPPLIER_POOL[(offset + i) % SUPPLIER_POOL.length];
        selected.push({ supplierId: `sup-${locode.toLowerCase()}-${i + 1}`, ...src });
    }
    return selected;
}

// Number of suppliers per confidence tier
function supplierCount(confidenceScore: number): number {
    if (confidenceScore >= 80) return 6;
    if (confidenceScore >= 60) return 4;
    if (confidenceScore >= 40) return 3;
    return 2;
}

// ---------------------------------------------------------------------------
// Order book factory
// ---------------------------------------------------------------------------

// Masked counterparty pool
const CP_POOL = [
    'Trader A***', 'Trader B***', 'Broker X***', 'Hedge F***',
    'Trader C***', 'Trader D***', 'Broker Y***', 'Fund Z***',
    'Corp P***', 'Corp Q***', 'Trader E***', 'Broker W***',
];

function isoFromDelta(baseDateISO: string, deltaDays: number): string {
    const d = new Date(baseDateISO);
    d.setDate(d.getDate() + deltaDays);
    return d.toISOString().split('T')[0] + 'T00:00:00Z';
}

function buildOrderBook(
    locode: string,
    avgUSD: number,
    spread: number,
    asOf: string,
    levels: number,
): OrderBookLevel[] {
    const book: OrderBookLevel[] = [];
    // Derive seed from locode char codes
    const seed = locode.split('').reduce((s, c) => s + c.charCodeAt(0), 0);

    const halfLevels = Math.floor(levels / 2);

    for (let i = 0; i < levels; i++) {
        const side: 'bid' | 'ask' = i < halfLevels ? 'bid' : 'ask';

        // Price: bid below avg, ask above; stepped by 3 USD per level
        const step = (i % halfLevels) * 3;
        const price = side === 'bid'
            ? +(avgUSD - spread * 0.4 - step).toFixed(2)
            : +(avgUSD + spread * 0.4 + step).toFixed(2);

        // Volume: 1 000–5 000 mt deterministic ladder
        const volumeMt = 1000 + ((seed + i * 317) % 4001);

        const currency: Currency = i % 3 === 0 ? 'EUR' : 'USD';
        const basis: PriceBasis = i % 2 === 0 ? 'posted' : 'dap';
        const status: 'indicative' | 'firm' = i % 4 === 0 ? 'firm' : 'indicative';

        const startDelta = 5 + (i % 6) * 3;
        const endDelta = startDelta + 7;

        book.push({
            side,
            price: currency === 'USD' ? price : +(price * USD_EUR).toFixed(2),
            volumeMt,
            currency,
            basis,
            deliveryWindow: {
                startISO: isoFromDelta(asOf, startDelta),
                endISO: isoFromDelta(asOf, endDelta),
            },
            counterpartyMasked: CP_POOL[(seed + i) % CP_POOL.length],
            status,
            timestamp: asOf,
        });
    }

    return book;
}

// Number of order book levels per confidence tier
function orderBookLevels(confidenceScore: number): number {
    if (confidenceScore >= 80) return 20;
    if (confidenceScore >= 60) return 14;
    if (confidenceScore >= 40) return 10;
    return 10; // minimum 10 to always have bid + ask
}

// ---------------------------------------------------------------------------
// Profile builder
// ---------------------------------------------------------------------------

function buildProfile(node: typeof SEED_BUNKER_NODES[number]): BunkerProfile {
    const sources = ['Aequor Demo Feed', 'Seed Data v1'];
    const asOf = node.lastUpdated;
    const region = node.region;

    const prices = buildPrices(region, asOf, sources);

    const nSuppliers = supplierCount(node.confidenceScore);
    const suppliers = buildSuppliers(node.locode, nSuppliers);

    // Use e_methanol USD posted anchor for order book
    const em = EM_ANCHORS[region] ?? EM_ANCHORS.other;
    const nLevels = orderBookLevels(node.confidenceScore);
    const orderBook = buildOrderBook(node.locode, em.avg, em.spread, asOf, nLevels);

    const notes: string[] = [];
    if (node.confidenceLabel === 'low') {
        notes.push('Data confidence is low — treat prices as indicative only.');
    }
    if (node.availability.e_methanol === 'planned') {
        notes.push('e-Methanol bunkering planned but not yet operational at this port.');
    }
    if (node.availability.e_ammonia === 'planned') {
        notes.push('e-Ammonia bunkering planned but not yet operational at this port.');
    }

    return { node, prices, suppliers, orderBook, notes };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const SEED_BUNKER_PROFILES: BunkerProfile[] = SEED_BUNKER_NODES.map(buildProfile);
