
import { buildPortIntel } from '../services/MapService';
import { SEED_EVENTS } from '../adapters/dummy/seedEvents';
import { SEED_PORTS } from '../adapters/dummy/seedPorts';

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

async function verifyMapIntegrity() {
    console.log('Starting Map Integrity Verification...');

    // Test both public and private visibility
    for (const visibility of ['public', 'private'] as const) {
        console.log(`\nVerifying visibility: ${visibility}`);

        const portIntel = buildPortIntel(SEED_EVENTS, SEED_PORTS, visibility);

        console.log(`- Generated intel for ${portIntel.length} ports`);

        let totalEvents = 0;
        let totalMatches = {
            locode: 0,
            portId: 0,
            name: 0,
            ambiguous: 0
        };

        for (const intel of portIntel) {
            // Assert counts match recentEvents length
            assert(intel.counts.total === intel.recentEvents.length,
                `Count mismatch for ${intel.port.name}: ${intel.counts.total} vs ${intel.recentEvents.length}`);

            // Assert priority breakdown sums to total
            assert(intel.counts.p1 + intel.counts.p2 + intel.counts.p3 === intel.counts.total,
                `Priority sum mismatch for ${intel.port.name}`);

            // Assert top event is in recent events
            if (intel.counts.total > 0) {
                assert(intel.topEvent !== null, `Top event missing for ${intel.port.name}`);
                const found = intel.recentEvents.some(e => e.id === intel.topEvent!.id);
                assert(found, `Top event not in recent list for ${intel.port.name}`);
            }

            // Assert priority consistency
            const derivedPriority = intel.counts.p1 > 0 ? 'p1' : (intel.counts.p2 > 0 ? 'p2' : 'p3');
            if (intel.counts.total > 0) {
                assert(intel.priority === derivedPriority, `Priority mismatch for ${intel.port.name}`);
            }

            totalEvents += intel.counts.total;
            totalMatches.locode += intel.matchStats.locode;
            totalMatches.portId += intel.matchStats.portId;
            totalMatches.name += intel.matchStats.name;
            totalMatches.ambiguous += intel.matchStats.ambiguous;
        }

        console.log(`- Verified ${totalEvents} events assigned to ports`);
        console.log('Match Stats:', totalMatches);

        if (totalMatches.locode === 0 && totalEvents > 0) {
            console.warn('WARNING: No LOCODE matches found! Check data generation.');
        } else {
            console.log(`✓ LOCODE matching working (${Math.round(totalMatches.locode / totalEvents * 100)}%)`);
        }

        console.log('✓ Counts consistency: OK');
        console.log('✓ Priority consistency: OK');
    }

    console.log('\n✅ Map integrity validated: OK');
}

verifyMapIntegrity().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
