
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import {
    FeedEvent,
    SourceRef,
    Region,
    EventType,
    FuelType,
    Confidence
} from '../domain/types';

import { RSS_SOURCES_BY_REGION, RssSourceDef } from '../sources/rssRegistry';
import { fetchRSS, ParsedItem, RssFetchResult } from './rssFetch';
import { EventStore } from './NodeEventStore';
import { enrichEvents } from './tavily/EnrichmentService';
import { TavilyClient } from './tavily/TavilyClient';
import { SourceHealthStore } from './SourceHealthStore';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const ROTATION_FILE = path.join(DATA_DIR, 'rotation.json');

const ROTATION: Region[] = [
    "north_europe",
    "mediterranean",
    "middle_east",
    "asia",
    "north_america",
    "south_america",
    "africa",
    "oceania",
    "global"
];

function getDayBucket(date: Date): string {
    return date.toISOString().split('T')[0];
}

function stableHash(str: string): string {
    return crypto.createHash('sha256').update(str).digest('hex');
}

export class PublicIngestionService {
    private store: EventStore;
    private healthStore: SourceHealthStore;

    constructor() {
        this.store = new EventStore();
        this.healthStore = new SourceHealthStore();
    }

    public async refreshOnce(): Promise<{
        region: Region;
        sourcesAttempted: number;
        eventsFetched: number;
        inserted: number;
        updated: number;
        deduped: number;
        newRotationIndex: number;
        enrichmentStats?: { callsUsed: number; enrichedCount: number };
        healthSummary?: string;
    }> {
        // 1. Load rotation index
        let rotationIndex = 0;
        if (fs.existsSync(ROTATION_FILE)) {
            try {
                const data = JSON.parse(fs.readFileSync(ROTATION_FILE, 'utf-8'));
                rotationIndex = typeof data.index === 'number' ? data.index : 0;
            } catch (e) {
                console.warn("Failed to read rotation file, defaulting to 0");
            }
        }

        // 2. Determine region
        const region = ROTATION[rotationIndex % ROTATION.length];
        console.log(`[PublicIngestion] Rotation Index: ${rotationIndex}, Region: ${region}`);

        // 3. Load sources
        const sources = RSS_SOURCES_BY_REGION[region] || [];
        console.log(`[PublicIngestion] Found ${sources.length} sources for ${region}`);

        // 4. Load Store
        this.store.loadFromDisk();

        // 5. Fetch & Normalize
        const normalizedEvents: FeedEvent[] = [];
        let sourcesAttempted = 0;
        let eventsFetched = 0;

        for (const src of sources) {
            // Health Check
            if (this.healthStore.shouldSkip(src.id)) {
                console.log(`[PublicIngestion] SKIP ${src.name} (Disabled by Health Check)`);
                continue;
            }

            sourcesAttempted++;
            this.healthStore.recordAttempt(src.id);

            try {
                console.log(`[PublicIngestion] Fetching ${src.name} (${src.url})...`);
                const result = await fetchRSS(src.url);

                if (!result.ok) {
                    const msg = `[PublicIngestion] Failed source ${src.name}: ${result.error.message} (Status: ${result.error.status})`;
                    if (src.mayFail) {
                        console.warn(`[SKIP] ${msg} [Expected Failure]`);
                    } else {
                        console.error(`[WARN] ${msg} [Unexpected Failure]`);
                    }

                    this.healthStore.recordFailure(src.id, result.error.status);
                    continue; // Skip this source
                }

                // Success
                this.healthStore.recordSuccess(src.id);

                console.log(`[PublicIngestion] Fetched ${result.items.length} items from ${src.name}`);

                for (const item of result.items) {
                    eventsFetched++;
                    const evt = this.normalize(item, src, region);
                    if (evt) {
                        normalizedEvents.push(evt);
                    }
                }
            } catch (err: any) {
                console.error(`[PublicIngestion] Critical error processing source ${src.name}: ${err.message}`);
                this.healthStore.recordFailure(src.id, 500);
            }
        }

        if (eventsFetched === 0 && sources.length > 0) {
            console.warn(`[PublicIngestion] No events fetched from any source for ${region}.`);
        }

        // 6. Enrichment Integration
        let enrichmentStats = { callsUsed: 0, enrichedCount: 0 };
        const enrichEnabled = process.env.TAVILY_ENRICH_ENABLED === 'true';
        const apiKey = process.env.TAVILY_API_KEY;

        if (enrichEnabled && apiKey) {
            console.log(`[PublicIngestion] Enrichment ENABLED. Budget: ${process.env.TAVILY_MAX_CALLS_PER_RUN || 1}`);
            try {
                const client = new TavilyClient(apiKey);
                const maxCalls = parseInt(process.env.TAVILY_MAX_CALLS_PER_RUN || '1', 10);

                const enrichResult = await enrichEvents(normalizedEvents, { maxCalls }, client);
                enrichmentStats = {
                    callsUsed: enrichResult.callsUsed,
                    enrichedCount: enrichResult.enriched.length
                };
                console.log(`[PublicIngestion] Enrichment complete. Used ${enrichResult.callsUsed} calls.`);

            } catch (err: any) {
                console.error(`[PublicIngestion] Enrichment failed: ${err.message}`);
            }
        } else {
            console.log(`[PublicIngestion] Enrichment SKIPPED (Enabled: ${enrichEnabled}, Key Present: ${!!apiKey})`);
        }

        // 7. Dedupe & Store
        const result = this.store.upsertMany(normalizedEvents);
        this.store.saveToDisk();

        // 8. Advance Rotation
        const newRotationIndex = rotationIndex + 1;
        fs.writeFileSync(ROTATION_FILE, JSON.stringify({ index: newRotationIndex, lastRun: new Date().toISOString() }), 'utf-8');

        const healthSummary = this.healthStore.getHealthStats();

        return {
            region,
            sourcesAttempted,
            eventsFetched,
            inserted: result.inserted,
            updated: result.updated,
            deduped: result.deduped,
            newRotationIndex,
            enrichmentStats,
            healthSummary
        };
    }

    private normalize(item: ParsedItem, source: RssSourceDef, region: Region): FeedEvent | null {
        // Validation: Must have title or summary
        if (!item.title && !item.contentSnippet) return null;

        const title = (item.title || "Untitled").trim();
        const link = item.link || "";

        // Timestamp
        let timestamp = new Date().toISOString();
        if (item.pubDate) {
            try {
                timestamp = new Date(item.pubDate).toISOString();
            } catch (e) { /* fallback */ }
        } else if (item.isoDate) {
            timestamp = item.isoDate;
        }

        // Summary (max 280)
        let summary = "";
        if (item.contentSnippet) {
            summary = item.contentSnippet;
        } else if (item.content) {
            summary = item.content;
        }
        if (summary.length > 280) {
            summary = summary.substring(0, 277) + "...";
        }

        // ID Stability
        const idRaw = `${source.id}|${link || title}|${getDayBucket(new Date(timestamp))}`;
        const id = stableHash(idRaw);

        // Inference
        const eventType = this.inferEventType(title, summary);
        const fuelTypes = this.inferFuelTypes(title, summary);

        // Confidence
        let confidence: Confidence = "low";
        const strongEvent = eventType !== "other";
        const strongFuel = !fuelTypes.includes("other") || fuelTypes.length > 1;

        if (strongEvent && strongFuel) confidence = "high";
        else if (strongEvent || strongFuel) confidence = "medium";

        const event: FeedEvent = {
            id,
            timestamp,
            title,
            summary,
            source: {
                id: source.id,
                name: source.name,
                type: "public",
                provider: source.name,
                retrievedAt: new Date().toISOString()
            },
            eventType,
            fuel_types: fuelTypes,
            metadata: {
                region,
                url: link,
                rawSourceId: source.id,
                retrievedAt: new Date().toISOString(),
                confidence,
                fuel_types: fuelTypes
            }
        } as any;

        // Fix casing for TS interface if needed
        event.fuel_types = fuelTypes;

        return validEventOrNull(event);
    }

    private inferEventType(title: string, summary: string): EventType {
        const text = (title + " " + summary).toLowerCase();

        if (text.match(/capacity|production|output|plant|bunker supply/)) return "supply";
        if (text.match(/demand|orders|consumption|charter/)) return "demand";
        if (text.match(/imo|eu|policy|sanction|compliance/)) return "regulation";
        if (text.match(/strike|accident|collision|closure|delay/)) return "disruption";
        if (text.match(/project|investment|pilot|demo|facility/)) return "project";
        if (text.match(/port|terminal|congestion|berth|draft/)) return "port_update";
        if (text.match(/price|spread|premium|bunker price|freight rate/)) return "price_proxy";
        if (text.match(/outlook|report|analysis|forecast/)) return "analysis";

        return "other";
    }

    private inferFuelTypes(title: string, summary: string): FuelType[] {
        const text = (title + " " + summary).toLowerCase();
        const types: FuelType[] = [];

        if (text.includes("green methanol") || text.includes("e-methanol")) types.push("methanol_green");
        else if (text.includes("methanol")) types.push("methanol_conventional");

        if (text.includes("vlsfo")) types.push("vlsfo");
        if (text.includes("ulsfo")) types.push("ulsfo");
        if (text.includes("mgo") || text.includes("lsmgo")) types.push("mgo");
        if (text.includes("lng")) types.push("lng");
        if (text.includes("ammonia")) types.push("ammonia");
        if (text.includes("hydrogen")) types.push("hydrogen");

        if (types.length === 0) types.push("other");
        return types;
    }
}

function validEventOrNull(e: any): FeedEvent | null {
    if (!e.id || !e.title || !e.timestamp) return null;
    return e as FeedEvent;
}
