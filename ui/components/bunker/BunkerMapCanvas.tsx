/**
 * ui/components/bunker/BunkerMapCanvas.tsx
 * Pure SVG equirectangular world map for the E-Fuel Map page.
 * Renders bunker nodes as colored circles; no external map library required.
 */
import React, { useRef, useState } from 'react';
import { BunkerNode, FuelProduct, Availability } from '../../../domain/bunker/types';
import { DisplayPrice } from '../../../services/BunkerPricingService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Props {
    nodes: BunkerNode[];
    getDisplayPrice: (locode: string) => DisplayPrice | null;
    selectedFuel: FuelProduct;
    selectedNode: BunkerNode | null;
    onHover: (node: BunkerNode | null, x: number, y: number) => void;
    onClick: (node: BunkerNode) => void;
}

// ---------------------------------------------------------------------------
// Styling constants
// ---------------------------------------------------------------------------
const AVAIL_COLOR: Record<Availability, string> = {
    available: '#10b981',
    limited: '#f59e0b',
    planned: '#3b82f6',
    unknown: '#6b7280',
};

const CONFIDENCE_STROKE: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
};

// ---------------------------------------------------------------------------
// Projection helpers (equirectangular)
// ---------------------------------------------------------------------------
const W = 800;
const H = 420;
const lngToX = (lng: number) => ((lng + 180) / 360) * W;
const latToY = (lat: number) => ((90 - lat) / 180) * H;

// ---------------------------------------------------------------------------
// Continent bounding boxes [minLng, maxLng, minLat, maxLat]
// ---------------------------------------------------------------------------
const CONTINENTS: Array<[number, number, number, number, string]> = [
    [-170, -52, 15, 72, 'NA'],
    [-82, -34, -56, 12, 'SA'],
    [-25, 60, -35, 38, 'AF'],
    [-10, 40, 35, 72, 'EU'],
    [26, 145, -10, 75, 'AS'],
    [113, 154, -43, -10, 'OC'],
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const BunkerMapCanvas: React.FC<Props> = ({
    nodes, getDisplayPrice, selectedFuel, selectedNode, onHover, onClick,
}) => {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const dragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

    const toSX = (lng: number) => lngToX(lng) * zoom + pan.x;
    const toSY = (lat: number) => latToY(lat) * zoom + pan.y;

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        setZoom(z => Math.max(0.5, Math.min(10, z * (e.deltaY < 0 ? 1.15 : 0.87))));
    };

    const onMouseDown = (e: React.MouseEvent) => {
        dragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    };
    const onMouseMove = (e: React.MouseEvent) => {
        if (dragging.current) {
            setPan({ x: dragStart.current.px + e.clientX - dragStart.current.x, y: dragStart.current.py + e.clientY - dragStart.current.y });
        }
    };
    const onMouseUp = () => { dragging.current = false; };

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab', userSelect: 'none', backgroundColor: '#08111f' }}
            onWheel={handleWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={() => { onMouseUp(); onHover(null, 0, 0); }}
        >
            {/* Ocean gradient background */}
            <defs>
                <linearGradient id="oceanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0b1628" />
                    <stop offset="100%" stopColor="#071020" />
                </linearGradient>
            </defs>
            <rect width={W} height={H} fill="url(#oceanGrad)" />

            {/* Grid lines */}
            {[-60, -30, 0, 30, 60].map(lat => (
                <line key={`lat${lat}`} x1={pan.x} y1={latToY(lat) * zoom + pan.y} x2={W + pan.x} y2={latToY(lat) * zoom + pan.y} stroke="#0f2035" strokeWidth={0.8} />
            ))}
            {[-120, -60, 0, 60, 120].map(lng => (
                <line key={`lng${lng}`} x1={lngToX(lng) * zoom + pan.x} y1={pan.y} x2={lngToX(lng) * zoom + pan.x} y2={H + pan.y} stroke="#0f2035" strokeWidth={0.8} />
            ))}

            {/* Equator */}
            <line x1={pan.x} y1={latToY(0) * zoom + pan.y} x2={W + pan.x} y2={latToY(0) * zoom + pan.y} stroke="#112030" strokeWidth={1.2} />

            {/* Continent blocks */}
            {CONTINENTS.map(([minLng, maxLng, minLat, maxLat, lbl]) => (
                <rect key={lbl}
                    x={lngToX(minLng) * zoom + pan.x}
                    y={latToY(maxLat) * zoom + pan.y}
                    width={(lngToX(maxLng) - lngToX(minLng)) * zoom}
                    height={(latToY(minLat) - latToY(maxLat)) * zoom}
                    fill="#132b20" stroke="#1a3d2a" strokeWidth={0.6} rx={3}
                />
            ))}

            {/* Bunker nodes */}
            {nodes.map(node => {
                const cx = toSX(node.lon);
                const cy = toSY(node.lat);
                const avail = node.availability[selectedFuel];
                const fill = AVAIL_COLOR[avail];
                const sw = CONFIDENCE_STROKE[node.confidenceLabel] ?? 1;
                const r = node.confidenceLabel === 'high' ? 6 : node.confidenceLabel === 'medium' ? 5 : 4;
                const isSelected = selectedNode?.locode === node.locode;
                const dp = getDisplayPrice(node.locode);

                return (
                    <g key={node.locode}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={e => onHover(node, e.clientX, e.clientY)}
                        onMouseMove={e => onHover(node, e.clientX, e.clientY)}
                        onMouseLeave={() => onHover(null, 0, 0)}
                        onClick={e => { e.stopPropagation(); onClick(node); }}
                    >
                        {isSelected && <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke="#ffffff" strokeWidth={2} opacity={0.6} />}
                        <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={0.85} stroke="rgba(255,255,255,0.8)" strokeWidth={sw} />
                        {/* Inline price label at high zoom */}
                        {zoom >= 3 && dp && (
                            <text x={cx + r + 3} y={cy + 4} fill="rgba(255,255,255,0.75)" fontSize={6} fontWeight={600}>
                                {dp.avg.toLocaleString()}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
};

export default BunkerMapCanvas;
