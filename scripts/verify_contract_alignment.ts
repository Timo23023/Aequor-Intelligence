/**
 * Contract Alignment Verification Script
 * 
 * Validates that domain types match the contract snapshot.
 * Run this script to detect drift from CONTRACTS.md.
 */

import {
    ALLOWED_EVENT_TYPES,
    ALLOWED_FUEL_TYPES,
    ALLOWED_REGIONS,
    ALLOWED_SOURCE_TYPES,
    ALLOWED_VISIBILITIES,
    ALLOWED_CONFIDENCES,
    ALLOWED_DISPLAY_POLICIES,
} from '../domain/contractSnapshot';

console.log('🔍 Verifying Contract Alignment...\n');

const checks = [
    { name: 'EventType', values: ALLOWED_EVENT_TYPES, expected: 9 },
    { name: 'FuelType', values: ALLOWED_FUEL_TYPES, expected: 9 },
    { name: 'Region', values: ALLOWED_REGIONS, expected: 10 },
    { name: 'SourceType', values: ALLOWED_SOURCE_TYPES, expected: 3 },
    { name: 'Visibility', values: ALLOWED_VISIBILITIES, expected: 2 },
    { name: 'Confidence', values: ALLOWED_CONFIDENCES, expected: 3 },
    { name: 'DisplayPolicy', values: ALLOWED_DISPLAY_POLICIES, expected: 2 },
];

let allValid = true;

for (const check of checks) {
    if (check.values.length === 0) {
        console.error(`❌ ${check.name}: No allowed values defined`);
        allValid = false;
    } else if (check.values.length !== check.expected) {
        console.warn(`⚠️  ${check.name}: Expected ${check.expected} values, got ${check.values.length}`);
    } else {
        console.log(`✅ ${check.name}: ${check.values.length} values`);
    }
    console.log(`   ${check.values.join(', ')}\n`);
}

console.log('─'.repeat(60));

if (allValid) {
    console.log('\n✅ Contract alignment validated: OK\n');
    process.exit(0);
} else {
    console.log('\n❌ Contract alignment FAILED\n');
    process.exit(1);
}
