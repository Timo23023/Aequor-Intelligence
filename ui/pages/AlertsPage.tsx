
import React, { useState, useEffect } from 'react';
import { alertService, feedService, liveAdapter } from '../../app/compose';
import { AlertRule, AlertEvent, EventFilters, FeedEvent } from '../../domain/types';
import { useWorkspaceMode } from '../state/workspaceMode';
import { EventType, Region, FuelType, SourceType } from '../../domain/constants';

const AlertsPage: React.FC = () => {
    const { visibility } = useWorkspaceMode();
    const [rules, setRules] = useState<AlertRule[]>([]);
    const [alerts, setAlerts] = useState<AlertEvent[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [keyword, setKeyword] = useState('');
    const [selRegion, setSelRegion] = useState<Region | ''>('');
    const [selFuel, setSelFuel] = useState<FuelType | ''>('');

    const refresh = () => {
        setRules([...alertService.listRules()]); // copy to force re-render
        setAlerts([...alertService.listAlerts()]);
    };

    useEffect(() => {
        refresh();
    }, []);

    const createRule = () => {
        const filters: EventFilters = {};
        if (keyword) filters.query = keyword;
        if (selRegion) filters.regions = [selRegion];
        if (selFuel) filters.fuels = [selFuel];

        alertService.addRule(name, filters, visibility);
        setIsCreating(false);
        refresh();
    };

    const deleteRule = (id: string) => {
        alertService.deleteRule(id);
        refresh();
    };

    const toggleRule = (id: string) => {
        alertService.toggleRule(id);
        refresh();
    };

    const simulateEvent = async () => {
        // Create a synthetic event that triggers our rule
        const now = new Date();
        const synthetic: FeedEvent = {
            id: 'sim_' + Date.now(),
            title: `SIMULATION: Methanol Bunkering available in North Europe`,
            summary: `Simulated event to test alerting logic.`,
            timestamp: now.toISOString(),
            source: { id: 'sim', name: 'Simulated', type: SourceType.Public, provider: 'Sim' },
            tags: [FuelType.Methanol, Region.NorthEurope],
            eventType: EventType.Regulatory
        };

        // Inject into overlay
        liveAdapter.addEvent(synthetic);

        // Fetch "new" events (in real app, this would be a periodic poller or socket)
        // Here we just pull from feedService manually
        const rawEvents = await feedService.listFeed({ visibility, limit: 10 }); // Just get top few

        // Trigger Evaluation
        alertService.evaluateAndPersist(rawEvents.items, visibility);

        refresh();
    };

    return (
        <div className="container" style={{ paddingTop: '24px' }}>
            <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>Alerts & Watchlist</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Monitor market events in {visibility} mode.</p>
                </div>
                <button className="primary" onClick={simulateEvent}>Simulate New Event</button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>

                {/* Rules Section */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '18px' }}>Rules</h2>
                        <button className="outline" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setIsCreating(!isCreating)}>
                            {isCreating ? 'Cancel' : '+ New Rule'}
                        </button>
                    </div>

                    {isCreating && (
                        <div className="card" style={{ marginBottom: '16px' }}>
                            <input
                                type="text" placeholder="Rule Name"
                                value={name} onChange={e => setName(e.target.value)}
                                style={{ marginBottom: '8px' }}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                <select value={selRegion} onChange={e => setSelRegion(e.target.value as Region)}>
                                    <option value="">Any Region</option>
                                    {Object.values(Region).map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <select value={selFuel} onChange={e => setSelFuel(e.target.value as FuelType)}>
                                    <option value="">Any Fuel</option>
                                    {Object.values(FuelType).map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <input
                                type="text" placeholder="Keyword (optional)"
                                value={keyword} onChange={e => setKeyword(e.target.value)}
                                style={{ marginBottom: '8px' }}
                            />
                            <button className="primary" style={{ width: '100%' }} onClick={createRule}>Save Rule</button>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {rules.filter(r => r.workspace_mode === visibility).map(rule => (
                            <div key={rule.id} className="card" style={{ padding: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <h3 style={{ fontSize: '14px', margin: 0, fontWeight: 600 }}>{rule.name}</h3>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <label style={{ fontSize: '11px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={rule.enabled} onChange={() => toggleRule(rule.id)} /> On
                                        </label>
                                        <button onClick={() => deleteRule(rule.id)} style={{ padding: 0, background: 'none', border: 'none', color: 'var(--error)' }}>&times;</button>
                                    </div>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    Filters: {[
                                        rule.filters.regions?.join(', '),
                                        rule.filters.fuels?.join(', '),
                                        rule.filters.query
                                    ].filter(Boolean).join(' • ') || 'None'}
                                </div>
                            </div>
                        ))}
                        {rules.filter(r => r.workspace_mode === visibility).length === 0 && (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>No rules created for {visibility} mode.</div>
                        )}
                    </div>
                </div>

                {/* Alerts Feed */}
                <div>
                    <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Triggered Alerts</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {alerts.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                                No alerts generated yet.
                            </div>
                        ) : (
                            alerts.map(alert => {
                                const rule = rules.find(r => r.id === alert.rule_id);
                                return (
                                    <div key={alert.id} className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--warning)' }}>
                                                Matched: {rule?.name || 'Unknown Rule'}
                                            </span>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                {new Date(alert.triggered_at).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>
                                            {alert.reason}
                                        </p>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            Event ID: {alert.event_id}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertsPage;
