
import {
    EventFilters,
    FeedEvent,
    Port,
    Indicator,
    PortFilters,
    IndicatorFilters
} from '../../domain/types';
import { IMarketDataAdapter } from '../adapter';
import { EventStore } from '../../services/EventStore';
import { DummyAdapter } from '../dummy/DummyAdapter';

export class PublicIngestionAdapter implements IMarketDataAdapter {
    private store: EventStore;
    private dummy: DummyAdapter;
    private initPromise: Promise<void>;

    constructor() {
        this.store = new EventStore();
        // Start loading, but listEvents will await it
        this.initPromise = this.store.loadFromDisk();
        this.dummy = new DummyAdapter();
    }

    async listEvents(filters: EventFilters): Promise<FeedEvent[]> {
        // Ensure store is loaded
        await this.initPromise;

        // "if visibility !== "public", return []"
        if (filters.visibility && filters.visibility !== 'public') {
            return [];
        }

        const all = this.store.getAll();

        // Simple slicing and filtering could go here if EventStore added them
        // For MVP manual ingestion, we just return all or slice.
        // Filters: region, fuels, etc. should ideally be handled. 
        // FeedService usually handles client-side filtering if adapter returns everything, 
        // OR adapter should filter.
        // The requirements said: "Filtering stays in services (FeedService), adapter stays thin."
        // But also: "listEvents(filters) ... return EventStore.query(filters)"
        // My EventStore.getAll() implementation is dumb.
        // I will just return all and let Service filter, OR implement basic limit.

        let result = all;

        if (filters.limit) {
            result = result.slice(0, filters.limit);
        }
        return result;
    }

    async getEvent(id: string): Promise<FeedEvent | null> {
        await this.initPromise;
        const evt = this.store.getAll().find(e => e.id === id); // Efficient enough for MVP
        return evt || null;
    }

    async listPorts(filters: PortFilters): Promise<Port[]> {
        return this.dummy.listPorts(filters);
    }

    async listIndicators(filters: IndicatorFilters): Promise<Indicator[]> {
        return this.dummy.listIndicators(filters);
    }
}
