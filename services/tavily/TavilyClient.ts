
export interface TavilySearchResult {
    title: string;
    url: string;
    content?: string;
    published_date?: string;
    source?: string;
    score?: number;
}

export class TavilyClient {
    private apiKey: string;
    private baseUrl = 'https://api.tavily.com/search';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Search Tavily for context.
     * Uses strict timeout.
     */
    public async search(query: string, opts?: { maxResults?: number; searchDepth?: "basic" | "advanced" }): Promise<TavilySearchResult[]> {
        if (!this.apiKey) {
            throw new Error('Tavily API key missing');
        }

        const body = {
            api_key: this.apiKey,
            query: query,
            search_depth: opts?.searchDepth || "basic",
            max_results: opts?.maxResults || 5,
            include_answer: false,
            include_images: false,
            include_raw_content: false
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Tavily API failed with ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return (data.results || []) as TavilySearchResult[];

        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Tavily search timed out');
            }
            throw new Error(`Tavily search failed: ${error.message}`);
        }
    }
}
