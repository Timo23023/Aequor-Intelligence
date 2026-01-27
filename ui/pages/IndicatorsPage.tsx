import React, { useEffect, useState } from 'react';
import { indicatorService } from '../../app/compose';
import { Indicator } from '../../domain/types';
import { Visibility } from '../../domain/constants';

const IndicatorsPage: React.FC = () => {
    const [indicators, setIndicators] = useState<Indicator[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIndicators = async () => {
            try {
                const data = await indicatorService.listIndicators({ visibility: Visibility.Public });
                setIndicators(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchIndicators();
    }, []);

    if (loading) return <div className="container">Loading indicators...</div>;

    return (
        <div className="container" style={{ paddingTop: '24px' }}>
            <header style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px' }}>Market Indicators</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Key freight and bunker indices</p>
            </header>

            <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '12px' }}>Name</th>
                            <th style={{ padding: '12px' }}>Value</th>
                            <th style={{ padding: '12px' }}>Unit</th>
                            <th style={{ padding: '12px' }}>Date</th>
                            <th style={{ padding: '12px' }}>Source</th>
                            <th style={{ padding: '12px' }}>Category</th>
                        </tr>
                    </thead>
                    <tbody>
                        {indicators.map(ind => (
                            <tr key={ind.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '12px', fontWeight: 500 }}>{ind.name}</td>
                                <td style={{ padding: '12px' }}>{ind.value.toLocaleString()}</td>
                                <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{ind.unit}</td>
                                <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{new Date(ind.date).toLocaleDateString()}</td>
                                <td style={{ padding: '12px' }}>
                                    <span title={ind.source.provider}>{ind.source.name}</span>
                                </td>
                                <td style={{ padding: '12px' }}>
                                    <span className="badge">{ind.category}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default IndicatorsPage;
