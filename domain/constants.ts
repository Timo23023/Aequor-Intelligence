/**
 * Domain Constants - Contract-Aligned Types
 * Source of Truth: docs/CONTRACTS.md
 * 
 * These are string-literal unions, NOT enums, to match CONTRACTS.md exactly.
 * No 'any' casts allowed. External data must map to these exact values.
 */

export type SourceType = "public" | "user_input" | "private_byod";

export type EventType =
    | "supply"
    | "demand"
    | "regulation"
    | "disruption"
    | "project"
    | "port_update"
    | "price_proxy"
    | "analysis"
    | "other";

export type FuelType =
    | "methanol_green"
    | "methanol_conventional"
    | "vlsfo"
    | "ulsfo"
    | "mgo"
    | "lng"
    | "ammonia"
    | "hydrogen"
    | "other";

export type Region =
    | "north_europe"
    | "mediterranean"
    | "middle_east"
    | "asia"
    | "north_america"
    | "south_america"
    | "africa"
    | "oceania"
    | "global"
    | "other";

export type Visibility = "public" | "private";

export type Confidence = "low" | "medium" | "high";

export type DisplayPolicy = "public" | "private";
