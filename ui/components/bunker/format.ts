/**
 * ui/components/bunker/format.ts
 * Formatting utilities for the bunker UI. No logic, no imports from domain/services.
 */

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', EUR: '€' };

/** "$980.0" or "€ 906.5" – 1 decimal, with thousands separator */
export function formatMoney(value: number, currency: string): string {
    const sym = CURRENCY_SYMBOL[currency] ?? currency;
    const formatted = value.toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });
    return `${sym} ${formatted}`;
}

/** "851 – 962" no currency symbol (for compact range display) */
export function formatRange(low: number, high: number): string {
    return `${low.toLocaleString('en-US')} – ${high.toLocaleString('en-US')}`;
}

// ---------------------------------------------------------------------------
// Volume
// ---------------------------------------------------------------------------

/** "4,200" – integer thousands */
export function formatVolume(v: number): string {
    return Math.round(v).toLocaleString('en-US');
}

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

export type ConfidenceResult = {
    label: 'low' | 'medium' | 'high';
    color: string;
    bgColor: string;
};

export function formatConfidence(score: number): ConfidenceResult {
    if (score >= 75) return { label: 'high', color: '#10b981', bgColor: 'rgba(16,185,129,0.12)' };
    if (score >= 45) return { label: 'medium', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)' };
    return { label: 'low', color: '#ef4444', bgColor: 'rgba(239,68,68,0.12)' };
}

// ---------------------------------------------------------------------------
// Date
// ---------------------------------------------------------------------------

/** "2026-01-15" – first 10 chars of ISO string */
export function formatDateShort(iso: string): string {
    return iso ? iso.slice(0, 10) : '—';
}

// ---------------------------------------------------------------------------
// Delivery window
// ---------------------------------------------------------------------------

/** "Jan 15 – Jan 22" */
export function formatDeliveryWindow(startISO: string, endISO: string): string {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    try {
        const s = new Date(startISO).toLocaleDateString('en-US', opts);
        const e = new Date(endISO).toLocaleDateString('en-US', opts);
        return `${s} – ${e}`;
    } catch {
        return `${startISO.slice(5, 10)} – ${endISO.slice(5, 10)}`;
    }
}
