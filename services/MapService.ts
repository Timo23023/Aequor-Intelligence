import { FeedEvent, Port } from '../domain/types';
import { Visibility } from '../domain/constants';

/**
 * Single source of truth for port intelligence aggregation
 */
export interface PortIntel {
    port: Port;
    coordinates: [number, number]; // [lng, lat] for GeoJSON
    counts: {
        total: number;
        p1: number;
        p2: number;
        p3: number;
    };
    topEvent: FeedEvent | null; // highest priority, then newest
    recentEvents: FeedEvent[]; // sorted by priority then timestamp
    eventTypes: string[];
    priority: 'p1' | 'p2' | 'p3';
    matchStats: {
        locode: number;
        portId: number;
        name: number;
        ambiguous: number;
    };
}

export interface PortFeatureProperties {
    port_id: string;
    name: string;
    locode: string;
    region: string;
    priority: 'p1' | 'p2' | 'p3';
    event_count: number;
    p1_count: number;
    p2_count: number;
    p3_count: number;
    top_event_title: string;
    top_event_type: string;
    top_event_time: string;
    event_types: string[];
}

export interface PortFeature {
    type: 'Feature';
    id: string;
    geometry: {
        type: 'Point';
        coordinates: [number, number];
    };
    properties: PortFeatureProperties;
}

export interface FeatureCollection {
    type: 'FeatureCollection';
    features: PortFeature[];
}

/**
 * Match an event to a port using deterministic precedence
 * Returns: { port: Port, matchType: 'locode'|'portId'|'name'|'ambiguous'|null }
 */
function matchEventToPort(
    event: FeedEvent,
    ports: Port[]
): { port: Port | null; matchType: 'locode' | 'portId' | 'name' | 'ambiguous' | null } {
    // Precedence 1: metadata.portLocode or metadata.port_locode
    const portLocode = event.metadata?.portLocode || event.metadata?.port_locode;
    if (portLocode) {
        const port = ports.find(p => p.code === portLocode);
        if (port) {
            return { port, matchType: 'locode' };
        }
    }

    // Precedence 2: metadata.portId or metadata.port_id
    const portId = event.metadata?.portId || event.metadata?.port_id;
    if (portId) {
        const port = ports.find(p => p.id === portId);
        if (port) {
            return { port, matchType: 'portId' };
        }
    }

    // Precedence 3: metadata.portName or metadata.port_name (exact match, case-insensitive)
    const portName = event.metadata?.portName || event.metadata?.port_name;
    if (portName) {
        const port = ports.find(p => p.name.toLowerCase() === portName.toLowerCase());
        if (port) {
            return { port, matchType: 'name' };
        }
    }

    // Precedence 4: Fallback - search in tags, title, summary
    const searchText = [
        ...event.tags,
        event.title,
        event.summary
    ].join(' ').toLowerCase();

    const matches: Port[] = [];
    for (const port of ports) {
        const portNameLower = port.name.toLowerCase();

        // Prefer exact phrase match
        if (searchText.includes(portNameLower)) {
            matches.push(port);
        }
    }

    if (matches.length === 1) {
        return { port: matches[0], matchType: 'name' };
    } else if (matches.length > 1) {
        // Ambiguous: multiple ports match
        return { port: null, matchType: 'ambiguous' };
    }

    return { port: null, matchType: null };
}

/**
 * Extract priority from event tags
 */
function getEventPriority(event: FeedEvent): 'p1' | 'p2' | 'p3' {
    const priorityTag = event.tags.find(t => t.startsWith('priority:'));
    if (priorityTag) {
        const priority = priorityTag.split(':')[1];
        if (priority === 'p1' || priority === 'p2' || priority === 'p3') {
            return priority;
        }
    }
    return 'p3';
}

/**
 * Determine highest priority from counts
 */
function determineHighestPriority(counts: { p1: number; p2: number; p3: number }): 'p1' | 'p2' | 'p3' {
    if (counts.p1 > 0) return 'p1';
    if (counts.p2 > 0) return 'p2';
    return 'p3';
}

/**
 * Sort events by priority (p1 > p2 > p3) then timestamp (newest first)
 */
function sortEvents(events: FeedEvent[]): FeedEvent[] {
    const priorityOrder = { p1: 1, p2: 2, p3: 3 };

    return [...events].sort((a, b) => {
        const aPriority = getEventPriority(a);
        const bPriority = getEventPriority(b);

        // Primary sort: priority
        if (priorityOrder[aPriority] !== priorityOrder[bPriority]) {
            return priorityOrder[aPriority] - priorityOrder[bPriority];
        }

        // Secondary sort: timestamp (newest first)
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
}

/**
 * Build port intelligence from events and ports.
 * Single source of truth for all port aggregation.
 * Pure function - deterministic output.
 * 
 * @param events - Array of feed events
 * @param ports - Array of ports with coordinates
 * @param visibility - Current workspace mode ('public' or 'private')
 * @returns Array of PortIntel with aggregated event data
 */
export function buildPortIntel(
    events: FeedEvent[],
    ports: Port[],
    visibility: Visibility
): PortIntel[] {
    // Filter events by visibility ONCE at the start
    const visibleEvents = events.filter(event => {
        if (visibility === 'public') {
            // In public mode, exclude private_byod sources
            return event.source.type !== 'private_byod';
        }
        // In private mode, show all events
        return true;
    });

    // Group events by port with match tracking
    const eventsByPort = new Map<string, {
        events: FeedEvent[];
        matchStats: { locode: number; portId: number; name: number; ambiguous: number };
    }>();

    visibleEvents.forEach(event => {
        const { port, matchType } = matchEventToPort(event, ports);

        if (port) {
            if (!eventsByPort.has(port.id)) {
                eventsByPort.set(port.id, {
                    events: [],
                    matchStats: { locode: 0, portId: 0, name: 0, ambiguous: 0 }
                });
            }

            const portData = eventsByPort.get(port.id)!;
            portData.events.push(event);

            // Track match type
            if (matchType === 'locode') portData.matchStats.locode++;
            else if (matchType === 'portId') portData.matchStats.portId++;
            else if (matchType === 'name') portData.matchStats.name++;
        } else if (matchType === 'ambiguous') {
            // Track ambiguous matches separately (not assigned to any port)
            // We could log these for debugging, but don't assign to ports
        }
    });

    // Build PortIntel array
    const portIntelArray: PortIntel[] = [];

    eventsByPort.forEach((portData, portId) => {
        const port = ports.find(p => p.id === portId);
        if (!port || !port.coordinates) {
            return; // Skip if port not found or has no coordinates
        }

        // Sort events by priority then timestamp
        const sortedEvents = sortEvents(portData.events);

        // Count by priority
        const counts = {
            total: sortedEvents.length,
            p1: sortedEvents.filter(e => getEventPriority(e) === 'p1').length,
            p2: sortedEvents.filter(e => getEventPriority(e) === 'p2').length,
            p3: sortedEvents.filter(e => getEventPriority(e) === 'p3').length
        };

        // Collect unique event types
        const eventTypes = [...new Set(sortedEvents.map(e => e.eventType).filter(Boolean))] as string[];

        portIntelArray.push({
            port,
            coordinates: [port.coordinates.lng, port.coordinates.lat],
            counts,
            topEvent: sortedEvents[0] || null,
            recentEvents: sortedEvents,
            eventTypes,
            priority: determineHighestPriority(counts),
            matchStats: portData.matchStats
        });
    });

    return portIntelArray;
}

/**
 * Converts PortIntel to GeoJSON FeatureCollection for MapLibre rendering.
 * Pure function - deterministic output with rich feature properties.
 * 
 * @param portIntel - Array of port intelligence data
 * @returns GeoJSON FeatureCollection with Point features
 */
export function buildPortPointFeatures(portIntel: PortIntel[]): FeatureCollection {
    const features: PortFeature[] = portIntel.map(intel => {
        return {
            type: 'Feature',
            id: intel.port.id,
            geometry: {
                type: 'Point',
                coordinates: intel.coordinates
            },
            properties: {
                port_id: intel.port.id,
                name: intel.port.name,
                locode: intel.port.code,
                region: intel.port.region || 'unknown',
                priority: intel.priority,
                event_count: intel.counts.total,
                p1_count: intel.counts.p1,
                p2_count: intel.counts.p2,
                p3_count: intel.counts.p3,
                top_event_title: intel.topEvent?.title || '',
                top_event_type: intel.topEvent?.eventType || 'other',
                top_event_time: intel.topEvent?.timestamp || '',
                event_types: intel.eventTypes
            }
        };
    });

    return {
        type: 'FeatureCollection',
        features
    };
}

// Legacy compatibility - kept for backward compatibility but deprecated
export interface MapPoint {
    id: string;
    coordinates: [number, number];
    port: Port;
    events: FeedEvent[];
    priority: 'p1' | 'p2' | 'p3';
    eventTypes: string[];
}

/**
 * @deprecated Use buildPortIntel instead
 */
export function buildMapPoints(
    events: FeedEvent[],
    ports: Port[],
    visibility: Visibility
): MapPoint[] {
    const portIntel = buildPortIntel(events, ports, visibility);
    return portIntel.map(intel => ({
        id: intel.port.id,
        coordinates: intel.coordinates,
        port: intel.port,
        events: intel.recentEvents,
        priority: intel.priority,
        eventTypes: intel.eventTypes
    }));
}
