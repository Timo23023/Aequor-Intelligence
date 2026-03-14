
import { AlertService } from '../services/AlertService';
import type { Visibility, Region, FuelType, SourceType, EventType } from '../domain/constants';
import { FeedEvent, AlertEvent } from '../domain/types';

// Mock Events
const OLD_EVENT: FeedEvent = {
    id: 'evt_old',
    title: 'Old Event',
    summary: '...',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 24h ago
    source: { id: 's1', name: 'S', type: 'public' as SourceType, provider: 'P' },
    tags: ['north_europe', 'methanol_conventional'],
    eventType: 'regulation' as EventType
};

const NEW_EVENT: FeedEvent = {
    id: 'evt_new',
    title: 'New Methanol Event',
    summary: '...',
    timestamp: new Date().toISOString(), // NOW
    source: { id: 's1', name: 'S', type: 'public' as SourceType, provider: 'P' },
    tags: ['north_europe', 'methanol_conventional'],
    eventType: 'regulation' as EventType
};

const verifyAlerts = () => {
    // ... (storage setup same)
    const storage: Record<string, string> = {};
    global.localStorage = {
        getItem: (key: string) => storage[key] || null,
        setItem: (key: string, val: string) => storage[key] = val,
        removeItem: (key: string) => delete storage[key],
        clear: () => { },
        key: () => null,
        length: 0
    };

    const service = new AlertService();

    // 1. Create Rule
    console.log("Creating Rule: Methanol in North Europe (Public)");
    const rule = service.addRule('Test Rule', {
        regions: ['north_europe'],
        fuels: ['methanol_conventional']
    }, 'public');

    // 2. Evaluate with OLD event
    const alerts1 = service.evaluateAndPersist([OLD_EVENT], 'public');
    if (alerts1.length === 0) {
        console.log("  -> PASS: Old event ignored (Watermark worked)");
    } else {
        console.error("  -> FAIL: Old event triggered alert", alerts1);
    }

    // 3. Evaluate with NEW event (should trigger)
    const alerts2 = service.evaluateAndPersist([NEW_EVENT], 'public');
    if (alerts2.length === 1 && alerts2[0].event_id === 'evt_new') {
        console.log("  -> PASS: New event triggered alert");
        console.log("     Reason:", alerts2[0].reason);
    } else {
        console.error("  -> FAIL: New event did not trigger correctly", alerts2);
    }

    // 4. Persistence Check
    const service2 = new AlertService(); // Reload from "storage"
    const loadedRules = service2.listRules();
    const loadedAlerts = service2.listAlerts();

    if (loadedRules.length === 1 && loadedAlerts.length === 1) {
        console.log("  -> PASS: Persistence verified");
    } else {
        console.error("  -> FAIL: Persistence mismatch", loadedRules.length, loadedAlerts.length);
    }
};

verifyAlerts();
