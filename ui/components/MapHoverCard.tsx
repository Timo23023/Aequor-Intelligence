import React from 'react';
import { PortIntel } from '../../services/MapService';

export interface MapHoverCardProps {
    portIntel: PortIntel;
    position: { x: number; y: number };
}

const MapHoverCard: React.FC<MapHoverCardProps> = ({ portIntel, position }) => {
    const getEventTypeColor = (type: string): string => {
        const colors: Record<string, string> = {
            supply: '#10b981',
            demand: '#3b82f6',
            regulation: '#eab308',
            disruption: '#ef4444',
            price_proxy: '#a855f7',
            port_update: '#06b6d4',
            project: '#f59e0b',
            analysis: '#8b5cf6',
            other: '#6b7280'
        };
        return colors[type] || colors.other;
    };

    // Clamp position to viewport
    const clampedX = Math.min(Math.max(position.x + 15, 0), window.innerWidth - 220);
    const clampedY = Math.min(Math.max(position.y - 10, 0), window.innerHeight - 200);

    return (
        <div
            style={{
                position: 'fixed',
                left: `${clampedX}px`,
                top: `${clampedY}px`,
                width: '200px',
                backgroundColor: 'rgba(10, 14, 26, 0.98)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                pointerEvents: 'none',
                zIndex: 1000,
                animation: 'fadeSlideIn 0.2s ease-out'
            }}
        >
            {/* Port Header */}
            <div style={{ marginBottom: '8px' }}>
                <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '2px'
                }}>
                    {portIntel.port.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {portIntel.port.code} • {portIntel.port.region?.replace('_', ' ')}
                </div>
            </div>

            {/* Event Counts */}
            <div style={{
                marginBottom: '8px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border-color)'
            }}>
                <div style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--accent-primary)',
                    marginBottom: '4px'
                }}>
                    {portIntel.counts.total}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Total Events
                </div>

                {/* Priority Breakdown */}
                <div style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
                    {portIntel.counts.p1 > 0 && (
                        <div style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            fontWeight: 600
                        }}>
                            P1: {portIntel.counts.p1}
                        </div>
                    )}
                    {portIntel.counts.p2 > 0 && (
                        <div style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            fontWeight: 600
                        }}>
                            P2: {portIntel.counts.p2}
                        </div>
                    )}
                    {portIntel.counts.p3 > 0 && (
                        <div style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            fontWeight: 600
                        }}>
                            P3: {portIntel.counts.p3}
                        </div>
                    )}
                </div>
            </div>

            {/* Top Event Preview */}
            {portIntel.topEvent && (
                <div>
                    <div style={{
                        fontSize: '10px',
                        color: 'var(--text-tertiary)',
                        marginBottom: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        Top Event
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                        <span style={{
                            fontSize: '9px',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            backgroundColor: getEventTypeColor(portIntel.topEvent.eventType || 'other'),
                            color: 'white',
                            fontWeight: 600
                        }}>
                            {portIntel.topEvent.eventType || 'other'}
                        </span>
                    </div>
                    <div style={{
                        fontSize: '11px',
                        color: 'var(--text-primary)',
                        lineHeight: '1.3',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                    }}>
                        {portIntel.topEvent.title}
                    </div>
                    <div style={{
                        fontSize: '10px',
                        color: 'var(--text-tertiary)',
                        marginTop: '4px'
                    }}>
                        {new Date(portIntel.topEvent.timestamp).toLocaleDateString()}
                    </div>
                </div>
            )}

            {/* Animation styles */}
            <style>{`
                @keyframes fadeSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-5px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};

export default MapHoverCard;
