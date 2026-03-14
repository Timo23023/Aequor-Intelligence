/**
 * Contract Snapshot - Locked values from CONTRACTS.md
 * 
 * These arrays define the exact allowed values for each contract type.
 * Used for:
 * - UI dropdown/checkbox options
 * - Validation in verification scripts
 * - Drift detection (comparing with CONTRACTS.md)
 * 
 * DO NOT modify without updating CONTRACTS.md first.
 */

import type { EventType, FuelType, Region, SourceType, Visibility, Confidence, DisplayPolicy } from './constants';

export const ALLOWED_EVENT_TYPES: readonly EventType[] = [
    "supply",
    "demand",
    "regulation",
    "disruption",
    "project",
    "port_update",
    "price_proxy",
    "analysis",
    "other",
] as const;

export const ALLOWED_FUEL_TYPES: readonly FuelType[] = [
    "methanol_green",
    "methanol_conventional",
    "vlsfo",
    "ulsfo",
    "mgo",
    "lng",
    "ammonia",
    "hydrogen",
    "other",
] as const;

export const ALLOWED_REGIONS: readonly Region[] = [
    "north_europe",
    "mediterranean",
    "middle_east",
    "asia",
    "north_america",
    "south_america",
    "africa",
    "oceania",
    "global",
    "other",
] as const;

export const ALLOWED_SOURCE_TYPES: readonly SourceType[] = [
    "public",
    "user_input",
    "private_byod",
] as const;

export const ALLOWED_VISIBILITIES: readonly Visibility[] = [
    "public",
    "private",
] as const;

export const ALLOWED_CONFIDENCES: readonly Confidence[] = [
    "low",
    "medium",
    "high",
] as const;

export const ALLOWED_DISPLAY_POLICIES: readonly DisplayPolicy[] = [
    "public",
    "private",
] as const;

/**
 * UI-friendly labels (optional, for display purposes)
 * These do NOT change contract values
 */
export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
    "methanol_green": "Green Methanol",
    "methanol_conventional": "Conventional Methanol",
    "vlsfo": "VLSFO",
    "ulsfo": "ULSFO",
    "mgo": "MGO",
    "lng": "LNG",
    "ammonia": "Ammonia",
    "hydrogen": "Hydrogen",
    "other": "Other",
};

export const REGION_LABELS: Record<Region, string> = {
    "north_europe": "North Europe",
    "mediterranean": "Mediterranean",
    "middle_east": "Middle East",
    "asia": "Asia",
    "north_america": "North America",
    "south_america": "South America",
    "africa": "Africa",
    "oceania": "Oceania",
    "global": "Global",
    "other": "Other",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
    "supply": "Supply",
    "demand": "Demand",
    "regulation": "Regulation",
    "disruption": "Disruption",
    "project": "Project",
    "port_update": "Port Update",
    "price_proxy": "Price Proxy",
    "analysis": "Analysis",
    "other": "Other",
};
