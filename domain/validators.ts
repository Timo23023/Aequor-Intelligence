import { FeedEvent, SourceRef, EventFilters } from './types';
import { ALLOWED_SOURCE_TYPES } from './contractSnapshot';

export function validateSourceRef(ref: SourceRef): void {
    if (!ref) throw new Error('SourceRef is null or undefined');
    if (!ref.id) throw new Error('SourceRef.id is missing');
    if (!ref.name) throw new Error('SourceRef.name is missing');
    if (!ref.type) throw new Error('SourceRef.type is missing');
    if (!(ALLOWED_SOURCE_TYPES as readonly string[]).includes(ref.type)) {
        throw new Error(`Invalid SourceRef.type: ${ref.type}`);
    }
    if (!ref.provider) throw new Error('SourceRef.provider is missing');
}

export function validateFeedEvent(event: FeedEvent): void {
    if (!event) throw new Error('FeedEvent is null or undefined');
    if (!event.id) throw new Error('FeedEvent.id is missing');
    if (!event.timestamp) throw new Error('FeedEvent.timestamp is missing');
    if (!event.title) throw new Error('FeedEvent.title is missing');
    if (!event.summary) throw new Error('FeedEvent.summary is missing');

    validateSourceRef(event.source);

    // Visibility Rule: Public events cannot reference PRIVATE_BYOD source type
    // Note: We don't have an explicit 'visibility' field on FeedEvent in contracts,
    // but the SourceType dictates visibility.
    // If the event is intended for public consumption, it MUST NOT have a PRIVATE_BYOD source.
    // However, validation context matters. Here we validate structural integrity.
}

export function validateFilters(filters: EventFilters): void {
    if (filters.limit && filters.limit < 0) {
        throw new Error('Filter limit cannot be negative');
    }
}
