
import React, { useState, useEffect } from 'react';
import { EventFilters, Port } from '../../domain/types';
import { EventType, FuelType, Region } from '../../domain/constants';
import { portService } from '../../app/compose';

interface FeedFiltersProps {
    onFiltersChange: (filters: EventFilters, sortMode: 'newest' | 'priority') => void;
}

export const FeedFilters: React.FC<FeedFiltersProps> = ({ onFiltersChange }) => {
    const [search, setSearch] = useState('');
    const [selectedFuels, setSelectedFuels] = useState<string[]>([]);
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [selectedEventTypes, setSelectedEventTypes] = useState<EventType[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
    const [sortMode, setSortMode] = useState<'newest' | 'priority'>('newest');
    const [timePreset, setTimePreset] = useState<string>('all');

    // Port Search State
    const [portQuery, setPortQuery] = useState('');
    const [portSuggestions, setPortSuggestions] = useState<Port[]>([]);
    const [selectedPorts, setSelectedPorts] = useState<Port[]>([]); // Store full port objects locally for pills

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            emitFilters();
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    // Debounce Port Search
    useEffect(() => {
        if (!portQuery || portQuery.length < 2) {
            setPortSuggestions([]);
            return;
        }
        const handler = setTimeout(async () => {
            const results = await portService.searchPorts(portQuery);
            setPortSuggestions(results);
        }, 300);
        return () => clearTimeout(handler);
    }, [portQuery]);

    // Immediate effect for checkboxes and dropdowns
    useEffect(() => {
        emitFilters();
    }, [selectedFuels, selectedRegions, selectedEventTypes, selectedPriorities, timePreset, selectedPorts, sortMode]);

    // Helper to handle multiselect changes
    const toggleSelection = <T extends string>(
        current: T[],
        setter: React.Dispatch<React.SetStateAction<T[]>>,
        value: T
    ) => {
        if (current.includes(value)) {
            setter(current.filter(item => item !== value));
        } else {
            setter([...current, value]);
        }
    };

    const addPort = (port: Port) => {
        if (!selectedPorts.find(p => p.id === port.id)) {
            setSelectedPorts([...selectedPorts, port]);
        }
        setPortQuery('');
        setPortSuggestions([]);
    };

    const removePort = (id: string) => {
        setSelectedPorts(selectedPorts.filter(p => p.id !== id));
    };

    const emitFilters = () => {
        const filters: EventFilters = {};

        if (search.trim()) filters.query = search.trim();
        if (selectedFuels.length > 0) filters.fuels = selectedFuels;
        if (selectedRegions.length > 0) filters.regions = selectedRegions;
        if (selectedEventTypes.length > 0) filters.event_types = selectedEventTypes;
        if (selectedPriorities.length > 0) filters.priorities = selectedPriorities;

        // Pass selected port NAMES (contract expects strings)
        if (selectedPorts.length > 0) {
            filters.ports = selectedPorts.map(p => p.name);
        }

        // Time Window
        const now = new Date();
        if (timePreset === '24h') {
            const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            filters.time_from = from.toISOString();
        } else if (timePreset === '7d') {
            const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filters.time_from = from.toISOString();
        } else if (timePreset === '30d') {
            const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            filters.time_from = from.toISOString();
        }

        onFiltersChange(filters, sortMode);
    };

    return (
        <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {/* Search */}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>Search</label>
                    <input
                        type="text"
                        placeholder="Search events..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Time Window */}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>Time Range</label>
                    <select value={timePreset} onChange={(e) => setTimePreset(e.target.value)}>
                        <option value="all">Any Time</option>
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>
                </div>

                {/* Sort Mode */}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>Sort By</label>
                    <select value={sortMode} onChange={(e) => setSortMode(e.target.value as 'newest' | 'priority')}>
                        <option value="newest">Newest First</option>
                        <option value="priority">Priority then Newest</option>
                    </select>
                </div>

                {/* Ports Search with Suggestions */}
                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>Port Selection</label>
                    <input
                        type="text"
                        placeholder="Add port..."
                        value={portQuery}
                        onChange={(e) => setPortQuery(e.target.value)}
                    />
                    {portSuggestions.length > 0 && (
                        <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0,
                            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)',
                            zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                        }}>
                            {portSuggestions.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => addPort(p)}
                                    style={{ padding: '8px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid var(--border-color)' }}
                                >
                                    <strong>{p.name}</strong> <span style={{ color: 'var(--text-secondary)' }}>({p.code})</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Selected Ports Pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                        {selectedPorts.map(p => (
                            <span key={p.id} className="badge" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'default' }}>
                                {p.name}
                                <button
                                    onClick={() => removePort(p.id)}
                                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', lineHeight: 0 }}
                                >
                                    &times;
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                {/* Event Types */}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>Event Types</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                        {Object.values(EventType).map(type => (
                            <label key={type} style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedEventTypes.includes(type)}
                                    onChange={() => toggleSelection(selectedEventTypes, setSelectedEventTypes, type)}
                                    style={{ width: 'auto', marginRight: '8px' }}
                                />
                                {type}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Regions */}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>Regions</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                        {Object.values(Region).map(region => (
                            <label key={region} style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedRegions.includes(region)}
                                    onChange={() => toggleSelection(selectedRegions, setSelectedRegions, region)}
                                    style={{ width: 'auto', marginRight: '8px' }}
                                />
                                {region}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Fuels */}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>Fuels</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                        {Object.values(FuelType).map(fuel => (
                            <label key={fuel} style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedFuels.includes(fuel)}
                                    onChange={() => toggleSelection(selectedFuels, setSelectedFuels, fuel)}
                                    style={{ width: 'auto', marginRight: '8px' }}
                                />
                                {fuel}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Priority */}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>Priority</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {['p1', 'p2', 'p3'].map(pri => (
                            <label key={pri} style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedPriorities.includes(pri)}
                                    onChange={() => toggleSelection(selectedPriorities, setSelectedPriorities, pri)}
                                    style={{ width: 'auto', marginRight: '8px' }}
                                />
                                {pri.toUpperCase()}
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
