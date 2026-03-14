import { EventFilters, FeedEvent, Confidence } from '../../domain/types';
import { IMarketDataAdapter } from '../adapter';
import { PublicIngestionAdapter } from '../public/PublicIngestionAdapter';
// We assume DummyAdapter is exported. If not, we might need to verify.
// In Phase 7A it was created? Or pre-existing?
// Checking compose.ts: "import { DummyAdapter } from '../adapters/dummy/DummyAdapter';"
import { DummyAdapter } from '../dummy/DummyAdapter';
import crypto from 'node:crypto';

// Constants for Hybrid Logic
const MIN_EVENTS = 200; // Minimum density required
const SAFE_CAP = 2000;  // Max real events to fetch

export class HybridAdapter implements IMarketDataAdapter {
    private publicAdapter: PublicIngestionAdapter;
    private dummyAdapter: DummyAdapter;

    constructor() {
        this.publicAdapter = new PublicIngestionAdapter();
        this.dummyAdapter = new DummyAdapter();
    }

    public async listEvents(filters: EventFilters): Promise<FeedEvent[]> {
        // 1. Private/Internal View -> Dummy Only (Legacy behavior preservation)
        if (filters.visibility && filters.visibility !== 'public') {
            return this.dummyAdapter.listEvents(filters);
        }

        // 2. Public View -> Fetch Real Events first
        // We ask for a broad "public" set from the store (limited by safety cap)
        const realEvents = await this.publicAdapter.listEvents({
            ...filters,
            visibility: 'public',
            limit: SAFE_CAP
        });

        // 3. Coverage Check
        // If we have "enough" events, we might return just them?
        // OR does the user want us to ALWAYS ensure density?
        // "Ensure minimum baseline supply: if ingestedEvents length < MIN_EVENTS... add dummy events"

        if (realEvents.length >= MIN_EVENTS) {
            // Apply sorting/limit from original filters if necessary, 
            // but PublicAdapter.listEvents likely did some.
            // However, we just fetched with SAFE_CAP.
            // If original limit was small, PublicAdapter returned small.
            // But we need to know the *TOTAL* available to decide if we need dummy.
            // If the user requested limit=10, and we got 10... we don't know if we have 200.
            // But usually we load all matches from store in adapter?
            // PublicIngestionAdapter logic: "return EventStore.getAll() with trivial limit slicing".
            // So if we passed SAFE_CAP, we got up to 2000.

            // If we have enough, just return them (re-sliced to original limit if needed)
            return this.sliceToLimit(realEvents, filters.limit);
        }

        // 4. Fill with Dummy Data
        const needed = MIN_EVENTS - realEvents.length;
        console.log(`[HybridAdapter] Real events: ${realEvents.length}. Filling with ${needed} dummy events.`);

        // Get dummy events (enough to fill)
        // DummyAdapter usually returns deterministic set.
        const dummyEvents = await this.dummyAdapter.listEvents({
            ...filters,
            limit: needed + 50 // Fetch a bit more to ensure we have enough after potential overlap (though unlikely)
        });

        const filledEvents: FeedEvent[] = [...realEvents];
        const existingIds = new Set(realEvents.map(e => e.id));

        for (const d of dummyEvents) {
            if (filledEvents.length >= MIN_EVENTS) break;

            // Dedupe check
            if (existingIds.has(d.id)) continue;

            // Label as Synthetic
            const synthetic: FeedEvent = {
                ...d,
                source: {
                    ...d.source,
                    type: 'user_input', // Contract-valid "user_input"
                    provider: 'dummy_seed'
                },
                metadata: {
                    ...d.metadata,
                    // We need to be careful not to break contract. metadata is any?
                    // "metadata must include: region, url, ..."
                    // Let's add the synthetic flags
                    synthetic: true,
                    syntheticReason: 'coverage_fill',
                    syntheticTier: 'demo',
                    confidence: 'low' as Confidence, // Force low confidence
                }
            } as any; // Cast to avoid strict type complaints if metadata interface is rigid, but it's usually flexible in TS

            filledEvents.push(synthetic);
            existingIds.add(synthetic.id);
        }

        return this.sliceToLimit(filledEvents, filters.limit);
    }

    public async getEvent(id: string): Promise<FeedEvent | null> {
        // Try public first
        const publicEvent = await this.publicAdapter.getEvent(id);
        if (publicEvent) return publicEvent;

        // Fallback to dummy
        return this.dummyAdapter.getEvent(id);
    }

    public async listPorts(): Promise<any[]> {
        return this.dummyAdapter.listPorts();
    }

    public async listIndicators(): Promise<any[]> {
        return this.dummyAdapter.listIndicators();
    }

    private sliceToLimit(events: FeedEvent[], limit?: number): FeedEvent[] {
        if (!limit) return events;
        return events.slice(0, limit);
    }
}
