
import { Port } from '../domain/types';
import { IMarketDataAdapter } from '../adapters/adapter';

export class PortService {
    constructor(private adapter: IMarketDataAdapter) { }

    async searchPorts(query: string): Promise<Port[]> {
        if (!query || query.length < 2) return [];

        const allPorts = await this.adapter.listPorts({});
        const lowerQ = query.toLowerCase();

        // Simple fuzzy match: name or code contains query
        // Prioritize startsWith, then contains
        const matches = allPorts.filter(p =>
            p.name.toLowerCase().includes(lowerQ) ||
            p.code.toLowerCase().includes(lowerQ)
        );

        // Sort by relevance (starts with > contains)
        return matches.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            const aStarts = aName.startsWith(lowerQ);
            const bStarts = bName.startsWith(lowerQ);

            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return 0; // Maintain stable sort otherwise
        }).slice(0, 10); // Limit to top 10
    }
}
