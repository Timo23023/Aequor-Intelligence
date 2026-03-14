import { Port } from '../domain/types';

export interface Corridor {
    id: string;
    name: string;
    fromLocode: string;
    toLocode: string;
}

export interface RouteFeature {
    type: 'Feature';
    id: string;
    geometry: {
        type: 'LineString';
        coordinates: [number, number][];
    };
    properties: {
        corridor_id: string;
        name: string;
        from_port: string;
        to_port: string;
        distance_nm: number;
    };
}

export interface RouteFeatureCollection {
    type: 'FeatureCollection';
    features: RouteFeature[];
}

/**
 * Major shipping corridors connecting key global ports
 */
export const SHIPPING_CORRIDORS: Corridor[] = [
    // Asia-Europe
    { id: 'cor_sin_rot', name: 'Asia-Europe Main', fromLocode: 'SGSIN', toLocode: 'NLRTM' },
    { id: 'cor_sha_rot', name: 'China-Europe', fromLocode: 'CNSHA', toLocode: 'NLRTM' },
    { id: 'cor_hkg_ham', name: 'Hong Kong-Hamburg', fromLocode: 'HKHKG', toLocode: 'DEHAM' },

    // Transatlantic
    { id: 'cor_nyc_rot', name: 'Transatlantic North', fromLocode: 'USNYC', toLocode: 'NLRTM' },
    { id: 'cor_hou_ant', name: 'Gulf-Europe', fromLocode: 'USHOU', toLocode: 'BEANR' },
    { id: 'cor_nyc_ham', name: 'New York-Hamburg', fromLocode: 'USNYC', toLocode: 'DEHAM' },

    // Transpacific
    { id: 'cor_sha_lax', name: 'Transpacific Main', fromLocode: 'CNSHA', toLocode: 'USLAX' },
    { id: 'cor_sin_lax', name: 'Southeast Asia-US West', fromLocode: 'SGSIN', toLocode: 'USLAX' },
    { id: 'cor_tok_sea', name: 'Japan-Seattle', fromLocode: 'JPTYO', toLocode: 'USSEA' },

    // Middle East-Asia
    { id: 'cor_fuj_sin', name: 'Gulf-Singapore', fromLocode: 'AEFJR', toLocode: 'SGSIN' },
    { id: 'cor_jeb_sha', name: 'Dubai-Shanghai', fromLocode: 'AEJEA', toLocode: 'CNSHA' },
    { id: 'cor_fuj_hkg', name: 'Fujairah-Hong Kong', fromLocode: 'AEFJR', toLocode: 'HKHKG' },

    // Mediterranean-Asia
    { id: 'cor_gib_sin', name: 'Med-Asia via Suez', fromLocode: 'GIGIB', toLocode: 'SGSIN' },
    { id: 'cor_pir_fuj', name: 'Greece-Gulf', fromLocode: 'GRPIR', toLocode: 'AEFJR' },

    // Intra-Europe
    { id: 'cor_rot_ham', name: 'Rotterdam-Hamburg', fromLocode: 'NLRTM', toLocode: 'DEHAM' },
    { id: 'cor_ant_fel', name: 'Antwerp-Felixstowe', fromLocode: 'BEANR', toLocode: 'GBFXT' },

    // Americas
    { id: 'cor_lax_pan', name: 'US West-Panama', fromLocode: 'USLAX', toLocode: 'BRSSZ' },
    { id: 'cor_nyc_san', name: 'US East-Brazil', fromLocode: 'USNYC', toLocode: 'BRSSZ' },

    // Oceania
    { id: 'cor_sin_syd', name: 'Singapore-Sydney', fromLocode: 'SGSIN', toLocode: 'AUSYD' },
    { id: 'cor_syd_auk', name: 'Australia-New Zealand', fromLocode: 'AUSYD', toLocode: 'NZAKL' }
];

/**
 * Calculate great circle distance between two coordinates using Haversine formula
 * 
 * @param from - Origin coordinates
 * @param to - Destination coordinates
 * @returns Distance in nautical miles
 */
export function calculateDistance(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
): number {
    const R = 3440.065; // Earth's radius in nautical miles
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(to.lat - from.lat);
    const dLng = toRad(to.lng - from.lng);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
}

/**
 * Estimate voyage duration in days
 * 
 * @param distanceNm - Distance in nautical miles
 * @param speedKnots - Vessel speed in knots
 * @returns Estimated days (rounded to 1 decimal)
 */
export function estimateDays(distanceNm: number, speedKnots: number): number {
    const hours = distanceNm / speedKnots;
    const days = hours / 24;
    return Math.round(days * 10) / 10;
}

/**
 * Build GeoJSON LineString features for shipping corridors
 * Pure function - deterministic output
 * 
 * @param ports - Array of ports with coordinates
 * @param corridors - Array of corridor definitions
 * @returns GeoJSON FeatureCollection with LineString features
 */
export function buildRouteFeatures(
    ports: Port[],
    corridors: Corridor[]
): RouteFeatureCollection {
    const portMap = new Map<string, Port>();
    ports.forEach(port => {
        portMap.set(port.code, port);
    });

    const features: RouteFeature[] = [];

    corridors.forEach(corridor => {
        const fromPort = portMap.get(corridor.fromLocode);
        const toPort = portMap.get(corridor.toLocode);

        if (!fromPort || !toPort || !fromPort.coordinates || !toPort.coordinates) {
            return; // Skip if ports not found or missing coordinates
        }

        const distance = calculateDistance(
            fromPort.coordinates,
            toPort.coordinates
        );

        features.push({
            type: 'Feature',
            id: corridor.id,
            geometry: {
                type: 'LineString',
                coordinates: [
                    [fromPort.coordinates.lng, fromPort.coordinates.lat],
                    [toPort.coordinates.lng, toPort.coordinates.lat]
                ]
            },
            properties: {
                corridor_id: corridor.id,
                name: corridor.name,
                from_port: fromPort.name,
                to_port: toPort.name,
                distance_nm: distance
            }
        });
    });

    return {
        type: 'FeatureCollection',
        features
    };
}

/**
 * Build a single route feature for selected origin and destination
 * 
 * @param from - Origin port
 * @param to - Destination port
 * @returns Single LineString feature
 */
export function buildSelectedRoute(
    from: Port,
    to: Port
): RouteFeature | null {
    if (!from.coordinates || !to.coordinates) {
        return null;
    }

    const distance = calculateDistance(from.coordinates, to.coordinates);

    return {
        type: 'Feature',
        id: 'selected-route',
        geometry: {
            type: 'LineString',
            coordinates: [
                [from.coordinates.lng, from.coordinates.lat],
                [to.coordinates.lng, to.coordinates.lat]
            ]
        },
        properties: {
            corridor_id: 'selected-route',
            name: `${from.name} → ${to.name}`,
            from_port: from.name,
            to_port: to.name,
            distance_nm: distance
        }
    };
}
