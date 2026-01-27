
import { IMarketDataAdapter } from '../adapter';
import { FeedEvent, EventFilters, Port, PortFilters, Indicator, IndicatorFilters } from '../../domain/types';
import { DummyAdapter } from './DummyAdapter';

export class LiveOverlayAdapter implements IMarketDataAdapter {
    private overlayEvents: FeedEvent[] = [];

    constructor(private baseAdapter: DummyAdapter) { }

    addEvent(event: FeedEvent) {
        this.overlayEvents.unshift(event); // Add to top
    }

    async listEvents(filters: EventFilters): Promise<FeedEvent[]> {
        const baseEvents = await this.baseAdapter.listEvents(filters);

        // Simple merge: Overlay events are usually "new", so put them first.
        // We should really re-sort by time and re-filter, but for MVP simulation:

        // 1. Filter overlay events roughly (visibility check needed!)
        const visibleOverlay = this.overlayEvents.filter(e => {
            // Check visibility contract (Public vs Private)
            // Implementation detail: Base adapter handles this logic, we should mirror it or delegate?
            // For now, simple pass-through if public
            // (Assuming overlay events are relevant to current visibility context)
            return true;
        });

        // Combine
        return [...visibleOverlay, ...baseEvents];
    }

    async getEvent(id: string): Promise<FeedEvent | null> {
        const overlay = this.overlayEvents.find(e => e.id === id);
        if (overlay) return overlay;
        return this.baseAdapter.getEvent(id);
    }

    async listPorts(filters: PortFilters): Promise<Port[]> {
        return this.baseAdapter.listPorts(filters);
    }

    async listIndicators(filters: IndicatorFilters): Promise<Indicator[]> {
        return this.baseAdapter.listIndicators(filters);
    }
}
