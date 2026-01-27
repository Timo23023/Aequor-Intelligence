
import { AlertRule, AlertEvent, FeedEvent, EventFilters } from '../domain/types';
import { Visibility } from '../domain/constants';

const RULES_KEY = 'alert_rules';
const ALERTS_KEY = 'alert_events';

export class AlertService {
    private rules: AlertRule[] = [];
    private alerts: AlertEvent[] = [];

    constructor() {
        this.load();
    }

    private load() {
        try {
            const r = localStorage.getItem(RULES_KEY);
            const a = localStorage.getItem(ALERTS_KEY);
            this.rules = r ? JSON.parse(r) : [];
            this.alerts = a ? JSON.parse(a) : [];
        } catch (e) {
            console.error("Failed to load alerts/rules", e);
        }
    }

    private save() {
        localStorage.setItem(RULES_KEY, JSON.stringify(this.rules));
        localStorage.setItem(ALERTS_KEY, JSON.stringify(this.alerts));
    }

    listRules(): AlertRule[] {
        return this.rules;
    }

    addRule(name: string, filters: EventFilters, mode: Visibility): AlertRule {
        const rule: AlertRule = {
            id: 'rule_' + Date.now() + Math.random().toString(36).substr(2, 5),
            name,
            enabled: true,
            filters,
            workspace_mode: mode,
            created_at: new Date().toISOString(),
            last_evaluated_at: new Date().toISOString() // Initialize watermark to NOW so we don't retroactively alert
        };
        this.rules.push(rule);
        this.save();
        return rule;
    }

    deleteRule(id: string) {
        this.rules = this.rules.filter(r => r.id !== id);
        this.save();
    }

    toggleRule(id: string) {
        const r = this.rules.find(r => r.id === id);
        if (r) {
            r.enabled = !r.enabled;
            this.save();
        }
    }

    listAlerts(): AlertEvent[] {
        return this.alerts.sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime());
    }

    evaluateAndPersist(events: FeedEvent[], currentMode: Visibility): AlertEvent[] {
        const newAlerts: AlertEvent[] = [];
        const now = new Date().toISOString();

        this.rules.forEach(rule => {
            if (!rule.enabled) return;

            // Visibility Check:
            // Public Rules only run in Public Mode (or active in Private mode? Requirement says: match mode)
            // Implementation: Simple exact match for now.
            // Actually, usually Private workspaces inherit Public rules.
            // But let's stick to "mode matches rule mode" for simplicity, or 
            // "Private mode checks Private AND Public rules".
            // Let's do Strict Mode Match for MVP correctness to avoid double alerts if switching modes.
            if (rule.workspace_mode !== currentMode) return;

            // Filter events strictly NEWER than watermark
            // (Assumes events are sorted or we check all? We check all new candidates)
            // Ideally we rely on event.timestamp. 
            // But if we backtrack, we might re-alert.
            // Better: only check events where timestamp > last_evaluated_at

            const candidates = events.filter(e => {
                if (!rule.last_evaluated_at) return true;
                return new Date(e.timestamp) > new Date(rule.last_evaluated_at!);
            });

            if (candidates.length > 0) {
                // Determine matches
                candidates.forEach(event => {
                    const matchReason = this.checkMatch(event, rule.filters);
                    if (matchReason) {
                        const alert: AlertEvent = {
                            id: 'alert_' + Date.now() + Math.random(),
                            rule_id: rule.id,
                            event_id: event.id,
                            triggered_at: now,
                            reason: matchReason,
                            viewed: false
                        };
                        newAlerts.push(alert);
                        this.alerts.push(alert);
                    }
                });

                // Update watermark
                rule.last_evaluated_at = now;
            }
        });

        if (newAlerts.length > 0) {
            this.save();
        }

        return newAlerts;
    }

    private checkMatch(event: FeedEvent, filters: EventFilters): string | null {
        // Returns reason if matched, null otherwise
        const reasons: string[] = [];

        if (filters.fuels && filters.fuels.length > 0) {
            // Need intersection. We don't have fuel info on event object directly in contract?
            // Wait, looking at types.ts... FeedEvent has tags and eventType.
            // It does NOT have specific 'fuel' field. Adaptation: check tags or metadata?
            // Or assume tags contain fuel names.
            const hasFuel = filters.fuels.some(f => event.tags.includes(f)); // Simple tag match
            if (!hasFuel) return null;
            reasons.push(`Fuel matched`);
        }

        if (filters.regions && filters.regions.length > 0) {
            // Event doesn't have region field directly?
            // Usually region is implied by Port or tags.
            // Let's assume tags for MVP if not explicit.
            const hasRegion = filters.regions.some(r => event.tags.includes(r));
            if (!hasRegion) return null;
            reasons.push(`Region matched`);
        }

        if (filters.event_types && filters.event_types.length > 0) {
            if (!event.eventType || !filters.event_types.includes(event.eventType)) return null;
            reasons.push(`Type matched`);
        }

        // Keyword Search (basic)
        if (filters.query) {
            const q = filters.query.toLowerCase();
            const txt = (event.title + ' ' + event.summary).toLowerCase();
            if (!txt.includes(q)) return null;
            reasons.push(`Keyword matched`);
        }

        return reasons.join(', ');
    }
}
