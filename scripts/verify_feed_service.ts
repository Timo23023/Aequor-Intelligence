
import { generateEvents } from '../adapters/dummy/generateEvents';
import { ALLOWED_FUEL_TYPES, ALLOWED_REGIONS, ALLOWED_EVENT_TYPES } from '../domain/contractSnapshot';

console.log("Verifying Feed Service Data Coverage...\n");

const events = generateEvents(300);

console.log(`Total events generated: ${events.length}\n`);

// Coverage maps
const fuelCoverage = new Map<string, number>();
const regionCoverage = new Map<string, number>();
const eventTypeCoverage = new Map<string, number>();
const priorityCoverage = new Map<string, number>();
const portCoverage = new Map<string, number>();

// Initialize counters
ALLOWED_FUEL_TYPES.forEach(f => fuelCoverage.set(f, 0));
ALLOWED_REGIONS.forEach(r => regionCoverage.set(r, 0));
ALLOWED_EVENT_TYPES.forEach(t => eventTypeCoverage.set(t, 0));
['p1', 'p2', 'p3'].forEach(p => priorityCoverage.set(p, 0));

// Count coverage
events.forEach(event => {
    // Fuels
    ALLOWED_FUEL_TYPES.forEach(fuel => {
        if (event.tags.includes(fuel)) {
            fuelCoverage.set(fuel, (fuelCoverage.get(fuel) || 0) + 1);
        }
    });

    // Regions
    ALLOWED_REGIONS.forEach(region => {
        if (event.tags.includes(region)) {
            regionCoverage.set(region, (regionCoverage.get(region) || 0) + 1);
        }
    });

    // Event Types
    if (event.eventType) {
        eventTypeCoverage.set(event.eventType, (eventTypeCoverage.get(event.eventType) || 0) + 1);
    }

    // Priority
    const priorityTag = event.tags.find(t => t.startsWith('priority:'));
    if (priorityTag) {
        const match = priorityTag.match(/^priority:(p[123])$/);
        if (match) {
            priorityCoverage.set(match[1], (priorityCoverage.get(match[1]) || 0) + 1);
        }
    }

    // Ports
    event.tags.forEach(tag => {
        if (!tag.startsWith('priority:') && !(ALLOWED_FUEL_TYPES as readonly string[]).includes(tag) &&
            !(ALLOWED_REGIONS as readonly string[]).includes(tag)) {
            portCoverage.set(tag, (portCoverage.get(tag) || 0) + 1);
        }
    });
});

// Print results
console.log("=== FUEL COVERAGE ===");
let failedFuel = false;
fuelCoverage.forEach((count, fuel) => {
    const status = count >= 10 ? '✓' : '✗';
    console.log(`${status} ${fuel}: ${count}`);
    if (count < 10) failedFuel = true;
});

console.log("\n=== REGION COVERAGE ===");
let failedRegion = false;
regionCoverage.forEach((count, region) => {
    const status = count >= 10 ? '✓' : '✗';
    console.log(`${status} ${region}: ${count}`);
    if (count < 10) failedRegion = true;
});

console.log("\n=== EVENT TYPE COVERAGE ===");
let failedEventType = false;
eventTypeCoverage.forEach((count, type) => {
    const status = count >= 10 ? '✓' : '✗';
    console.log(`${status} ${type}: ${count}`);
    if (count < 10) failedEventType = true;
});

console.log("\n=== PRIORITY COVERAGE ===");
priorityCoverage.forEach((count, pri) => {
    console.log(`  ${pri.toUpperCase()}: ${count}`);
});

console.log("\n=== TOP 10 PORTS ===");
const sortedPorts = Array.from(portCoverage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
sortedPorts.forEach(([port, count]) => {
    const status = count >= 8 ? '✓' : '✗';
    console.log(`${status} ${port}: ${count}`);
});

console.log("\n" + "=".repeat(50));
if (!failedFuel && !failedRegion && !failedEventType) {
    console.log("✓ Dummy coverage validated: OK");
} else {
    console.log("✗ Coverage validation FAILED");
    process.exit(1);
}
