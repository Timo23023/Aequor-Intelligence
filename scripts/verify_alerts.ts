
import { AlertService } from '../services/AlertService';
import { Visibility, Region, FuelType } from '../domain/constants';
import { FeedEvent, AlertEvent } from '../domain/types';

// Mock Events
const OLD_EVENT: FeedEvent = {
    id: 'evt_old',
    title: 'Old Event',
    summary: '...',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 24h ago
    source: { id: 's1', name: 'S', type: 'PUBLIC' as any, provider: 'P' },
    tags: [Region.NorthEurope, FuelType.Methanol],
    eventType: 'REGULATORY' as any
};

const NEW_EVENT: FeedEvent = {
    id: 'evt_new',
    title: 'New Methanol Event',
    summary: '...',
    timestamp: new Date().toISOString(), // NOW
    source: { id: 's1', name: 'S', type: 'PUBLIC' as any, provider: 'P' },
    tags: [Region.NorthEurope, FuelType.Methanol],
    eventType: 'REGULATORY' as any
};

const verifyAlerts = () => {
    console.log("Starting Alert Verification...");

    // Clear storage for test (mocking localStorage in Node requires polyfill or separate logic, 
    // but since we run this via ts-node in a real env, we rely on AlertService gracefully handling missing localStorage or using in-memory fallback?
    // AlertService calls `localStorage`. This will FAIL in Node unless polyfilled.
    // We must polyfill it here.
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
        regions: [Region.NorthEurope],
        fuels: [FuelType.Methanol]
    }, Visibility.Public);

    // 2. Evaluate with OLD event (should NOT trigger because watermark is initialized to NOW)
    // Actually, rule.last_evaluated_at is NOW. OLD_EVENT.timestamp is OLDER.
    // Logic: event.timestamp > rule.last_evaluated_at
    // So Old Event should be ignored.
    const alerts1 = service.evaluateAndPersist([OLD_EVENT], Visibility.Public);
    if (alerts1.length === 0) {
        console.log("  -> PASS: Old event ignored (Watermark worked)");
    } else {
        console.error("  -> FAIL: Old event triggered alert", alerts1);
    }

    // 3. Evaluate with NEW event (should trigger)
    // Wait 1ms to ensure timestamp > watermark? validation logic usually uses >
    // Let's ensure NEW_EVENT is strictly newer than rule creation.
    // It is created after rule.
    const alerts2 = service.evaluateAndPersist([NEW_EVENT], Visibility.Public);
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
