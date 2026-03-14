/**
 * scripts/verify_bunker_module.ts
 *
 * Verifies Phase 1 Bunker Intelligence Foundation integrity.
 * Run with: npx tsx scripts/verify_bunker_module.ts
 */

import { listBunkerNodes, getBunkerProfile } from '../services/BunkerService';
import { selectPrice, computeDisplayPrice } from '../services/BunkerPricingService';
import { validateConfidenceScore, validatePricePoint } from '../domain/bunker/validators';
import { FuelProduct } from '../domain/bunker/types';

const E_FUELS: FuelProduct[] = ['e_methanol', 'e_ammonia'];
const CORE_FUELS: FuelProduct[] = ['e_methanol', 'e_ammonia', 'vlsfo', 'mgo'];

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
    if (condition) {
        console.log(`  ✅  ${message}`);
        passed++;
    } else {
        console.error(`  ❌  ${message}`);
        failed++;
    }
}

function assertThrows(fn: () => void, message: string): void {
    try {
        fn();
        console.error(`  ❌  ${message} [expected throw but did not]`);
        failed++;
    } catch {
        console.log(`  ✅  ${message}`);
        passed++;
    }
}

// ---------------------------------------------------------------------------
// 1. Nodes
// ---------------------------------------------------------------------------
console.log('\n=== [1] BunkerNodes ===');

const nodes = listBunkerNodes();
assert(nodes.length >= 30, `Node count >= 30 (got ${nodes.length})`);

for (const node of nodes) {
    const tag = node.locode;

    // E-fuel availability entries must exist (any value)
    for (const fuel of E_FUELS) {
        assert(
            node.availability[fuel] !== undefined,
            `${tag}: availability.${fuel} is defined`,
        );
    }

    // Confidence score in bounds
    try {
        validateConfidenceScore(node.confidenceScore, tag);
        assert(true, `${tag}: confidenceScore ${node.confidenceScore} in range [0–100]`);
    } catch (e) {
        assert(false, `${tag}: confidenceScore validation — ${(e as Error).message}`);
    }

    // Label is consistent with score
    const expectedLabel =
        node.confidenceScore >= 75 ? 'high' :
            node.confidenceScore >= 45 ? 'medium' : 'low';
    assert(
        node.confidenceLabel === expectedLabel,
        `${tag}: confidenceLabel '${node.confidenceLabel}' consistent with score ${node.confidenceScore}`,
    );
}

// ---------------------------------------------------------------------------
// 2. Profiles — coverage and price sanity
// ---------------------------------------------------------------------------
console.log('\n=== [2] BunkerProfiles ===');

for (const node of nodes) {
    const profile = getBunkerProfile(node.locode);
    assert(profile !== null, `${node.locode}: profile exists`);
    if (!profile) continue;

    const tag = node.locode;

    // Prices for all 4 core fuels must exist (at least 1 entry per fuel)
    for (const fuel of CORE_FUELS) {
        const hasFuel = profile.prices.some(p => p.fuel === fuel);
        assert(hasFuel, `${tag}: has price point for ${fuel}`);
    }

    // All price points must pass validation
    for (const p of profile.prices) {
        try {
            validatePricePoint(p, tag);
        } catch (e) {
            assert(false, `${tag}: price point valid — ${(e as Error).message}`);
        }
    }

    // Order book must have at least one bid AND one ask
    const hasBid = profile.orderBook.some(l => l.side === 'bid');
    const hasAsk = profile.orderBook.some(l => l.side === 'ask');
    assert(hasBid, `${tag}: order book has bid levels`);
    assert(hasAsk, `${tag}: order book has ask levels`);

    // Suppliers
    assert(profile.suppliers.length >= 2, `${tag}: has >= 2 suppliers (got ${profile.suppliers.length})`);
}

// ---------------------------------------------------------------------------
// 3. BunkerPricingService
// ---------------------------------------------------------------------------
console.log('\n=== [3] BunkerPricingService ===');

const sampleProfile = getBunkerProfile('NLRTM');
assert(sampleProfile !== null, 'NLRTM profile loaded for pricing tests');

if (sampleProfile) {
    const exact = selectPrice(sampleProfile, 'e_methanol', 'USD', 'posted');
    assert(exact !== null, 'selectPrice(NLRTM, e_methanol, USD, posted) returns a result');
    if (exact) {
        assert(exact.fuel === 'e_methanol', `selectPrice fuel is 'e_methanol'`);
        assert(exact.currency === 'USD', `selectPrice currency is 'USD'`);
        assert(exact.basis === 'posted', `selectPrice basis is 'posted'`);
    }

    const display = computeDisplayPrice(sampleProfile, 'vlsfo', 'EUR', 'dap');
    assert(display !== null, 'computeDisplayPrice(NLRTM, vlsfo, EUR, dap) returns display');
    if (display) {
        assert(display.low <= display.avg, `display.low (${display.low}) <= avg (${display.avg})`);
        assert(display.avg <= display.high, `display.avg (${display.avg}) <= high (${display.high})`);
    }

    // Non-existent fuel should return null gracefully
    const missing = selectPrice(sampleProfile, 'other', 'USD', 'posted');
    assert(missing === null, 'selectPrice returns null for fuel with no price data (other/USD/posted)');
}

// ---------------------------------------------------------------------------
// 4. Validator boundary tests
// ---------------------------------------------------------------------------
console.log('\n=== [4] Validator guards ===');

assertThrows(() => validateConfidenceScore(-1), 'validateConfidenceScore(-1) throws');
assertThrows(() => validateConfidenceScore(101), 'validateConfidenceScore(101) throws');
assertThrows(
    () => validatePricePoint({ fuel: 'vlsfo', currency: 'USD', basis: 'posted', avg: 500, low: 600, high: 700, unit: 'mt', asOf: '2026-01-01T00:00:00Z', sources: [] }, 'test'),
    'validatePricePoint low > avg throws',
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
if (failed === 0) {
    console.log(`✅  Bunker module validated: OK  (${passed} checks passed)`);
} else {
    console.error(`❌  ${failed} checks failed, ${passed} passed`);
    process.exit(1);
}
