import { SourceType, EventType, Visibility } from './constants';

export interface SourceRef {
    id: string;
    name: string;
    type: SourceType;
    provider: string;
    license_notes?: string;
    retrieved_at?: string;
}

export interface FeedEvent {
    id: string;
    timestamp: string; // ISO 8601
    title: string;
    summary: string;
    source: SourceRef;
    tags: string[];
    link?: string;
    metadata?: Record<string, any>;
    eventType?: EventType; // Optional based on contracts, but good for filtering
}

export interface Port {
    id: string;
    name: string;
    code: string; // UN/LOCODE
    coordinates: { lat: number; lng: number };
    region?: string;
}

export interface Indicator {
    id: string;
    name: string;
    value: number;
    unit: string;
    date: string; // ISO 8601
    source: SourceRef;
    category?: string;
}

export interface EventFilters {
    query?: string;
    fuels?: string[];
    regions?: string[];
    ports?: string[];
    event_types?: EventType[];
    priorities?: string[]; // p1, p2, p3
    visibility?: Visibility;
    time_from?: string;
    time_to?: string;
    limit?: number;
    cursor?: string;
}

export interface PortFilters {
    search?: string;
    region?: string;
}

export interface IndicatorFilters {
    category?: string;
    startDate?: string;
    visibility?: Visibility;
}

export interface VoyageScenarioInput {
    fuel_type: string;
    currency: string;
    price_low: number;
    price_base: number;
    price_high: number;

    // Consumption: Either total OR (per_day * days)
    fuel_total_tonnes?: number;
    fuel_tonnes_per_day?: number;
    days_at_sea?: number;

    // Optional route info
    origin_port?: string;
    destination_port?: string;
    distance_nm?: number;
}

export interface VoyageScenarioOutput {
    fuel_total_tonnes_used: number;
    results: {
        cost_low: number;
        cost_base: number;
        cost_high: number;
        currency: string;
    };
    sensitivity: {
        primary_driver: string;
        notes?: string;
    };
    disclaimer: string;
}

export interface AlertRule {
    id: string;
    name: string;
    enabled: boolean;
    filters: EventFilters;
    workspace_mode: Visibility; // 'public' triggers on public events, 'private' on both (depending on implementation details)
    last_evaluated_at?: string; // Watermark
    created_at: string;
}

export interface AlertEvent {
    id: string;
    rule_id: string;
    event_id: string;
    triggered_at: string;
    reason: string;
    viewed: boolean;
}
