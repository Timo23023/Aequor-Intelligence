import { FeedEvent, Port, Indicator, EventFilters, PortFilters, IndicatorFilters } from '../domain/types';

export interface IMarketDataAdapter {
    /**
     * List feed events based on filters.
     * MUST filter strictly by visibility.
     */
    listEvents(filters: EventFilters): Promise<FeedEvent[]>;

    /**
     * Get a single event by ID.
     */
    getEvent(id: string): Promise<FeedEvent | null>;

    /**
     * List available ports.
     */
    listPorts(filters: PortFilters): Promise<Port[]>;

    /**
     * List market indicators.
     */
    listIndicators(filters: IndicatorFilters): Promise<Indicator[]>;
}
