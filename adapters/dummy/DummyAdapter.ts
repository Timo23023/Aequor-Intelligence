import { IMarketDataAdapter } from '../adapter';
import { FeedEvent, Port, Indicator, EventFilters, PortFilters, IndicatorFilters } from '../../domain/types';
import { validateFeedEvent } from '../../domain/validators';
import { SEED_EVENTS } from './seedEvents';
import { SEED_PORTS } from './seedPorts';
import { SEED_INDICATORS } from './seedIndicators';
import { Visibility, SourceType } from '../../domain/constants';

export class DummyAdapter implements IMarketDataAdapter {

    async listEvents(filters: EventFilters): Promise<FeedEvent[]> {
        // Enforce Visibility Boundary
        // If filters.visibility is undefined, we assume a safe default or return all if the caller is trusted?
        if (!filters.visibility) {
            throw new Error('Visibility filter is required for listEvents to ensure data sovereignty.');
        }

        let results = SEED_EVENTS;

        // Validation: Verify all data before processing
        results.forEach(val => validateFeedEvent(val));

        // 1. Enforce Visibility
        if (filters.visibility === Visibility.Public) {
            results = results.filter(e => e.source.type !== SourceType.PrivateByod);
        }

        // 2. Trivial Pagination (Limit) logic only
        if (filters.limit) {
            results = results.slice(0, filters.limit);
        }

        // NOTE: All other filtering (query, fuels, time, etc.) is handled by the Service layer.

        return results;
    }

    async getEvent(id: string): Promise<FeedEvent | null> {
        const event = SEED_EVENTS.find(e => e.id === id);
        if (!event) return null;
        validateFeedEvent(event);
        return event;
    }

    async listPorts(filters: PortFilters): Promise<Port[]> {
        return SEED_PORTS;
    }

    async listIndicators(filters: IndicatorFilters): Promise<Indicator[]> {
        return SEED_INDICATORS;
    }
}
