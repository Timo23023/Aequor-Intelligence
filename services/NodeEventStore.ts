import fs from 'node:fs';
import path from 'node:path';
import { FeedEvent } from '../domain/types';

// Ensure data directory is relative to project root properly
const DATA_DIR = path.resolve(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'public_events.json');

export class EventStore {
    private events: Map<string, FeedEvent> = new Map();

    constructor() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
    }

    public loadFromDisk(): void {
        try {
            if (fs.existsSync(EVENTS_FILE)) {
                const raw = fs.readFileSync(EVENTS_FILE, 'utf-8');
                const loaded: FeedEvent[] = JSON.parse(raw);
                this.events.clear();
                for (const evt of loaded) {
                    this.events.set(evt.id, evt);
                }
                console.log(`[EventStore] Loaded ${this.events.size} events.`);
            }
        } catch (err) {
            console.error('[EventStore] Load failed:', err);
        }
    }

    public saveToDisk(): void {
        try {
            const data = Array.from(this.events.values());
            fs.writeFileSync(EVENTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
            console.log(`[EventStore] Saved ${data.length} events.`);
        } catch (err) {
            console.error('[EventStore] Save failed:', err);
        }
    }

    public upsertMany(incoming: FeedEvent[]): { inserted: number; updated: number; deduped: number } {
        let inserted = 0;
        let updated = 0;
        let deduped = 0;

        for (const evt of incoming) {
            if (this.events.has(evt.id)) {
                const existing = this.events.get(evt.id)!;
                // Simple confidence check
                const newConf = this.getConfidenceScore(evt.metadata?.confidence);
                const oldConf = this.getConfidenceScore(existing.metadata?.confidence);

                if (newConf > oldConf) {
                    this.events.set(evt.id, evt);
                    updated++;
                } else {
                    // Update retrievedAt
                    if (evt.metadata?.retrievedAt) {
                        existing.metadata.retrievedAt = evt.metadata.retrievedAt;
                    }
                    deduped++;
                }
            } else {
                this.events.set(evt.id, evt);
                inserted++;
            }
        }
        return { inserted, updated, deduped };
    }

    public getAll(): FeedEvent[] {
        return Array.from(this.events.values());
    }

    private getConfidenceScore(c?: string): number {
        if (c === 'high') return 2;
        if (c === 'medium') return 1;
        return 0;
    }

    public stats() {
        const byRegion: Record<string, number> = {};
        for (const evt of this.events.values()) {
            const r = evt.metadata?.region || 'other';
            byRegion[r] = (byRegion[r] || 0) + 1;
        }
        return { total: this.events.size, byRegion };
    }
}
