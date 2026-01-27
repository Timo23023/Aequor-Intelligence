import React from 'react';

interface PlaceholderProps {
    title: string;
    description: string;
}

const PlaceholderPage: React.FC<PlaceholderProps> = ({ title, description }) => {
    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
            <div className="card" style={{ textAlign: 'center', padding: '48px', maxWidth: '500px' }}>
                <h1 style={{ marginBottom: '16px' }}>{title}</h1>
                <p style={{ fontSize: '18px', color: 'var(--accent-primary)', marginBottom: '24px', fontWeight: 600 }}>
                    Coming Soon
                </p>
                <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                    {description}
                </p>
            </div>
        </div>
    );
};

export default PlaceholderPage;
