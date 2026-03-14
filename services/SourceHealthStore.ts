
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const HEALTH_FILE = path.join(DATA_DIR, 'source_health.json');

export interface SourceHealthEntry {
    sourceId: string;
    lastAttemptAt?: string; // ISO
    lastSuccessAt?: string; // ISO
    lastFailAt?: string;    // ISO
    consecutiveFails: number;
    lastStatus?: number | null;
    disabledUntil?: string | null; // ISO
}

export interface SourceHealthData {
    sources: Record<string, SourceHealthEntry>;
}

export class SourceHealthStore {
    private data: SourceHealthData = { sources: {} };

    constructor() {
        this.loadFromDisk();
    }

    public loadFromDisk(): void {
        if (fs.existsSync(HEALTH_FILE)) {
            try {
                const raw = fs.readFileSync(HEALTH_FILE, 'utf-8');
                this.data = JSON.parse(raw);
            } catch (e) {
                console.warn("[SourceHealthStore] Failed to parse health file, resetting.");
                this.data = { sources: {} };
            }
        }
    }

    public saveToDisk(): void {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(HEALTH_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    }

    private getEntry(sourceId: string): SourceHealthEntry {
        if (!this.data.sources[sourceId]) {
            this.data.sources[sourceId] = {
                sourceId,
                consecutiveFails: 0
            };
        }
        return this.data.sources[sourceId];
    }

    public recordAttempt(sourceId: string): void {
        const entry = this.getEntry(sourceId);
        entry.lastAttemptAt = new Date().toISOString();
        this.saveToDisk();
    }

    public recordSuccess(sourceId: string): void {
        const entry = this.getEntry(sourceId);
        entry.lastSuccessAt = new Date().toISOString();
        entry.consecutiveFails = 0;
        entry.lastStatus = 200;
        entry.disabledUntil = null; // Re-enable if it was somehow disabled but we forced a try?
        this.saveToDisk();
    }

    public recordFailure(sourceId: string, statusCode?: number): void {
        const entry = this.getEntry(sourceId);
        entry.lastFailAt = new Date().toISOString();
        entry.consecutiveFails++;
        entry.lastStatus = statusCode || null;

        // Auto-disable rule: 3 strikes -> 24h timeout
        if (entry.consecutiveFails >= 3) {
            const disableDuration = 24 * 60 * 60 * 1000; // 24h
            entry.disabledUntil = new Date(Date.now() + disableDuration).toISOString();
            console.warn(`[SourceHealth] Disabling ${sourceId} for 24h (3 consecutive fails)`);
        }
        this.saveToDisk();
    }

    public shouldSkip(sourceId: string): boolean {
        const entry = this.data.sources[sourceId];
        if (!entry) return false;
        if (entry.disabledUntil) {
            const until = new Date(entry.disabledUntil);
            if (until > new Date()) {
                return true;
            } else {
                // Expired
                entry.disabledUntil = null;
                entry.consecutiveFails = 0; // Reset count on probation? Or keep? Let's reset to give fair chance
                return false;
            }
        }
        return false;
    }

    public getHealthStats(): string {
        const total = Object.keys(this.data.sources).length;
        const disabled = Object.values(this.data.sources).filter(s => s.disabledUntil && new Date(s.disabledUntil) > new Date()).length;
        return `Tracked: ${total}, Disabled: ${disabled}`;
    }
}
