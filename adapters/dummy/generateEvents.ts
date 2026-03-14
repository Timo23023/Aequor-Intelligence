import { FeedEvent } from '../../domain/types';
import type { SourceType, EventType, FuelType, Region } from '../../domain/constants';
import { ALLOWED_FUEL_TYPES, ALLOWED_REGIONS, ALLOWED_EVENT_TYPES } from '../../domain/contractSnapshot';
import { SEED_PORTS } from './seedPorts';

// Seeded PRNG for deterministic generation
class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    pick<T>(arr: readonly T[]): T {
        return arr[this.nextInt(0, arr.length - 1)];
    }
}

const titleTemplates = [
    "{fuel} Prices {action} in {port} Amid {reason}",
    "{port} Reports {event} for {fuel} Vessels",
    "New {regulation} Impacts {fuel} Supply in {region}",
    "{weather} Disrupts {fuel} Bunkering at {port}",
    "{fuel} Demand {trend} in {region} Markets",
    "Port Congestion at {port} Affects {fuel} Availability",
    "{region} Sees Increased {fuel} Adoption",
    "Geopolitical Tensions Impact {fuel} Routes to {port}",
];

const actions = ["Surge", "Drop", "Stabilize", "Fluctuate"];
const trends = ["Rises", "Falls", "Remains Steady"];
const reasons = ["Supply Constraints", "Increased Demand", "Regulatory Changes", "Market Volatility"];
const events = ["Record Bunker Sales", "New Infrastructure", "Capacity Expansion"];
const regulations = ["IMO Regulation", "Local Policy", "Environmental Standard"];
const weather = ["Storm", "Fog", "High Winds"];

const summaryTemplates = [
    "Market analysts report significant changes in {fuel} pricing dynamics across {region}.",
    "{port} bunker suppliers confirm {trend} in {fuel} demand over the past week.",
    "Industry sources indicate that {reason} is driving {fuel} market movements.",
    "Vessel operators in {region} are adjusting strategies due to {fuel} price volatility.",
];

const PUBLIC_SOURCE = {
    id: 'src_public',
    name: 'Maritime Analytics',
    type: "public" as SourceType,
    provider: 'Industry Consortium',
    retrieved_at: new Date().toISOString()
};

const PRIVATE_SOURCE = {
    id: 'src_private_byod',
    name: 'Internal Intelligence',
    type: "private_byod" as SourceType,
    provider: 'Corporate',
    retrieved_at: new Date().toISOString()
};

const MAJOR_PORTS = SEED_PORTS.map(p => p.name);

function generateTitle(rng: SeededRandom, fuel: string, region: string, port: string): string {
    const template = rng.pick(titleTemplates);
    return template
        .replace('{fuel}', fuel)
        .replace('{port}', port)
        .replace('{region}', region)
        .replace('{action}', rng.pick(actions))
        .replace('{trend}', rng.pick(trends))
        .replace('{reason}', rng.pick(reasons))
        .replace('{event}', rng.pick(events))
        .replace('{regulation}', rng.pick(regulations))
        .replace('{weather}', rng.pick(weather));
}

function generateSummary(rng: SeededRandom, fuel: string, region: string): string {
    const template = rng.pick(summaryTemplates);
    return template
        .replace('{fuel}', fuel)
        .replace('{region}', region)
        .replace('{trend}', rng.pick(trends))
        .replace('{reason}', rng.pick(reasons));
}

export function generateEvents(count: number = 300): FeedEvent[] {
    const rng = new SeededRandom(42); // Fixed seed for determinism
    const events: FeedEvent[] = [];
    const now = Date.now();

    // Use contract snapshot arrays
    const fuels = [...ALLOWED_FUEL_TYPES];
    const regions = [...ALLOWED_REGIONS];
    const eventTypes = [...ALLOWED_EVENT_TYPES];
    const priorities = ['p1', 'p2', 'p3'];

    // Coverage tracking
    const coverage = {
        fuel: new Map<string, number>(),
        region: new Map<string, number>(),
        eventType: new Map<string, number>(),
        port: new Map<string, number>(),
        priority: new Map<string, number>()
    };

    // Initialize counters
    fuels.forEach(f => coverage.fuel.set(f, 0));
    regions.forEach(r => coverage.region.set(r, 0));
    eventTypes.forEach(t => coverage.eventType.set(t, 0));
    MAJOR_PORTS.forEach(p => coverage.port.set(p, 0));
    priorities.forEach(p => coverage.priority.set(p, 0));

    let id = 0;

    // Phase 1: Guarantee minimum coverage (10 per fuel, region, eventType; 8 per major port)
    const minCoverage = [
        ...fuels.flatMap(f => Array(10).fill({ type: 'fuel', value: f })),
        ...regions.flatMap(r => Array(10).fill({ type: 'region', value: r })),
        ...eventTypes.flatMap(t => Array(10).fill({ type: 'eventType', value: t })),
        ...MAJOR_PORTS.flatMap(p => Array(8).fill({ type: 'port', value: p }))
    ];

    // Shuffle to avoid predictable patterns
    for (let i = minCoverage.length - 1; i > 0; i--) {
        const j = rng.nextInt(0, i);
        [minCoverage[i], minCoverage[j]] = [minCoverage[j], minCoverage[i]];
    }

    // Generate coverage-guaranteed events
    for (const req of minCoverage) {
        if (id >= count - 30) break; // Reserve 30 for private events

        const fuel = req.type === 'fuel' ? req.value : rng.pick(fuels);
        const region = req.type === 'region' ? req.value : rng.pick(regions);
        const eventType = req.type === 'eventType' ? req.value : rng.pick(eventTypes);
        const port = req.type === 'port' ? req.value : rng.pick(MAJOR_PORTS);
        const priority = rng.pick(priorities);

        const timestamp = new Date(now - rng.nextInt(0, 30 * 24 * 60 * 60 * 1000)).toISOString();

        const portObj = SEED_PORTS.find(p => p.name === port);

        const event: FeedEvent = {
            id: `evt_${String(id++).padStart(4, '0')}`,
            title: generateTitle(rng, fuel, region, port),
            summary: generateSummary(rng, fuel, region),
            timestamp,
            source: PUBLIC_SOURCE,
            tags: [fuel, region, port, `priority:${priority}`],
            eventType: eventType,
            metadata: {
                generated: true,
                priority,
                portLocode: portObj?.code,
                portId: portObj?.id,
                portName: port
            }
        };

        events.push(event);
        coverage.fuel.set(fuel, (coverage.fuel.get(fuel) || 0) + 1);
        coverage.region.set(region, (coverage.region.get(region) || 0) + 1);
        coverage.eventType.set(eventType, (coverage.eventType.get(eventType) || 0) + 1);
        coverage.port.set(port, (coverage.port.get(port) || 0) + 1);
        coverage.priority.set(priority, (coverage.priority.get(priority) || 0) + 1);
    }

    // Phase 2: Fill remaining public events
    while (id < count - 30) {
        const fuel = rng.pick(fuels);
        const region = rng.pick(regions);
        const eventType = rng.pick(eventTypes);
        const port = rng.pick(MAJOR_PORTS);
        const priority = rng.pick(priorities);

        const timestamp = new Date(now - rng.nextInt(0, 30 * 24 * 60 * 60 * 1000)).toISOString();

        const portObj = SEED_PORTS.find(p => p.name === port);

        const event: FeedEvent = {
            id: `evt_${String(id++).padStart(4, '0')}`,
            title: generateTitle(rng, fuel, region, port),
            summary: generateSummary(rng, fuel, region),
            timestamp,
            source: PUBLIC_SOURCE,
            tags: [fuel, region, port, `priority:${priority}`],
            eventType: eventType,
            metadata: {
                generated: true,
                priority,
                portLocode: portObj?.code,
                portId: portObj?.id,
                portName: port
            }
        };

        events.push(event);
        coverage.priority.set(priority, (coverage.priority.get(priority) || 0) + 1);
    }

    // Phase 3: Generate private events
    while (id < count) {
        const fuel = rng.pick(fuels);
        const region = rng.pick(regions);
        const priority = rng.pick(priorities);

        const event: FeedEvent = {
            id: `evt_${String(id++).padStart(4, '0')}`,
            title: `[PRIVATE] Internal Fleet Note - ${fuel}`,
            summary: `Private operational data for ${region} market analysis.`,
            timestamp: new Date(now - rng.nextInt(0, 7 * 24 * 60 * 60 * 1000)).toISOString(),
            source: PRIVATE_SOURCE,
            tags: [`priority:${priority}`, fuel, region, 'private'],
            eventType: "regulation" as EventType
        };

        events.push(event);
    }

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
