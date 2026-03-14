
import { FeedEvent, Confidence } from '../../domain/types';
import { TavilyClient, TavilySearchResult } from './TavilyClient';

export interface EnrichmentBudget {
    maxCalls: number;
}

export interface EnrichmentResult {
    enriched: FeedEvent[];
    callsUsed: number;
}

export async function enrichEvents(
    events: FeedEvent[],
    budget: EnrichmentBudget,
    tavily: TavilyClient
): Promise<EnrichmentResult> {
    let callsUsed = 0;
    const enrichedEvents: FeedEvent[] = [];

    // 1. Select Candidates: Low confidence, sort by priority (if available) then timestamp descending
    // Since we don't have explicit priority field in FeedEvent (it's in filters), we'll assume standard processing.
    // "Only enrich events where metadata.confidence === "low""

    // Filter candidates
    const candidates = events.filter(e => {
        const conf = e.metadata?.confidence;
        return conf === 'low' && (!e.metadata?.enrichment); // Don't re-enrich if already done
    });

    // Sort: newest first to maximize relevance? Request said "highest priority first, then newest".
    // We don't have priority. So newest first.
    candidates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Slice to budget
    const toEnrich = candidates.slice(0, budget.maxCalls);
    console.log(`[Enrichment] Selected ${toEnrich.length} candidates from ${candidates.length} low-confidence events.`);

    for (const evt of toEnrich) {
        if (callsUsed >= budget.maxCalls) break;

        try {
            // Build Query
            // "query = `${event.title} maritime ${event.metadata.region}`"
            // "If fuelTypes includes methanol... add keywords"
            let query = `${evt.title} maritime ${evt.metadata?.region || ''}`;

            const fuels = evt.metadata?.fuel_types || []; // we moved it to metadata, remember?
            // Actually PublicIngestionService puts it in metadata AND tags.
            // Let's check where it is. Ideally metadata.fuel_types based on previous fix.

            if (fuels.includes('methanol_green') || fuels.includes('methanol_conventional')) {
                query += " methanol bunker";
            }
            if (fuels.includes('ammonia')) {
                query += " ammonia fuel";
            }

            console.log(`[Enrichment] Searching for: "${query}"...`);

            const results = await tavily.search(query, { maxResults: 5 });
            callsUsed++;

            if (results.length > 0) {
                // Construct Enrichment Data
                const citations = results.map(r => ({
                    title: r.title,
                    url: r.url,
                    source: r.source
                }));

                // Derive short summary from top result content
                let shortSummary = "";
                if (results[0].content) {
                    shortSummary = results[0].content.substring(0, 280);
                    if (shortSummary.length === 280) shortSummary += "...";
                }

                const enrichment = {
                    provider: "tavily",
                    retrievedAt: new Date().toISOString(),
                    query: query,
                    citations: citations,
                    shortSummary: shortSummary,
                    confidenceUpgrade: "medium" as Confidence // upgrade to medium if we found external citations
                };

                // Merge into event
                evt.metadata = {
                    ...evt.metadata,
                    enrichment: enrichment,
                    confidence: "medium" // Upgrade the main confidence too?
                    // Request said: "confidenceUpgrade?: "low"|"medium"" in enrichment object.
                    // "Do NOT overwrite base fields (title/summary) automatically."
                    // But maybe we should upgrade the event confidence field to reflect content quality?
                    // "Keep contract-valid".
                    // I'll update metadata.confidence if I set confidenceUpgrade.
                };
                if (enrichment.confidenceUpgrade) {
                    evt.metadata.confidence = enrichment.confidenceUpgrade;
                }

                enrichedEvents.push(evt);
                console.log(`[Enrichment] Enriched event ${evt.id}`);
            }

        } catch (error: any) {
            console.error(`[Enrichment] Failed to enrich event ${evt.id}: ${error.message}`);
        }
    }

    return {
        enriched: enrichedEvents,
        callsUsed
    };
}
