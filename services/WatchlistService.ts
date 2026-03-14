/**
 * services/WatchlistService.ts
 * Single source of truth for the user's port watchlist.
 * Persists to localStorage["aequor_watchlist_v1"].
 * Exports subscribe/unsubscribe for cross-component sync.
 */

const KEY = 'aequor_watchlist_v1';

/** Read from localStorage, return sorted array of locodes. */
function read(): string[] {
    try {
        const raw = localStorage.getItem(KEY);
        const arr: string[] = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? [...arr].sort() : [];
    } catch {
        return [];
    }
}

/** Write sorted array to localStorage and notify listeners. */
function write(locodes: string[]): void {
    const sorted = [...new Set(locodes)].sort();
    try { localStorage.setItem(KEY, JSON.stringify(sorted)); } catch { /* quota exceeded */ }
    notify();
}

// ── Pub/Sub ────────────────────────────────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void { listeners.forEach(fn => fn()); }

/** Subscribe to watchlist changes. Returns an unsubscribe function. */
export function subscribe(cb: Listener): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

// ── Public API ─────────────────────────────────────────────────────────────
/** Returns all watched locodes, sorted alphabetically. */
export function getWatchlist(): string[] { return read(); }

/** Returns true if the locode is currently watched. */
export function isWatched(locode: string): boolean { return read().includes(locode); }

/**
 * Add if not watched; remove if watched.
 * Returns the new watched state (true = now watching).
 */
export function toggleWatchlist(locode: string): boolean {
    const current = read();
    const idx = current.indexOf(locode);
    if (idx === -1) {
        write([...current, locode]);
        return true;
    } else {
        write(current.filter(l => l !== locode));
        return false;
    }
}

/** Explicitly add to watchlist (no-op if already watched). */
export function addToWatchlist(locode: string): void {
    const current = read();
    if (!current.includes(locode)) write([...current, locode]);
}

/** Explicitly remove from watchlist (no-op if not watched). */
export function removeFromWatchlist(locode: string): void {
    write(read().filter(l => l !== locode));
}
