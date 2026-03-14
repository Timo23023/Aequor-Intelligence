/**
 * services/BunkerService.ts
 *
 * Thin service layer over the dummy bunker seed data.
 * Returns BunkerNode and BunkerProfile objects.
 * No external calls, no any casts.
 */

import { BunkerNode, BunkerProfile } from '../domain/bunker/types';
import { SEED_BUNKER_NODES } from '../adapters/dummy/bunker/seedBunkerNodes';
import { SEED_BUNKER_PROFILES } from '../adapters/dummy/bunker/seedBunkerProfiles';

/**
 * Returns all bunker nodes.
 * In a production implementation this would query a data store.
 */
export function listBunkerNodes(): BunkerNode[] {
    return SEED_BUNKER_NODES;
}

/**
 * Returns the full BunkerProfile for a given LOCODE, or null if not found.
 */
export function getBunkerProfile(locode: string): BunkerProfile | null {
    return SEED_BUNKER_PROFILES.find(p => p.node.locode === locode) ?? null;
}
