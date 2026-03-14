import 'dotenv/config';
import { PublicIngestionService } from '../services/PublicIngestionService';
import { EventStore } from '../services/NodeEventStore';
import { validateFeedEvent } from '../domain/validators';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const ROTATION_FILE = path.join(DATA_DIR, 'rotation.json');
const EVENTS_FILE = path.join(DATA_DIR, 'public_events.json');

async function main() {
    console.log("=== Verifying Tavily Integration ===");

    // Reset Data
    if (fs.existsSync(ROTATION_FILE)) fs.unlinkSync(ROTATION_FILE);
    if (fs.existsSync(EVENTS_FILE)) fs.unlinkSync(EVENTS_FILE);

    // MODE A: Disabled
    console.log("\n[Test] Mode A: Tavily DISABLED");
    process.env.TAVILY_ENRICH_ENABLED = 'false';
    const service = new PublicIngestionService();
    const resA = await service.refreshOnce();

    assert(resA.eventsFetched >= 0, "Should fetch events (or 0 if network fail, but not crash)");
    assert(!resA.enrichmentStats || resA.enrichmentStats.callsUsed === 0, "Should use 0 calls when disabled");

    // Validate Events A
    const store = new EventStore();
    store.loadFromDisk();
    const eventsA = store.getAll();
    eventsA.forEach(e => validateFeedEvent(e));
    console.log("✅ Mode A passed (Validation OK, 0 calls)");

    // MODE B: Enabled (if key exists)
    const apiKey = process.env.TAVILY_API_KEY;
    if (apiKey && apiKey.length > 5) {
        console.log("\n[Test] Mode B: Tavily ENABLED");
        process.env.TAVILY_ENRICH_ENABLED = 'true';
        process.env.TAVILY_MAX_CALLS_PER_RUN = '1';

        // Force reset again to ensure we don't just dedupe everything
        // Or just let it run rotation (region change)
        // Let's run next region.

        const resB = await service.refreshOnce();

        const storeB = new EventStore();
        storeB.loadFromDisk();
        const eventsB = storeB.getAll();
        eventsB.forEach(e => validateFeedEvent(e));

        if (resB.enrichmentStats) {
            console.log(`[Test] Calls Used: ${resB.enrichmentStats.callsUsed}`);
            console.log(`[Test] Enriched: ${resB.enrichmentStats.enrichedCount}`);

            // If we used calls, verify metadata
            if (resB.enrichmentStats.enrichedCount > 0) {
                const enriched = eventsB.find(e => e.metadata?.enrichment);
                assert(!!enriched, "Should find event with metadata.enrichment");
                console.log("✅ Found enriched event metadata.");
            }
        }
        console.log("✅ Mode B passed");
    } else {
        console.log("\n[Test] Mode B Skipped (No API Key found in .env)");
    }
}

function assert(cond: boolean, msg: string) {
    if (!cond) {
        console.error(`❌ Assertion Failed: ${msg}`);
        process.exit(1);
    }
}

main();
