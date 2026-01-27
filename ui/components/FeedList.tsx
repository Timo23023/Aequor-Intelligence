import React from 'react';
import { FeedEvent } from '../../domain/types';
import { FeedItem } from './FeedItem';

interface FeedListProps {
    items: FeedEvent[];
    isLoading?: boolean;
}

export const FeedList: React.FC<FeedListProps> = ({ items, isLoading }) => {
    if (!isLoading && items.length === 0) {
        return (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No events found matching your criteria.
            </div>
        );
    }

    return (
        <div className="feed-list">
            {items.map(item => (
                <FeedItem key={item.id} event={item} />
            ))}
            {isLoading && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Loading events...
                </div>
            )}
        </div>
    );
};
