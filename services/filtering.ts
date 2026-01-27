import { FeedEvent } from '../domain/types';

export function filterByTimeWindow(events: FeedEvent[], timeFrom?: string, timeTo?: string): FeedEvent[] {
    if (!timeFrom && !timeTo) return events;

    // Normalize timestamps for comparison
    const startMs = timeFrom ? new Date(timeFrom).getTime() : -Infinity;
    const endMs = timeTo ? new Date(timeTo).getTime() : Infinity;

    return events.filter(e => {
        const t = new Date(e.timestamp).getTime();
        return t >= startMs && t <= endMs;
    });
}

export function filterByFuel(events: FeedEvent[], fuels?: string[]): FeedEvent[] {
    if (!fuels || fuels.length === 0) return events;
    return events.filter(e => {
        const metaFuel = e.metadata?.fuel;
        if (metaFuel && fuels.includes(metaFuel)) return true;
        return e.tags.some(tag => fuels.includes(tag));
    });
}

export function filterByRegion(events: FeedEvent[], regions?: string[]): FeedEvent[] {
    if (!regions || regions.length === 0) return events;
    return events.filter(e => {
        const metaRegion = e.metadata?.region;
        if (metaRegion && regions.includes(metaRegion)) return true;
        return e.tags.some(tag => regions.includes(tag));
    });
}

export function filterByPort(events: FeedEvent[], ports?: string[]): FeedEvent[] {
    if (!ports || ports.length === 0) return events;
    return events.filter(e => {
        const metaPort = e.metadata?.port;
        return metaPort && ports.includes(metaPort);
    });
}

export function filterByEventType(events: FeedEvent[], types?: string[]): FeedEvent[] {
    if (!types || types.length === 0) return events;
    return events.filter(e => e.eventType && types.includes(e.eventType));
}

export function filterByPriorityTag(events: FeedEvent[], priorities?: string[]): FeedEvent[] {
    if (!priorities || priorities.length === 0) return events;

    return events.filter(e => {
        // Check if any tag matches "priority:p1", "priority:p2", or "priority:p3"
        return e.tags.some(tag => {
            const match = tag.match(/^priority:(p[123])$/);
            return match && priorities.includes(match[1]);
        });
    });
}

