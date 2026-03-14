/**
 * ui/components/bunker/BunkerMapMapLibre.tsx
 *
 * MapLibre + MapTiler basemap renderer for the E-Fuel Map.
 * Uses GeoJSON source + layers (no DOM markers).
 * All interactivity delegated to EFuelMapPage via callbacks.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl, { Map, GeoJSONSource, MapMouseEvent, MapGeoJSONFeature } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BunkerNode, FuelProduct, Availability } from '../../../domain/bunker/types';
import { DisplayPrice } from '../../../services/BunkerPricingService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface BunkerMarkerProps {
    locode: string;
    portName: string;
    region: string;
    lat: number;
    lon: number;
    availability: Availability;
    confidenceScore: number;
    confidenceLabel: string;
    ciGrade: string;
    priceAvg: number;
    priceLow: number;
    priceHigh: number;
    unit: string;
    asOf: string;
    selectedFuel: FuelProduct;
    currency: string;
    basis: string;
    hasPrice: boolean;
    compareLabel: '' | 'A' | 'B';   // '' = not pinned
}

interface Props {
    apiKey: string;
    markers: BunkerMarkerProps[];
    flyToTarget?: { lon: number; lat: number } | null;
    onHover: (locode: string, props: BunkerMarkerProps, x: number, y: number) => void;
    onLeave: () => void;
    onClick: (locode: string, props: BunkerMarkerProps) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SOURCE_ID = 'bunkers';
const LAYER_GLOW = 'bunkers-glow';
const LAYER_CIRCLES = 'bunkers-circles';
const LAYER_CMP_RING = 'bunkers-compare-ring';
const LAYER_CMP_LBL = 'bunkers-compare-label';

// MapLibre expression: map availability string → color
const AVAIL_COLOR_EXPR = [
    'match', ['get', 'availability'],
    'available', '#10b981',
    'limited', '#f59e0b',
    'planned', '#3b82f6',
    /* default */ '#6b7280',
] as maplibregl.ExpressionSpecification;

// Stroke width by confidenceLabel
const CONFIDENCE_STROKE_EXPR = [
    'match', ['get', 'confidenceLabel'],
    'high', 3,
    'medium', 2,
    /* default */ 1,
] as maplibregl.ExpressionSpecification;

// Circle radius — increase on hover via feature-state
const RADIUS_EXPR = [
    'case', ['boolean', ['feature-state', 'hover'], false], 11, 7,
] as maplibregl.ExpressionSpecification;

// ---------------------------------------------------------------------------
// GeoJSON builder
// ---------------------------------------------------------------------------
function buildGeoJSON(markers: BunkerMarkerProps[]): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: markers.map(m => ({
            type: 'Feature',
            id: m.locode,           // needed for feature-state
            geometry: { type: 'Point', coordinates: [m.lon, m.lat] },
            properties: { ...m },
        })),
    };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const BunkerMapMapLibre: React.FC<Props> = ({ apiKey, markers, flyToTarget, onHover, onLeave, onClick }) => {
    const STYLE_URL = `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${apiKey}`;
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<Map | null>(null);
    const hoveredId = useRef<string | null>(null);

    // ---------- Map initialisation ----------
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = new Map({
            container: containerRef.current,
            style: STYLE_URL,
            center: [20, 25],
            zoom: 1.8,
            minZoom: 1,
            maxZoom: 14,
            attributionControl: false,
        });
        mapRef.current = map;

        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

        map.on('load', () => {
            // Source with promoteId for stable feature-state
            map.addSource(SOURCE_ID, {
                type: 'geojson',
                data: buildGeoJSON(markers),
                promoteId: 'locode',
            });

            // Glow layer
            map.addLayer({
                id: LAYER_GLOW,
                type: 'circle',
                source: SOURCE_ID,
                paint: {
                    'circle-color': AVAIL_COLOR_EXPR,
                    'circle-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.35, 0.12],
                    'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 22, 14],
                    'circle-blur': 0.9,
                },
            });

            // Main circle layer
            map.addLayer({
                id: LAYER_CIRCLES,
                type: 'circle',
                source: SOURCE_ID,
                paint: {
                    'circle-color': AVAIL_COLOR_EXPR,
                    'circle-opacity': 0.9,
                    'circle-radius': RADIUS_EXPR,
                    'circle-stroke-width': CONFIDENCE_STROKE_EXPR,
                    'circle-stroke-color': 'rgba(255,255,255,0.7)',
                    'circle-stroke-opacity': 0.85,
                },
            });

            // Compare ring layer (yellow=A, orange=B)
            map.addLayer({
                id: LAYER_CMP_RING,
                type: 'circle',
                source: SOURCE_ID,
                filter: ['!=', ['get', 'compareLabel'], ''],
                paint: {
                    'circle-radius': 14,
                    'circle-color': 'transparent',
                    'circle-stroke-width': 3,
                    'circle-stroke-color': ['match', ['get', 'compareLabel'], 'A', '#facc15', '#f97316'],
                    'circle-stroke-opacity': 0.95,
                },
            });

            // Compare label layer showing 'A' or 'B'
            map.addLayer({
                id: LAYER_CMP_LBL,
                type: 'symbol',
                source: SOURCE_ID,
                filter: ['!=', ['get', 'compareLabel'], ''],
                layout: {
                    'text-field': ['get', 'compareLabel'],
                    'text-font': ['Noto Sans Bold', 'Noto Sans Regular'],
                    'text-size': 9,
                    'text-offset': [0, -1.8],
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                },
                paint: {
                    'text-color': ['match', ['get', 'compareLabel'], 'A', '#facc15', '#f97316'],
                    'text-halo-color': 'rgba(0,0,0,0.8)',
                    'text-halo-width': 1.5,
                },
            });
        });

        // Cursor
        map.on('mouseenter', LAYER_CIRCLES, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', LAYER_CIRCLES, () => { map.getCanvas().style.cursor = ''; });

        return () => {
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // only on mount

    // ---------- Hover ----------
    const handleMouseMove = useCallback((e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
        const map = mapRef.current;
        if (!map || !e.features?.length) return;

        const f = e.features[0];
        const id = f.id as string;
        const props = f.properties as BunkerMarkerProps;

        if (hoveredId.current && hoveredId.current !== id) {
            map.setFeatureState({ source: SOURCE_ID, id: hoveredId.current }, { hover: false });
        }
        hoveredId.current = id;
        map.setFeatureState({ source: SOURCE_ID, id }, { hover: true });

        onHover(id, props, e.originalEvent.clientX, e.originalEvent.clientY);
    }, [onHover]);

    const handleMouseLeave = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;
        if (hoveredId.current) {
            map.setFeatureState({ source: SOURCE_ID, id: hoveredId.current }, { hover: false });
            hoveredId.current = null;
        }
        onLeave();
    }, [onLeave]);

    const handleClick = useCallback((e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
        if (!e.features?.length) return;
        const f = e.features[0];
        onClick(f.id as string, f.properties as BunkerMarkerProps);
    }, [onClick]);

    // Register/unregister event handlers whenever callbacks change
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const layerReady = () => map.getLayer(LAYER_CIRCLES);
        if (!layerReady()) return; // not yet loaded; events are attached after 'load'

        map.on('mousemove', LAYER_CIRCLES, handleMouseMove);
        map.on('mouseleave', LAYER_CIRCLES, handleMouseLeave);
        map.on('click', LAYER_CIRCLES, handleClick);

        return () => {
            map.off('mousemove', LAYER_CIRCLES, handleMouseMove);
            map.off('mouseleave', LAYER_CIRCLES, handleMouseLeave);
            map.off('click', LAYER_CIRCLES, handleClick);
        };
    }, [handleMouseMove, handleMouseLeave, handleClick]);

    // Attach initial event handlers once the map loads
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const onLoad = () => {
            map.on('mousemove', LAYER_CIRCLES, handleMouseMove);
            map.on('mouseleave', LAYER_CIRCLES, handleMouseLeave);
            map.on('click', LAYER_CIRCLES, handleClick);
        };

        if (map.isStyleLoaded()) { onLoad(); }
        else { map.once('load', onLoad); }
        // handlers are cleaned up above in the callback-change effect
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---------- Update source data when markers change ----------
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;
        const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
        if (source) source.setData(buildGeoJSON(markers));
    }, [markers]);

    // ---------- flyTo when target changes ----------
    useEffect(() => {
        if (!flyToTarget) return;
        const map = mapRef.current;
        if (!map) return;
        const doFly = () => map.flyTo({ center: [flyToTarget.lon, flyToTarget.lat], zoom: 6, speed: 1.6, essential: true });
        if (map.isStyleLoaded()) doFly();
        else map.once('load', doFly);
    }, [flyToTarget]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
    );
};

export default BunkerMapMapLibre;
