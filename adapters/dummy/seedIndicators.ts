import { Indicator } from '../../domain/types';
import { SourceType } from '../../domain/constants';

const PUBLIC_SOURCE = {
    id: 'src_public_idx',
    name: 'Public Market Index',
    type: SourceType.Public,
    provider: 'OpenMarketData',
    license_notes: 'CC-BY-4.0',
    retrieved_at: '2023-10-26T10:00:00Z'
};

const TODAY = new Date().toISOString();

export const SEED_INDICATORS: Indicator[] = [
    { id: 'ind_bdi', name: 'Baltic Dry Index', value: 1540, unit: 'Points', date: TODAY, source: PUBLIC_SOURCE, category: 'Freight' },
    { id: 'ind_bci', name: 'Baltic Capesize Index', value: 1850, unit: 'Points', date: TODAY, source: PUBLIC_SOURCE, category: 'Freight' },
    { id: 'ind_bpi', name: 'Baltic Panamax Index', value: 1420, unit: 'Points', date: TODAY, source: PUBLIC_SOURCE, category: 'Freight' },
    { id: 'ind_bsi', name: 'Baltic Supramax Index', value: 1050, unit: 'Points', date: TODAY, source: PUBLIC_SOURCE, category: 'Freight' },
    { id: 'ind_bhsi', name: 'Baltic Handysize Index', value: 680, unit: 'Points', date: TODAY, source: PUBLIC_SOURCE, category: 'Freight' },

    // Bunker Prices
    { id: 'ind_vlsfo_rtm', name: 'VLSFO Rotterdam', value: 580.50, unit: 'USD/mt', date: TODAY, source: PUBLIC_SOURCE, category: 'Bunker' },
    { id: 'ind_vlsfo_sin', name: 'VLSFO Singapore', value: 610.25, unit: 'USD/mt', date: TODAY, source: PUBLIC_SOURCE, category: 'Bunker' },
    { id: 'ind_lsmgo_rtm', name: 'LSMGO Rotterdam', value: 820.00, unit: 'USD/mt', date: TODAY, source: PUBLIC_SOURCE, category: 'Bunker' },
    { id: 'ind_lsmgo_sin', name: 'LSMGO Singapore', value: 845.50, unit: 'USD/mt', date: TODAY, source: PUBLIC_SOURCE, category: 'Bunker' },

    // Economic
    { id: 'ind_brent', name: 'Brent Crude', value: 88.50, unit: 'USD/bbl', date: TODAY, source: PUBLIC_SOURCE, category: 'Commodity' },
];
