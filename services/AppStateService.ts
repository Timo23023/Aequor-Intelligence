/**
 * services/AppStateService.ts
 * Parse / serialize global URL params (fuel, ccy, basis).
 * Pure helper functions — no React, no side effects.
 */
import { FuelProduct, Currency, PriceBasis } from '../domain/bunker/types';

export interface GlobalParams {
    fuel: FuelProduct;
    currency: Currency;
    basis: PriceBasis;
}

const VALID_FUELS = new Set<FuelProduct>(['e_methanol', 'e_ammonia', 'vlsfo', 'mgo']);
const VALID_CCYS = new Set<Currency>(['USD', 'EUR']);
const VALID_BASES = new Set<PriceBasis>(['posted', 'dap']);

export const DEFAULTS: GlobalParams = {
    fuel: 'e_methanol',
    currency: 'USD',
    basis: 'posted',
};

/** Parse fuel/ccy/basis from URLSearchParams, filling any missing/invalid values with defaults. */
export function parseGlobalParams(sp: URLSearchParams): GlobalParams {
    const fuel = (sp.get('fuel') as FuelProduct);
    const currency = (sp.get('ccy') as Currency);
    const basis = (sp.get('basis') as PriceBasis);
    return {
        fuel: VALID_FUELS.has(fuel) ? fuel : DEFAULTS.fuel,
        currency: VALID_CCYS.has(currency) ? currency : DEFAULTS.currency,
        basis: VALID_BASES.has(basis) ? basis : DEFAULTS.basis,
    };
}

/** Serialize GlobalParams to partial URL param entries. */
export function serializeGlobalParams(p: GlobalParams): Record<string, string> {
    return { fuel: p.fuel, ccy: p.currency, basis: p.basis };
}

/**
 * If any global param is missing from sp, write all three back as defaults.
 * Call in useEffect on mount (replace: true so it doesn't pollute history).
 */
export function needsCanonical(sp: URLSearchParams): boolean {
    return !VALID_FUELS.has(sp.get('fuel') as FuelProduct)
        || !VALID_CCYS.has(sp.get('ccy') as Currency)
        || !VALID_BASES.has(sp.get('basis') as PriceBasis);
}

/**
 * Return a new URLSearchParams with global params applied.
 * Merges into existing params (preserves other keys like sel, filters…).
 */
export function applyGlobalParams(sp: URLSearchParams, p: GlobalParams): URLSearchParams {
    const next = new URLSearchParams(sp);
    next.set('fuel', p.fuel);
    next.set('ccy', p.currency);
    next.set('basis', p.basis);
    return next;
}

// ── Market filter URL helpers ─────────────────────────────────────────────

export interface MarketFilterParams {
    quickFilter: string[];          // ['available', 'conf75', 'efuels']
    avail: string[];                // availability statuses
    region: string[];               // region keys
    ci: string[];                   // CI grades
    minSup: number;
    priceMin: string;
    priceMax: string;
    sort: string;
    dir: 'asc' | 'desc';
    sel: string;                    // selected locode
}

export const MARKET_FILTER_DEFAULTS: MarketFilterParams = {
    quickFilter: [], avail: [], region: [], ci: [],
    minSup: 0, priceMin: '', priceMax: '',
    sort: 'portName', dir: 'asc', sel: '',
};

export function parseMarketFilters(sp: URLSearchParams): MarketFilterParams {
    const pipe = (key: string) => sp.get(key)?.split('|').filter(Boolean) ?? [];
    const csv = (key: string) => sp.get(key)?.split(',').filter(Boolean) ?? [];
    return {
        quickFilter: pipe('q'),
        avail: pipe('avail'),
        region: csv('region'),
        ci: csv('ci'),
        minSup: parseInt(sp.get('minSup') ?? '0', 10) || 0,
        priceMin: sp.get('priceMin') ?? '',
        priceMax: sp.get('priceMax') ?? '',
        sort: sp.get('sort') ?? 'portName',
        dir: (sp.get('dir') === 'desc' ? 'desc' : 'asc'),
        sel: sp.get('sel') ?? '',
    };
}

export function serializeMarketFilters(f: MarketFilterParams): Record<string, string> {
    const out: Record<string, string> = {};
    if (f.quickFilter.length) out['q'] = f.quickFilter.join('|');
    else out['q'] = '';
    if (f.avail.length) out['avail'] = f.avail.join('|');
    else out['avail'] = '';
    if (f.region.length) out['region'] = f.region.join(',');
    else out['region'] = '';
    if (f.ci.length) out['ci'] = f.ci.join(',');
    else out['ci'] = '';
    out['minSup'] = f.minSup > 0 ? String(f.minSup) : '';
    out['priceMin'] = f.priceMin;
    out['priceMax'] = f.priceMax;
    out['sort'] = f.sort !== 'portName' ? f.sort : '';
    out['dir'] = f.dir !== 'asc' ? f.dir : '';
    out['sel'] = f.sel;
    return out;
}

/** Merge serialized market filters into a URLSearchParams (preserving global params). */
export function applyMarketFilters(sp: URLSearchParams, f: MarketFilterParams): URLSearchParams {
    const next = new URLSearchParams(sp);
    const entries = serializeMarketFilters(f);
    for (const [k, v] of Object.entries(entries)) {
        if (v) next.set(k, v);
        else next.delete(k);
    }
    return next;
}
