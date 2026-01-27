import React from 'react';

const DocsPage: React.FC = () => {
    return (
        <div className="container" style={{ maxWidth: '800px', paddingTop: '24px' }}>
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px' }}>Documentation & Policies</h1>
            </header>

            <section className="card" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--accent-primary)' }}>Data Policy</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
                    <strong>Aequor Intelligence</strong> is a data aggregation platform. We connect to various public and private data sources to provide market intelligence.
                </p>
                <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--error)', marginBottom: '16px' }}>
                    <strong>Disclaimer:</strong> We are NOT a broker. This platform does NOT provide financial advice. All data is for informational purposes only.
                </div>
                <p style={{ lineHeight: '1.6' }}>
                    Users are responsible for verifying data before making commercial decisions.
                </p>
            </section>

            <section className="card">
                <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--accent-primary)' }}>Methods & Limitations</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
                    Data is sourced from:
                </p>
                <ul style={{ lineHeight: '1.6', paddingLeft: '20px', marginBottom: '16px' }}>
                    <li>Public feeds (RSS, APIs)</li>
                    <li>Partner integrations</li>
                    <li><strong>BYOD (Bring Your Own Data):</strong> Private data uploaded by users is restricted to their organization and is never shared publicly.</li>
                </ul>
                <p style={{ lineHeight: '1.6' }}>
                    Latency issues may occur with public feeds. Check the "Retrieved At" timestamp on events to assess freshness.
                </p>
            </section>
        </div>
    );
};

export default DocsPage;
