
import { Port } from '../../domain/types';

export const SEED_PORTS: Port[] = [
    // North Europe
    { id: 'port_rot', name: 'Rotterdam', code: 'NLRTM', coordinates: { lat: 51.95, lng: 4.14 }, region: 'north_europe' },
    { id: 'port_ant', name: 'Antwerp', code: 'BEANR', coordinates: { lat: 51.21, lng: 4.40 }, region: 'north_europe' },
    { id: 'port_ham', name: 'Hamburg', code: 'DEHAM', coordinates: { lat: 53.54, lng: 9.99 }, region: 'north_europe' },
    { id: 'port_bre', name: 'Bremerhaven', code: 'DEBRV', coordinates: { lat: 53.54, lng: 8.58 }, region: 'north_europe' },
    { id: 'port_fel', name: 'Felixstowe', code: 'GBFXT', coordinates: { lat: 51.96, lng: 1.35 }, region: 'north_europe' },
    { id: 'port_got', name: 'Gothenburg', code: 'SEGOT', coordinates: { lat: 57.71, lng: 11.97 }, region: 'north_europe' },
    { id: 'port_ams', name: 'Amsterdam', code: 'NLAMS', coordinates: { lat: 52.37, lng: 4.90 }, region: 'north_europe' },

    // Mediterranean
    { id: 'port_gib', name: 'Gibraltar', code: 'GIGIB', coordinates: { lat: 36.14, lng: -5.35 }, region: 'mediterranean' },
    { id: 'port_bar', name: 'Barcelona', code: 'ESBCN', coordinates: { lat: 41.38, lng: 2.17 }, region: 'mediterranean' },
    { id: 'port_gen', name: 'Genoa', code: 'ITGOA', coordinates: { lat: 44.41, lng: 8.93 }, region: 'mediterranean' },
    { id: 'port_pir', name: 'Piraeus', code: 'GRPIR', coordinates: { lat: 37.94, lng: 23.65 }, region: 'mediterranean' },
    { id: 'port_val', name: 'Valencia', code: 'ESVLC', coordinates: { lat: 39.47, lng: -0.38 }, region: 'mediterranean' },
    { id: 'port_mar', name: 'Marseille', code: 'FRMRS', coordinates: { lat: 43.30, lng: 5.37 }, region: 'mediterranean' },
    { id: 'port_ist', name: 'Istanbul', code: 'TRIST', coordinates: { lat: 41.02, lng: 28.97 }, region: 'mediterranean' },

    // Middle East
    { id: 'port_fuj', name: 'Fujairah', code: 'AEFJR', coordinates: { lat: 25.12, lng: 56.32 }, region: 'middle_east' },
    { id: 'port_jeb', name: 'Jebel Ali', code: 'AEJEA', coordinates: { lat: 25.01, lng: 55.03 }, region: 'middle_east' },
    { id: 'port_jed', name: 'Jeddah', code: 'SAJED', coordinates: { lat: 21.54, lng: 39.17 }, region: 'middle_east' },
    { id: 'port_kho', name: 'Khor Fakkan', code: 'AEKHF', coordinates: { lat: 25.33, lng: 56.35 }, region: 'middle_east' },
    { id: 'port_soh', name: 'Sohar', code: 'OMSOH', coordinates: { lat: 24.36, lng: 56.75 }, region: 'middle_east' },

    // Asia
    { id: 'port_sin', name: 'Singapore', code: 'SGSIN', coordinates: { lat: 1.35, lng: 103.81 }, region: 'asia' },
    { id: 'port_sha', name: 'Shanghai', code: 'CNSHA', coordinates: { lat: 31.23, lng: 121.47 }, region: 'asia' },
    { id: 'port_bus', name: 'Busan', code: 'KRPUS', coordinates: { lat: 35.17, lng: 129.07 }, region: 'asia' },
    { id: 'port_hkg', name: 'Hong Kong', code: 'HKHKG', coordinates: { lat: 22.32, lng: 114.17 }, region: 'asia' },
    { id: 'port_tok', name: 'Tokyo', code: 'JPTYO', coordinates: { lat: 35.65, lng: 139.84 }, region: 'asia' },
    { id: 'port_yok', name: 'Yokohama', code: 'JPYOK', coordinates: { lat: 35.44, lng: 139.64 }, region: 'asia' },
    { id: 'port_nin', name: 'Ningbo', code: 'CNNGB', coordinates: { lat: 29.87, lng: 121.55 }, region: 'asia' },
    { id: 'port_she', name: 'Shenzhen', code: 'CNSZX', coordinates: { lat: 22.54, lng: 114.06 }, region: 'asia' },
    { id: 'port_kln', name: 'Klang', code: 'MYPKG', coordinates: { lat: 3.00, lng: 101.39 }, region: 'asia' },

    // North America
    { id: 'port_new', name: 'New York', code: 'USNYC', coordinates: { lat: 40.71, lng: -74.00 }, region: 'north_america' },
    { id: 'port_hou', name: 'Houston', code: 'USHOU', coordinates: { lat: 29.76, lng: -95.36 }, region: 'north_america' },
    { id: 'port_lax', name: 'Los Angeles', code: 'USLAX', coordinates: { lat: 33.74, lng: -118.27 }, region: 'north_america' },
    { id: 'port_oak', name: 'Oakland', code: 'USOAK', coordinates: { lat: 37.80, lng: -122.27 }, region: 'north_america' },
    { id: 'port_van', name: 'Vancouver', code: 'CAVAN', coordinates: { lat: 49.28, lng: -123.12 }, region: 'north_america' },
    { id: 'port_sea', name: 'Seattle', code: 'USSEA', coordinates: { lat: 47.61, lng: -122.33 }, region: 'north_america' },
    { id: 'port_mon', name: 'Montreal', code: 'CAMTR', coordinates: { lat: 45.50, lng: -73.57 }, region: 'north_america' },

    // South America
    { id: 'port_san', name: 'Santos', code: 'BRSSZ', coordinates: { lat: -23.96, lng: -46.33 }, region: 'south_america' },
    { id: 'port_bue', name: 'Buenos Aires', code: 'ARBUE', coordinates: { lat: -34.60, lng: -58.38 }, region: 'south_america' },
    { id: 'port_cal', name: 'Callao', code: 'PECLL', coordinates: { lat: -12.05, lng: -77.15 }, region: 'south_america' },
    { id: 'port_car', name: 'Cartagena', code: 'COCTG', coordinates: { lat: 10.39, lng: -75.51 }, region: 'south_america' },

    // Africa
    { id: 'port_dur', name: 'Durban', code: 'ZADUR', coordinates: { lat: -29.86, lng: 31.03 }, region: 'africa' },
    { id: 'port_lag', name: 'Lagos', code: 'NGLOS', coordinates: { lat: 6.45, lng: 3.40 }, region: 'africa' },
    { id: 'port_mom', name: 'Mombasa', code: 'KEMBA', coordinates: { lat: -4.05, lng: 39.67 }, region: 'africa' },
    { id: 'port_tan', name: 'Tangier', code: 'MAPTM', coordinates: { lat: 35.77, lng: -5.81 }, region: 'africa' },

    // Oceania
    { id: 'port_syd', name: 'Sydney', code: 'AUSYD', coordinates: { lat: -33.87, lng: 151.21 }, region: 'oceania' },
    { id: 'port_mel', name: 'Melbourne', code: 'AUMEL', coordinates: { lat: -37.81, lng: 144.96 }, region: 'oceania' },
    { id: 'port_auk', name: 'Auckland', code: 'NZAKL', coordinates: { lat: -36.85, lng: 174.76 }, region: 'oceania' }
];
