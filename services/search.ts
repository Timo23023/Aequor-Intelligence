import { FeedEvent } from '../domain/types';

export function matchesQuery(event: FeedEvent, query?: string): boolean {
    if (!query || query.trim() === '') return true;

    const q = query.toLowerCase().trim();

    // Check title
    if (event.title.toLowerCase().includes(q)) return true;

    // Check summary
    if (event.summary.toLowerCase().includes(q)) return true;

    // Check details/metadata (optional expansion)
    if (event.metadata) {
        if (Object.values(event.metadata).some(v => String(v).toLowerCase().includes(q))) return true;
    }

    // Check tags
    if (event.tags.some(t => t.toLowerCase().includes(q))) return true;

    return false;
}

export function searchEvents(events: FeedEvent[], query?: string): FeedEvent[] {
    if (!query) return events;
    return events.filter(e => matchesQuery(e, query));
}
