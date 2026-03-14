import 'dotenv/config'; // Load .env
import { PublicIngestionService } from '../services/PublicIngestionService';

async function main() {
    console.log("=== Public Ingestion Refresh (Manual Trigger) ===");

    // Config Summary
    console.log("Config:");
    console.log(`- Tavily Enabled: ${process.env.TAVILY_ENRICH_ENABLED}`);
    console.log(`- Max Calls:      ${process.env.TAVILY_MAX_CALLS_PER_RUN}`);
    console.log(`- Key Present:    ${!!process.env.TAVILY_API_KEY ? 'Yes' : 'No'}`);

    const service = new PublicIngestionService();
    try {
        const result = await service.refreshOnce();

        console.log("\n=== Refresh Summary ===");
        console.log(`Region Refreshed: ${result.region}`);
        console.log(`Sources Attempted: ${result.sourcesAttempted}`);
        console.log(`Events Fetched:    ${result.eventsFetched}`);
        console.log(`Inserted:          ${result.inserted}`);
        console.log(`Updated:           ${result.updated}`);
        console.log(`Deduped:           ${result.deduped}`);

        if (result.enrichmentStats) {
            console.log(`Enrichmen Calls:   ${result.enrichmentStats.callsUsed}`);
            console.log(`Events Enriched:   ${result.enrichmentStats.enrichedCount}`);
        }

        console.log(`Next Rotation Idx: ${result.newRotationIndex}`);
        console.log("=======================\n");

    } catch (error) {
        console.error("Refresh failed:", error);
        process.exit(1);
    }
}

main();
