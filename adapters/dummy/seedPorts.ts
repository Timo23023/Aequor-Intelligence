
import { Port } from '../../domain/types';

export const SEED_PORTS: Port[] = [
    { id: 'port_rot', name: 'Rotterdam', code: 'NLRTM', coordinates: { lat: 51.95, lng: 4.14 }, region: 'NORTH_EUROPE' },
    { id: 'port_sin', name: 'Singapore', code: 'SGSIN', coordinates: { lat: 1.35, lng: 103.81 }, region: 'SINGAPORE' },
    { id: 'port_sha', name: 'Shanghai', code: 'CNSHA', coordinates: { lat: 31.23, lng: 121.47 }, region: 'CHINA' },
    { id: 'port_hou', name: 'Houston', code: 'USHOU', coordinates: { lat: 29.76, lng: -95.36 }, region: 'US_GULF' },
    { id: 'port_gib', name: 'Gibraltar', code: 'GIGIB', coordinates: { lat: 36.14, lng: -5.35 }, region: 'MEDITERRANEAN' },
    { id: 'port_ant', name: 'Antwerp', code: 'BEANR', coordinates: { lat: 51.21, lng: 4.40 }, region: 'NORTH_EUROPE' },
    { id: 'port_bus', name: 'Busan', code: 'KRPUS', coordinates: { lat: 35.17, lng: 129.07 }, region: 'CHINA' }, // Roughly East Asia
    { id: 'port_new', name: 'New York', code: 'USNYC', coordinates: { lat: 40.71, lng: -74.00 }, region: 'US_GULF' }, // Loose mapping
    { id: 'port_ham', name: 'Hamburg', code: 'DEHAM', coordinates: { lat: 53.54, lng: 9.99 }, region: 'NORTH_EUROPE' },
    { id: 'port_fuj', name: 'Fujairah', code: 'AEFJR', coordinates: { lat: 25.12, lng: 56.32 }, region: 'GLOBAL' }
];
