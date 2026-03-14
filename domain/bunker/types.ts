/**
 * domain/bunker/types.ts
 * Contract types for the Bunker Intelligence module.
 * Phase 1: Offline seeds only — no API surface, no any casts.
 */

import { Region } from '../constants';

// ---------------------------------------------------------------------------
// Primitive type aliases
// ---------------------------------------------------------------------------

export type Currency = "USD" | "EUR";

export type PriceBasis = "dap" | "posted";

export type Availability = "available" | "limited" | "planned" | "unknown";

export type CIGrade = "A" | "B" | "C" | "D" | "E" | "F" | "unknown";

export type FuelProduct =
    | "e_methanol"
    | "e_ammonia"
    | "vlsfo"
    | "mgo"
    | "other";

export type ConfidenceLabel = "low" | "medium" | "high";

// ---------------------------------------------------------------------------
// Core domain interfaces
// ---------------------------------------------------------------------------

/**
 * A port node that supplies or plans to supply marine bunker fuels.
 * Keyed by UN/LOCODE for cross-reference with existing Port data.
 */
export interface BunkerNode {
    locode: string;
    portName: string;
    region: Region;
    lat: number;
    lon: number;
    /** Availability per fuel product. Every node MUST declare all FuelProducts. */
    availability: Record<FuelProduct, Availability>;
    /** 0–100 numeric score based on source quality and recency. */
    confidenceScore: number;
    /** Derived from confidenceScore (>=75 high, >=45 medium, else low). */
    confidenceLabel: ConfidenceLabel;
    /** Carbon Intensity grade per e-fuel. Conventional fuels may omit. */
    ciGrade: Partial<Record<FuelProduct, CIGrade>>;
    lastUpdated: string; // ISO 8601
}

/**
 * A single price point for a fuel in a given currency and basis.
 */
export interface FuelPricePoint {
    fuel: FuelProduct;
    currency: Currency;
    basis: PriceBasis;
    avg: number;
    low: number;
    high: number;
    unit: "mt"; // fixed for demo
    asOf: string; // ISO 8601
    sources: string[];
}

/**
 * Summary card for a single bunker supplier at a port.
 */
export interface SupplierCard {
    supplierId: string;
    name: string;
    fuels: FuelProduct[];
    ciGrades?: Partial<Record<FuelProduct, CIGrade>>;
    typicalDeliveryWindowDays: { min: number; max: number };
    reliabilityScore?: number; // 0–100, optional for demo seeds
}

/**
 * A single level in the indicative order book (bid or ask).
 */
export interface OrderBookLevel {
    side: "bid" | "ask";
    price: number;
    volumeMt: number;
    currency: Currency;
    basis: PriceBasis;
    deliveryWindow: { startISO: string; endISO: string };
    counterpartyMasked: string;
    status: "indicative" | "firm";
    timestamp: string; // ISO 8601
}

/**
 * Full bunker intelligence profile for a single port node.
 */
export interface BunkerProfile {
    node: BunkerNode;
    /** Price points across fuels, currencies, and bases. */
    prices: FuelPricePoint[];
    suppliers: SupplierCard[];
    /** Combined bid + ask order book. */
    orderBook: OrderBookLevel[];
    notes?: string[];
}
