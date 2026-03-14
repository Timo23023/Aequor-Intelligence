/**
 * domain/bunker/validators.ts
 * Minimal runtime guards for the Bunker module.
 * No external dependencies. No any casts.
 */

import { FuelPricePoint } from './types';

// ---------------------------------------------------------------------------
// Confidence score
// ---------------------------------------------------------------------------

/**
 * Asserts that a confidence score is an integer in [0, 100].
 * Throws a descriptive error if invalid.
 */
export function validateConfidenceScore(score: number, context = ''): void {
    if (!Number.isFinite(score)) {
        throw new RangeError(`[BunkerValidator]${context ? ' ' + context + ':' : ''} confidenceScore must be a finite number, got ${score}`);
    }
    if (score < 0 || score > 100) {
        throw new RangeError(`[BunkerValidator]${context ? ' ' + context + ':' : ''} confidenceScore must be 0–100, got ${score}`);
    }
}

// ---------------------------------------------------------------------------
// Price point
// ---------------------------------------------------------------------------

/**
 * Asserts that a FuelPricePoint is internally consistent:
 * - all numeric fields are non-negative
 * - low <= avg <= high
 * Throws a descriptive error if invalid.
 */
export function validatePricePoint(p: FuelPricePoint, context = ''): void {
    const tag = `[BunkerValidator]${context ? ' ' + context + ':' : ''} FuelPricePoint(${p.fuel}/${p.currency}/${p.basis})`;

    if (!Number.isFinite(p.avg) || p.avg < 0) {
        throw new RangeError(`${tag} avg must be a non-negative finite number, got ${p.avg}`);
    }
    if (!Number.isFinite(p.low) || p.low < 0) {
        throw new RangeError(`${tag} low must be a non-negative finite number, got ${p.low}`);
    }
    if (!Number.isFinite(p.high) || p.high < 0) {
        throw new RangeError(`${tag} high must be a non-negative finite number, got ${p.high}`);
    }
    if (p.low > p.avg) {
        throw new RangeError(`${tag} low (${p.low}) must be <= avg (${p.avg})`);
    }
    if (p.avg > p.high) {
        throw new RangeError(`${tag} avg (${p.avg}) must be <= high (${p.high})`);
    }
}
