import { FeedEvent } from '../domain/types';

export function sortByEventTimeDesc(events: FeedEvent[]): FeedEvent[] {
    return [...events].sort((a, b) => { // defensive copy
        const tA = new Date(a.timestamp).getTime();
        const tB = new Date(b.timestamp).getTime();
        // Newest (larger timestamp) first
        return tB - tA;
    });
}

function getPriority(event: FeedEvent): number {
    // Extract priority from tags: "priority:p1" -> 1, "priority:p2" -> 2, etc.
    const priorityTag = event.tags.find(tag => tag.startsWith('priority:'));
    if (!priorityTag) return 999; // No priority = lowest

    const match = priorityTag.match(/^priority:p([123])$/);
    if (!match) return 999;

    return parseInt(match[1], 10); // p1 = 1 (highest), p3 = 3 (lowest)
}

export function sortByPriorityThenTimeDesc(events: FeedEvent[]): FeedEvent[] {
    return [...events].sort((a, b) => {
        const priA = getPriority(a);
        const priB = getPriority(b);

        // First sort by priority (lower number = higher priority)
        if (priA !== priB) {
            return priA - priB;
        }

        // Then by timestamp (newest first)
        const tA = new Date(a.timestamp).getTime();
        const tB = new Date(b.timestamp).getTime();
        return tB - tA;
    });
}

