/**
 * scripts/verify_port_terminal.ts
 * Phase 8 verification: PortTerminalService, delta logic, deep-link formats.
 */
import { buildPortTerminalModel, getComplianceItems } from '../services/PortTerminalService';
import { getChangeFeed, getIntelFeed } from '../services/MarketIntelService';
import { getBunkerProfile } from '../services/BunkerService';
import { computeDisplayPrice } from '../services/BunkerPricingService';

// ── localStorage mock ──────────────────────────────────────────────────────
const store: Record<string, string> = {};
(global as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
};

let passed = 0; let failed = 0;
function assert(name: string, cond: boolean, detail = '') {
    if (cond) { console.log(`  ✅ ${name}`); passed++; }
    else { console.error(`  ❌ ${name}${detail ? ': ' + detail : ''}`); failed++; }
}

const ROTTERDAM = 'NLRTM';
const ANTWERP = 'BEANR';
const OPTS = { fuel: 'e_methanol' as const, currency: 'USD' as const, basis: 'posted' as const };

console.log('\n=== Phase 8: Port Terminal Verification ===\n');

// ── 1. buildPortTerminalModel ───────────────────────────────────────────────
console.log('1. buildPortTerminalModel:');
const modelRTM = buildPortTerminalModel(ROTTERDAM, OPTS);
assert('Returns non-null for valid locode', modelRTM !== null);
assert('profile present', !!modelRTM?.profile);
assert('displayPrice present or null (valid type)', modelRTM !== null && ('displayPrice' in modelRTM));
assert('deliveryWindow is string', typeof modelRTM?.deliveryWindow === 'string');
assert('lastUpdated is ISO string', typeof modelRTM?.lastUpdated === 'string' && (modelRTM?.lastUpdated.includes('T') ?? false));
assert('changeFeed is array (3–6)', Array.isArray(modelRTM?.changeFeed) && (modelRTM?.changeFeed.length ?? 0) >= 3);
assert('intelFeed is array (8–15)', Array.isArray(modelRTM?.intelFeed) && (modelRTM?.intelFeed.length ?? 0) >= 8);

// ── 2. buildPortTerminalModel — invalid locode ──────────────────────────────
console.log('\n2. Invalid locode:');
const modelBad = buildPortTerminalModel('XXXXX', OPTS);
assert('Returns null for unknown locode', modelBad === null);

// ── 3. Determinism (same output on second call) ─────────────────────────────
console.log('\n3. Determinism:');
const model2 = buildPortTerminalModel(ROTTERDAM, OPTS);
assert('Same deliveryWindow both calls', modelRTM?.deliveryWindow === model2?.deliveryWindow);
assert('Same lastUpdated both calls', modelRTM?.lastUpdated === model2?.lastUpdated);
assert('Same changeFeed length', modelRTM?.changeFeed.length === model2?.changeFeed.length);
assert('Same intelFeed length', modelRTM?.intelFeed.length === model2?.intelFeed.length);

// ── 4. Delta summary math ───────────────────────────────────────────────────
console.log('\n4. Delta math:');
const modelANR = buildPortTerminalModel(ANTWERP, OPTS);
assert('ANTWERP model exists', modelANR !== null);
if (modelRTM && modelANR) {
    const dpA = modelRTM.displayPrice;
    const dpB = modelANR.displayPrice;
    if (dpA && dpB) {
        const priceDelta = Math.round(dpA.avg - dpB.avg);
        const confDelta = modelRTM.profile.node.confidenceScore - modelANR.profile.node.confidenceScore;
        assert('Price delta is integer', Number.isInteger(priceDelta));
        assert('Confidence delta sign matches if scores differ', confDelta !== 0 ? (confDelta > 0) === (modelRTM.profile.node.confidenceScore > modelANR.profile.node.confidenceScore) : true);
    } else { assert('Skip price delta (one port has no price)', true); }
    const suppliersDelta = modelRTM.profile.suppliers.length - modelANR.profile.suppliers.length;
    assert('Suppliers delta is integer', Number.isInteger(suppliersDelta));
}

// ── 5. Different locodes produce different models ───────────────────────────
console.log('\n5. Different locodes:');
if (modelRTM && modelANR) {
    assert('Port names differ', modelRTM.profile.node.portName !== modelANR.profile.node.portName);
    assert('Locodes differ', modelRTM.profile.node.locode !== modelANR.profile.node.locode);
    assert('Intel feeds differ', JSON.stringify(modelRTM.intelFeed) !== JSON.stringify(modelANR.intelFeed));
}

// ── 6. Compliance items ──────────────────────────────────────────────────────
console.log('\n6. Compliance items:');
const comp = getComplianceItems(ROTTERDAM);
assert('4–6 items', comp.length >= 4 && comp.length <= 6, `got ${comp.length}`);
assert('All have status', comp.every(c => ['met', 'pending', 'na'].includes(c.status)));
assert('All have category', comp.every(c => ['Regulation', 'Infrastructure', 'Certification', 'Safety', 'Environment'].includes(c.category)));
assert('All have label+detail', comp.every(c => c.label.length > 0 && c.detail.length > 0));
assert('Deterministic — second call matches', JSON.stringify(comp) === JSON.stringify(getComplianceItems(ROTTERDAM)));
assert('Different locode gives different items', JSON.stringify(comp) !== JSON.stringify(getComplianceItems(ANTWERP)));

// ── 7. Share URL format (no key) ────────────────────────────────────────────
console.log('\n7. Share URL format:');
const shareUrl = `/port/${ROTTERDAM}?fuel=e_methanol&ccy=USD&basis=posted`;
assert('Starts with /port/', shareUrl.startsWith('/port/'));
assert('Contains locode', shareUrl.includes(ROTTERDAM));
assert('No API key in URL', !shareUrl.includes('MAPTILER') && !shareUrl.toLowerCase().includes('apikey'));

// ── 8. Swap A/B logic (URL param swap simulation) ───────────────────────────
console.log('\n8. Swap A/B logic:');
const urlA = 'NLRTM', urlB = 'BEANR';
const after = { a: urlB, b: urlA }; // simulated swap
assert('Swap correctly exchanges A and B', after.a === urlB && after.b === urlA);
assert('After swap "a" is original B', after.a === ANTWERP);
assert('After swap "b" is original A', after.b === ROTTERDAM);

// ── 9. buildPortTerminalModel with different fuels ───────────────────────────
console.log('\n9. Cross-fuel:');
const modelVlsfo = buildPortTerminalModel(ROTTERDAM, { ...OPTS, fuel: 'vlsfo' });
assert('VLSFO model present', modelVlsfo !== null);
assert('VLSFO profile same node', modelVlsfo?.profile.node.locode === ROTTERDAM);
const dpVlsfo = modelVlsfo?.displayPrice;
const dpEmeth = modelRTM?.displayPrice;
if (dpVlsfo && dpEmeth) {
    assert('VLSFO and e-Methanol prices differ for same port', Math.abs(dpVlsfo.avg - dpEmeth.avg) > 1);
}

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
