import { FeedEvent } from '../domain/types';

export interface PaginationResult {
    items: FeedEvent[];
    nextCursor?: string;
}

export function encodeCursor(offset: number): string {
    return Buffer.from(offset.toString()).toString('base64');
}

export function decodeCursor(cursor?: string): number {
    if (!cursor) return 0;
    try {
        const val = Buffer.from(cursor, 'base64').toString('ascii');
        const num = parseInt(val, 10);
        return isNaN(num) ? 0 : num;
    } catch {
        return 0;
    }
}

export function paginate(events: FeedEvent[], limit: number = 20, cursor?: string): PaginationResult {
    const offset = decodeCursor(cursor);
    const endIndex = offset + limit;

    const items = events.slice(offset, endIndex);
    const hasMore = endIndex < events.length;

    return {
        items,
        nextCursor: hasMore ? encodeCursor(endIndex) : undefined
    };
}
