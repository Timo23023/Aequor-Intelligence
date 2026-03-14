/**
 * services/IndicatorAlertsService.ts
 * localStorage-backed indicator alert rules and favorites.
 * Completely separate from port alert rules (different localStorage keys).
 * Phase 12.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AlertRuleType = 'pct_move' | 'crosses_above' | 'crosses_below' | 'volatility_high';
export type AlertWindow = '1d' | '7d' | '30d';

export interface IndicatorAlertRule {
    id: string;
    indicatorId: string;
    indicatorName: string;
    type: AlertRuleType;
    threshold: number;
    window?: AlertWindow;
    enabled: boolean;
    label: string;
    createdAt: string;
}

export interface FiredIndicatorAlert {
    ruleId: string;
    indicatorId: string;
    indicatorName: string;
    message: string;
    firedAt: string;
    severity: 'info' | 'warn' | 'critical';
}

// ---------------------------------------------------------------------------
// localStorage keys (separate namespace from port alerts)
// ---------------------------------------------------------------------------

const RULES_KEY = 'aequor_ind_alert_rules_v1';
const FAVS_KEY = 'aequor_ind_favorites_v1';

// ---------------------------------------------------------------------------
// Rule CRUD
// ---------------------------------------------------------------------------

export function getRules(): IndicatorAlertRule[] {
    try {
        return JSON.parse(localStorage.getItem(RULES_KEY) || '[]') as IndicatorAlertRule[];
    } catch { return []; }
}

export function saveRules(rules: IndicatorAlertRule[]): void {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export function addRule(rule: Omit<IndicatorAlertRule, 'id' | 'createdAt'>): IndicatorAlertRule {
    const rules = getRules();
    const newRule: IndicatorAlertRule = {
        ...rule,
        id: `ir_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
    };
    saveRules([...rules, newRule]);
    return newRule;
}

export function removeRule(id: string): void {
    saveRules(getRules().filter(r => r.id !== id));
}

export function toggleRule(id: string): void {
    saveRules(getRules().map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
}

// ---------------------------------------------------------------------------
// Fired alert derivation (deterministic from current series + rules)
// ---------------------------------------------------------------------------

/**
 * Given an indicator's delta values, determine which of the stored rules fire.
 * This is deterministic — it evaluates rules against current series state.
 */
export function getFiredAlerts(
    deltas: Record<string, { d1: { pct: number }; d7: { pct: number }; d30: { pct: number } }>,
    volatility: Record<string, 'low' | 'med' | 'high'>,
    latestValues: Record<string, number>,
): FiredIndicatorAlert[] {
    const rules = getRules().filter(r => r.enabled);
    const fired: FiredIndicatorAlert[] = [];

    for (const rule of rules) {
        const d = deltas[rule.indicatorId];
        const v = latestValues[rule.indicatorId];
        const vol = volatility[rule.indicatorId];
        if (!d) continue;

        let fires = false;
        let message = '';
        let severity: FiredIndicatorAlert['severity'] = 'info';

        switch (rule.type) {
            case 'pct_move': {
                const pct = rule.window === '1d' ? d.d1.pct
                    : rule.window === '30d' ? d.d30.pct
                        : d.d7.pct;
                fires = Math.abs(pct) >= rule.threshold;
                if (fires) {
                    const sign = pct >= 0 ? '+' : '';
                    message = `${rule.indicatorName} moved ${sign}${pct.toFixed(1)}% over ${rule.window ?? '7d'} (rule: ≥${rule.threshold}%)`;
                    severity = Math.abs(pct) >= rule.threshold * 2 ? 'critical' : 'warn';
                }
                break;
            }
            case 'crosses_above':
                fires = v !== undefined && v >= rule.threshold;
                if (fires) {
                    message = `${rule.indicatorName} crossed above ${rule.threshold} (current: ${v?.toFixed(1)})`;
                    severity = 'warn';
                }
                break;
            case 'crosses_below':
                fires = v !== undefined && v <= rule.threshold;
                if (fires) {
                    message = `${rule.indicatorName} crossed below ${rule.threshold} (current: ${v?.toFixed(1)})`;
                    severity = 'warn';
                }
                break;
            case 'volatility_high':
                fires = vol === 'high';
                if (fires) {
                    message = `${rule.indicatorName} volatility elevated to HIGH`;
                    severity = 'info';
                }
                break;
        }

        if (fires) {
            fired.push({
                ruleId: rule.id,
                indicatorId: rule.indicatorId,
                indicatorName: rule.indicatorName,
                message,
                firedAt: new Date().toISOString(),
                severity,
            });
        }
    }
    return fired;
}

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

export function getFavorites(): Set<string> {
    try {
        const arr = JSON.parse(localStorage.getItem(FAVS_KEY) || '[]') as string[];
        return new Set(arr);
    } catch { return new Set(); }
}

export function toggleFavorite(id: string): void {
    const favs = getFavorites();
    if (favs.has(id)) favs.delete(id);
    else favs.add(id);
    localStorage.setItem(FAVS_KEY, JSON.stringify([...favs]));
}

export function isFavorite(id: string): boolean {
    return getFavorites().has(id);
}

// ---------------------------------------------------------------------------
// Column visibility persistence
// ---------------------------------------------------------------------------

const COL_VIS_KEY = 'aequor_ind_col_vis_v1';
const DEFAULT_VISIBLE = new Set(['name', 'value', 'unit', 'd1pct', 'd7pct', 'd30pct', 'spark', 'category']);

export function getColVisibility(): Set<string> {
    try {
        const stored = JSON.parse(localStorage.getItem(COL_VIS_KEY) || 'null');
        if (Array.isArray(stored)) return new Set<string>(stored);
    } catch { /* ignore */ }
    return new Set(DEFAULT_VISIBLE);
}

export function saveColVisibility(cols: Set<string>): void {
    localStorage.setItem(COL_VIS_KEY, JSON.stringify([...cols]));
}

// ---------------------------------------------------------------------------
// View persistence
// ---------------------------------------------------------------------------

export interface IndicatorView {
    name: string;
    cat: string[];
    onlyFavs: boolean;
    sortCol: string;
    sortDir: 'asc' | 'desc';
}

const VIEWS_KEY = 'aequor_ind_views_v1';

export const DEFAULT_VIEWS: IndicatorView[] = [
    { name: 'Default', cat: [], onlyFavs: false, sortCol: 'd7pct', sortDir: 'desc' },
    { name: 'Freight Focus', cat: ['Freight'], onlyFavs: false, sortCol: 'd7pct', sortDir: 'desc' },
    { name: 'Bunker Benchmarks', cat: ['Bunker'], onlyFavs: false, sortCol: 'd7pct', sortDir: 'desc' },
];

export function getSavedViews(): IndicatorView[] {
    try {
        const stored = JSON.parse(localStorage.getItem(VIEWS_KEY) || 'null') as IndicatorView[] | null;
        if (Array.isArray(stored)) return stored;
    } catch { /* ignore */ }
    return [];
}

export function saveView(view: IndicatorView): void {
    const views = getSavedViews().filter(v => v.name !== view.name);
    localStorage.setItem(VIEWS_KEY, JSON.stringify([...views, view]));
}

export function deleteView(name: string): void {
    localStorage.setItem(VIEWS_KEY, JSON.stringify(getSavedViews().filter(v => v.name !== name)));
}
