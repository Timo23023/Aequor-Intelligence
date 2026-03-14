
import { FeedEvent } from '../domain/types';

export class EventStore {
    private events: Map<string, FeedEvent> = new Map();
    private loadPromise: Promise<void> | null = null;

    constructor() {
        // No-op
    }

    public async loadFromDisk(): Promise<void> {
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = (async () => {
            try {
                console.log('[EventStore] Fetching events from /data/public_events.json');
                const response = await fetch('/data/public_events.json');
                if (!response.ok) {
                    if (response.status === 404) {
                        console.warn('[EventStore] public_events.json not found (404). Empty store.');
                        return;
                    }
                    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
                }
                const loaded: FeedEvent[] = await response.json();
                this.events.clear();
                for (const evt of loaded) {
                    this.events.set(evt.id, evt);
                }
                console.log(`[EventStore] Loaded ${this.events.size} events from network.`);
            } catch (err) {
                console.error('[EventStore] Load failed:', err);
            }
        })();

        return this.loadPromise;
    }

    public saveToDisk(): void {
        console.warn('[EventStore] saveToDisk is not supported in browser environment.');
    }

    public upsertMany(incoming: FeedEvent[]): { inserted: number; updated: number; deduped: number } {
        // In-memory upsert logic (same as Node version)
        let inserted = 0;
        let updated = 0;
        let deduped = 0;

        for (const evt of incoming) {
            if (this.events.has(evt.id)) {
                const existing = this.events.get(evt.id)!;
                const newConf = this.getConfidenceScore(evt.metadata?.confidence);
                const oldConf = this.getConfidenceScore(existing.metadata?.confidence);

                if (newConf > oldConf) {
                    this.events.set(evt.id, evt);
                    updated++;
                } else {
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

    // Helper to allow awaiting load if needed externally
    public waitForLoad(): Promise<void> {
        return this.loadPromise || Promise.resolve();
    }

    public stats() {
        const byRegion: Record<string, number> = {};
        for (const evt of this.events.values()) {
            const r = evt.metadata?.region || 'other';
            byRegion[r] = (byRegion[r] || 0) + 1;
        }
        return { total: this.events.size, byRegion };
    }

    private getConfidenceScore(c?: string): number {
        if (c === 'high') return 2;
        if (c === 'medium') return 1;
        return 0;
    }
}
