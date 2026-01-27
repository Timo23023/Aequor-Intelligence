import React, { useState, useEffect, useCallback } from 'react';
import { feedService } from '../../app/compose';
import { FeedEvent, EventFilters } from '../../domain/types';
import { FeedList } from '../components/FeedList';
import { FeedFilters as FiltersComponent } from '../components/FeedFilters';
import { useWorkspaceMode } from '../state/workspaceMode';

const MarketOverviewPage: React.FC = () => {
    const { visibility } = useWorkspaceMode();

    const [items, setItems] = useState<FeedEvent[]>([]);
    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [sortMode, setSortMode] = useState<'newest' | 'priority'>('newest');

    // Initial filters using current visibility
    const [filters, setFilters] = useState<EventFilters>({
        visibility: visibility,
        limit: 20
    });

    // Update filters when visibility changes (mode toggle)
    useEffect(() => {
        setFilters(prev => ({ ...prev, visibility, cursor: undefined }));
    }, [visibility]);

    const fetchFeed = useCallback(async (currentFilters: EventFilters, append: boolean = false, mode: 'newest' | 'priority' = 'newest') => {
        setLoading(true);
        try {
            const result = await feedService.listFeed(currentFilters, mode);
            setItems(prev => append ? [...prev, ...result.items] : result.items);
            setCursor(result.nextCursor);
            setHasMore(!!result.nextCursor);
        } catch (error) {
            console.error("Failed to fetch feed:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Effect to refetch when filters or sortMode change
    useEffect(() => {
        fetchFeed(filters, false, sortMode);
    }, [filters, sortMode, fetchFeed]);

    const handleFiltersChange = (newFilters: EventFilters, newSortMode: 'newest' | 'priority') => {
        setFilters(prev => {
            return {
                visibility: visibility,
                limit: 20,
                cursor: undefined,
                ...newFilters
            };
        });
        setSortMode(newSortMode);
    };

    const DEBUG = true;

    const handleLoadMore = () => {
        if (!cursor) return;
        const nextFilters = { ...filters, cursor };
        fetchFeed(nextFilters, true, sortMode);
    };

    return (
        <div className="container">
            <header style={{ marginBottom: '24px', paddingTop: '24px' }}>
                <h1 style={{ fontSize: '24px' }}>Market Overview</h1>
            </header>

            <div style={{ marginBottom: '24px' }}>
                <FiltersComponent onFiltersChange={handleFiltersChange} />
            </div>

            <FeedList items={items} isLoading={loading} />

            {hasMore && (
                <div style={{ textAlign: 'center', marginTop: '24px', paddingBottom: '48px' }}>
                    <button
                        className="outline"
                        onClick={handleLoadMore}
                        disabled={loading}
                        style={{ width: '200px' }}
                    >
                        {loading ? 'Loading...' : 'Load More'}
                    </button>
                </div>
            )}

            {DEBUG && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    right: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    color: '#0f0',
                    padding: '12px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    maxWidth: '400px',
                    zIndex: 9999
                }}>
                    <h4>Debug Panel</h4>
                    <div>Count: {items.length}</div>
                    <div>Next Cursor: {cursor || 'None'}</div>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(filters, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default MarketOverviewPage;
