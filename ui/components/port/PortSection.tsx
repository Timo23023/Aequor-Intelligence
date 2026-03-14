/**
 * ui/components/port/PortSection.tsx
 * Consistent section wrapper: sticky heading + anchor id.
 */
import React from 'react';

interface Props {
    id: string;
    title: string;
    children: React.ReactNode;
    action?: React.ReactNode;
}

const PortSection: React.FC<Props> = ({ id, title, children, action }) => (
    <section id={id} style={{ marginBottom: '0', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 20px', backgroundColor: 'rgba(8,11,20,0.97)',
            position: 'sticky', top: 52, zIndex: 20,
            borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)' }}>
                {title}
            </span>
            {action && <div>{action}</div>}
        </div>
        <div style={{ padding: '0' }}>
            {children}
        </div>
    </section>
);

export default PortSection;
