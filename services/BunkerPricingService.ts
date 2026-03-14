/**
 * services/BunkerPricingService.ts
 *
 * Pure functions for selecting and displaying bunker price data.
 * No external calls, no any casts. All functions are deterministic.
 */

import { BunkerProfile, FuelProduct, Currency, PriceBasis, FuelPricePoint } from '../domain/bunker/types';

export interface DisplayPrice {
    avg: number;
    low: number;
    high: number;
    unit: 'mt';
    asOf: string;
}

/**
 * Selects the single FuelPricePoint from a profile that matches
 * the given fuel, currency, and basis.
 * Returns null if no matching price point exists.
 */
export function selectPrice(
    profile: BunkerProfile,
    fuel: FuelProduct,
    currency: Currency,
    basis: PriceBasis,
): FuelPricePoint | null {
    return profile.prices.find(
        p => p.fuel === fuel && p.currency === currency && p.basis === basis,
    ) ?? null;
}

/**
 * Selects the best-matching price point and returns a display-ready object.
 *
 * Fallback logic:
 *   1. Exact match (fuel + currency + basis)
 *   2. Same fuel + currency, opposite basis (dap ↔ posted)
 *   3. Same fuel, opposite currency, same basis
 *   4. null — no price data available for this fuel at all
 */
export function computeDisplayPrice(
    profile: BunkerProfile,
    fuel: FuelProduct,
    currency: Currency,
    basis: PriceBasis,
): DisplayPrice | null {
    // 1. Exact match
    const exact = selectPrice(profile, fuel, currency, basis);
    if (exact) return toDisplay(exact);

    // 2. Same fuel + currency, other basis
    const oppositeBase: PriceBasis = basis === 'dap' ? 'posted' : 'dap';
    const fallback1 = selectPrice(profile, fuel, currency, oppositeBase);
    if (fallback1) return toDisplay(fallback1);

    // 3. Same fuel, other currency, same basis
    const otherCurrency: Currency = currency === 'USD' ? 'EUR' : 'USD';
    const fallback2 = selectPrice(profile, fuel, otherCurrency, basis);
    if (fallback2) return toDisplay(fallback2);

    // 4. Nothing
    return null;
}

// ---------------------------------------------------------------------------
// Private helper
// ---------------------------------------------------------------------------

function toDisplay(p: FuelPricePoint): DisplayPrice {
    return { avg: p.avg, low: p.low, high: p.high, unit: p.unit, asOf: p.asOf };
}
