/**
 * services/PortTerminalService.ts
 * Shared ViewModel builder for /port/:locode and /compare.
 * Pure function — no state, no network, deterministic.
 */
import { FuelProduct, Currency, PriceBasis } from '../domain/bunker/types';
import { BunkerProfile } from '../domain/bunker/types';
import { getBunkerProfile } from './BunkerService';
import { computeDisplayPrice, DisplayPrice } from './BunkerPricingService';
import {
    getLastUpdated, getDeliveryWindow, getChangeFeed, getIntelFeed,
    ChangeItem, IntelItem,
} from './MarketIntelService';

export interface PortTerminalModel {
    profile: BunkerProfile;
    displayPrice: DisplayPrice | null;
    deliveryWindow: string;
    lastUpdated: string;
    changeFeed: ChangeItem[];
    intelFeed: IntelItem[];
}

export function buildPortTerminalModel(
    locode: string,
    opts: { fuel: FuelProduct; currency: Currency; basis: PriceBasis },
): PortTerminalModel | null {
    const profile = getBunkerProfile(locode);
    if (!profile) return null;
    const displayPrice = computeDisplayPrice(profile, opts.fuel, opts.currency, opts.basis);
    return {
        profile,
        displayPrice,
        deliveryWindow: getDeliveryWindow(profile),
        lastUpdated: getLastUpdated(locode),
        changeFeed: getChangeFeed(locode),
        intelFeed: getIntelFeed(locode),
    };
}

// ---------------------------------------------------------------------------
// Compliance / Constraints — seeded per locode (deterministic)
// ---------------------------------------------------------------------------
export interface ComplianceItem {
    id: string;
    category: 'Regulation' | 'Infrastructure' | 'Certification' | 'Safety' | 'Environment';
    status: 'met' | 'pending' | 'na';
    label: string;
    detail: string;
}

const COMPLIANCE_POOL: Omit<ComplianceItem, 'id' | 'status'>[] = [
    { category: 'Regulation', label: 'FuelEU Maritime (2026)', detail: 'Port provides GHG intensity declaration assistance for vessels.' },
    { category: 'Regulation', label: 'MARPOL Annex VI', detail: 'Terminal is SOx/NOx compliant. EEXI/CII declaration accepted.' },
    { category: 'Regulation', label: 'EU ETS Reporting', detail: 'Bunker delivery notes (BDN) include EU ETS-compatible fields.' },
    { category: 'Infrastructure', label: 'e-Methanol Bunker Ready', detail: 'Dedicated methanol storage and bunkering manifold operational.' },
    { category: 'Infrastructure', label: 'Shore Power Available', detail: 'Cold ironing (shore power) available at Berths 1–4.' },
    { category: 'Infrastructure', label: 'STS Bunkering', detail: 'Ship-to-ship operations available at anchorage (pending fuel type).' },
    { category: 'Certification', label: 'ISO 9001 QMS', detail: 'Terminal operations certified under ISO 9001:2015.' },
    { category: 'Certification', label: 'ISCC+ Green Methanol', detail: 'At least one supplier holds ISCC+ certification for green methanol.' },
    { category: 'Safety', label: 'ISGOTT Compliance', detail: 'Operations comply with ISGOTT 6th edition guidelines.' },
    { category: 'Safety', label: 'IMDG Hazmat Handling', detail: 'Port certified for IMDG Class 3 and Class 2.3 hazmat handling.' },
    { category: 'Environment', label: 'Zero-spill Protocol', detail: 'Mandatory double-valve isolation during all e-fuel transfers.' },
    { category: 'Environment', label: 'CI Audit Trail', detail: 'Carbon Intensity certificate traceable from production to bunker delivery.' },
];

function hash(s: string): number {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h;
}

const STATUSES: ComplianceItem['status'][] = ['met', 'met', 'met', 'pending', 'na'];

export function getComplianceItems(locode: string): ComplianceItem[] {
    const h = hash(locode);
    const count = 4 + (h % 3); // 4–6 items
    const used = new Set<number>();
    const items: ComplianceItem[] = [];
    for (let i = 0; i < count; i++) {
        let idx = (h + i * 7) % COMPLIANCE_POOL.length;
        while (used.has(idx)) idx = (idx + 1) % COMPLIANCE_POOL.length;
        used.add(idx);
        const tmpl = COMPLIANCE_POOL[idx];
        const statusIdx = hash(locode + String(i)) % STATUSES.length;
        items.push({ id: `${locode}-comp-${i}`, status: STATUSES[statusIdx], ...tmpl });
    }
    return items;
}
