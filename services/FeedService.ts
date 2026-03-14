import { IMarketDataAdapter } from '../adapters/adapter';
import { EventFilters, FeedEvent } from '../domain/types';
import type { Visibility } from '../domain/constants';
import { filterByTimeWindow, filterByFuel, filterByRegion, filterByPort, filterByEventType, filterByPriorityTag } from './filtering';
import { searchEvents } from './search';
import { sortByEventTimeDesc, sortByPriorityThenTimeDesc } from './sorting';
import { paginate, PaginationResult } from './pagination';

export class FeedService {
    constructor(private adapter: IMarketDataAdapter) { }

    async listFeed(filters: EventFilters, sortMode: 'newest' | 'priority' = 'newest'): Promise<PaginationResult> {
        if (!filters.visibility) {
            throw new Error('Visibility context is required for listFeed');
        }

        // 1. Fetch RAW events
        const rawEvents = await this.adapter.listEvents({
            visibility: filters.visibility,
            limit: 10000
        });

        let processed = rawEvents;

        // 2. Apply Filters
        processed = filterByTimeWindow(processed, filters.time_from, filters.time_to);
        processed = filterByFuel(processed, filters.fuels);
        processed = filterByRegion(processed, filters.regions);
        processed = filterByPort(processed, filters.ports);
        processed = filterByEventType(processed, filters.event_types);

        // Priority filter (contract-safe via tags)
        if (filters.priorities) {
            processed = filterByPriorityTag(processed, filters.priorities);
        }

        // 3. Search
        if (filters.query) {
            processed = searchEvents(processed, filters.query);
        }

        // 4. Sort (mode-dependent)
        processed = sortMode === 'priority'
            ? sortByPriorityThenTimeDesc(processed)
            : sortByEventTimeDesc(processed);

        // 5. Paginate
        const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
        return paginate(processed, limit, filters.cursor);
    }

    async getEvent(id: string, visibility: Visibility): Promise<FeedEvent> {
        const event = await this.adapter.getEvent(id);

        if (!event) {
            throw new Error(`Event ${id} not found`);
        }

        // Visibility Check
        if (visibility === 'public' && event.source.type === 'private_byod') {
            throw new Error('Access Denied: Private event cannot be accessed in public context');
        }

        return event;
    }
}
