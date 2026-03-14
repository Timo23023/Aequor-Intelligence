/**
 * scripts/verify_efuel_map_data.ts
 * Validates E-Fuel Map data layer: node/profile counts and display price computation.
 * Run with: npx tsx scripts/verify_efuel_map_data.ts
 */
import { listBunkerNodes, getBunkerProfile } from '../services/BunkerService';
import { computeDisplayPrice } from '../services/BunkerPricingService';
import { FuelProduct, Currency, PriceBasis } from '../domain/bunker/types';

const CORE_FUELS: FuelProduct[] = ['e_methanol', 'e_ammonia', 'vlsfo', 'mgo'];
const CURRENCIES: Currency[] = ['USD', 'EUR'];
const BASES: PriceBasis[] = ['posted', 'dap'];
const SAMPLE_LOCODES = ['NLRTM', 'SGSIN', 'USHOU'];

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string): void {
    if (condition) { console.log(`  ✅  ${msg}`); passed++; }
    else { console.error(`  ❌  ${msg}`); failed++; }
}

// ---------------------------------------------------------------------------
// 1. Count parity
// ---------------------------------------------------------------------------
console.log('\n=== [1] Node / Profile count ===');

const nodes = listBunkerNodes();
const profiles = nodes.map(n => getBunkerProfile(n.locode));

assert(nodes.length === 46, `Node count == 46 (got ${nodes.length})`);
assert(profiles.every(p => p !== null), 'Every node has a matching profile');
assert(nodes.length === profiles.length, `Node count (${nodes.length}) == profile count (${profiles.length})`);

// ---------------------------------------------------------------------------
// 2. computeDisplayPrice round-trip on sample locodes
// ---------------------------------------------------------------------------
console.log('\n=== [2] computeDisplayPrice coverage ===');

for (const locode of SAMPLE_LOCODES) {
    const profile = getBunkerProfile(locode);
    assert(profile !== null, `Profile found for ${locode}`);
    if (!profile) continue;

    for (const fuel of CORE_FUELS) {
        for (const currency of CURRENCIES) {
            for (const basis of BASES) {
                const dp = computeDisplayPrice(profile, fuel, currency, basis);
                assert(dp !== null, `${locode}: computeDisplayPrice(${fuel}, ${currency}, ${basis}) → result`);
                if (dp) {
                    assert(dp.low <= dp.avg && dp.avg <= dp.high,
                        `${locode}/${fuel}/${currency}/${basis}: low (${dp.low}) <= avg (${dp.avg}) <= high (${dp.high})`);
                    assert(dp.avg > 0, `${locode}/${fuel}/${currency}/${basis}: avg > 0`);
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 3. Spot-check EUR prices are lower than USD (FX: USD_EUR=0.925)
// ---------------------------------------------------------------------------
console.log('\n=== [3] EUR < USD sanity check ===');

for (const locode of SAMPLE_LOCODES) {
    const profile = getBunkerProfile(locode);
    if (!profile) continue;
    const usdPrice = computeDisplayPrice(profile, 'vlsfo', 'USD', 'posted');
    const eurPrice = computeDisplayPrice(profile, 'vlsfo', 'EUR', 'posted');
    if (usdPrice && eurPrice) {
        assert(eurPrice.avg < usdPrice.avg, `${locode}: EUR avg (${eurPrice.avg}) < USD avg (${usdPrice.avg})`);
    }
}

// ---------------------------------------------------------------------------
// 4. DAP > posted
// ---------------------------------------------------------------------------
console.log('\n=== [4] DAP > posted sanity check ===');

for (const locode of SAMPLE_LOCODES) {
    const profile = getBunkerProfile(locode);
    if (!profile) continue;
    const posted = computeDisplayPrice(profile, 'e_methanol', 'USD', 'posted');
    const dap = computeDisplayPrice(profile, 'e_methanol', 'USD', 'dap');
    if (posted && dap) {
        assert(dap.avg > posted.avg, `${locode}: e_methanol DAP avg (${dap.avg}) > posted avg (${posted.avg})`);
    }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
if (failed === 0) {
    console.log(`✅  E-Fuel Map data validated: OK  (${passed} checks passed)`);
} else {
    console.error(`❌  ${failed} failed, ${passed} passed`);
    process.exit(1);
}
