import { HybridAdapter } from '../adapters/hybrid/HybridAdapter';
import { validateFeedEvent } from '../domain/validators';

// Mock environment for test if needed, or rely on defaults.
// We want to test logic, so we instantiate HybridAdapter directly.

async function main() {
    console.log("=== Verifying Hybrid Adapter Mode ===");

    const adapter = new HybridAdapter();
    const MIN_EVENTS = 200;

    // 1. Fetch Public Events (Default filters)
    console.log("\n[Test] Fetching events (Hybrid)...");
    const events = await adapter.listEvents({ visibility: 'public', limit: 500 });

    console.log(`- Returned: ${events.length} events`);

    // Assertion: Minimum Density
    if (events.length < MIN_EVENTS) {
        throw new Error(`Failed to meet minimum density. Expected >= ${MIN_EVENTS}, got ${events.length}`);
    }
    console.log("✅ Minimum density met.");

    // Assertion: Synthetic Labeling
    const synthetic = events.filter(e => e.metadata?.synthetic === true);
    console.log(`- Synthetic count: ${synthetic.length}`);

    if (synthetic.length > 0) {
        const sample = synthetic[0];
        if (sample.source.type !== 'user_input') throw new Error("Synthetic event has wrong source type");
        if (sample.metadata?.confidence !== 'low') throw new Error("Synthetic event should have low confidence");
        if (sample.metadata?.syntheticReason !== 'coverage_fill') throw new Error("Synthetic event missing reason");
        console.log("✅ Synthetic labeling correct.");
    } else {
        console.log("ℹ️ No synthetic events generated (Real events sufficient?).");
        // If we have > 200 real events, this is fine.
        // But for this test to be useful, we usually expect some filling if the store is empty-ish.
        // Assuming store has ~30 events from previous tests, we EXPECT synthetic filling.
        if (events.length < 500) {
            // If we didn't hit the limit cap, but still have no synthetic... that implies real events >= MIN_EVENTS
            // If real is 30, we should have added ~170 synthetic.
            // So if synthetic is 0, real must be > 200.
            // But we know real is ~30. So this would be a bug.
            throw new Error("Expected synthetic events to fill the gap, but found none.");
        }
    }

    // Assertion: Validity
    console.log("\n[Test] Validating all events...");
    let valid = 0;
    for (const e of events) {
        try {
            validateFeedEvent(e);
            valid++;
        } catch (err: any) {
            console.error(`Invalid event ${e.id}: ${err.message}`);
        }
    }
    if (valid !== events.length) throw new Error("Validation failed for some events");
    console.log(`✅ All ${valid} events passed contract validation.`);

    console.log("\n✅ Hybrid verification passed.");
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
