import React, { useState } from 'react';
import { FeedEvent } from '../../domain/types';

interface FeedItemProps {
    event: FeedEvent;
}

export const FeedItem: React.FC<FeedItemProps> = ({ event }) => {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = () => setExpanded(!expanded);

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString();
    };

    return (
        <div className="card" onClick={toggleExpand} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>{event.title}</h3>
                <span className="badge">{event.eventType || 'Event'}</span>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {formatDate(event.timestamp)} • {event.source.provider}
            </div>

            <p style={{ margin: '0 0 12px 0', lineHeight: '1.5' }}>
                {event.summary}
            </p>

            {/* Tags */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {event.tags.map(tag => (
                    <span key={tag} className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', borderColor: 'transparent' }}>
                        #{tag}
                    </span>
                ))}
            </div>

            {/* Primary Source */}
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Source: {event.source.name}
                {event.link && (
                    <a
                        href={event.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginLeft: '8px', color: 'var(--accent-secondary)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        Open Link ↗
                    </a>
                )}
            </div>

            {expanded && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Details</h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                        <div>
                            <strong>ID:</strong> <span style={{ fontFamily: 'monospace' }}>{event.id}</span>
                        </div>
                        <div>
                            <strong>Source Type:</strong> {event.source.type}
                        </div>
                        <div>
                            <strong>Provider:</strong> {event.source.provider}
                        </div>
                        {event.source.retrieved_at && (
                            <div>
                                <strong>Retrieved:</strong> {new Date(event.source.retrieved_at).toLocaleDateString()}
                            </div>
                        )}
                    </div>

                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div>
                            <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Metadata & Metrics</h4>
                            <pre style={{ background: 'var(--bg-primary)', padding: '8px', borderRadius: '4px', overflowX: 'auto', fontSize: '12px' }}>
                                {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
