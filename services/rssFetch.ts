import Parser from 'rss-parser';

/**
 * Normalized item structure from RSS parser.
 */
export interface ParsedItem {
    title?: string;
    link?: string;
    pubDate?: string;
    content?: string;
    contentSnippet?: string;
    categories?: string[];
    [key: string]: any;
}

export type RssFetchResult =
    | { ok: true; items: ParsedItem[] }
    | { ok: false; error: { url: string; status?: number; message: string } };

const parser = new Parser({
    timeout: 10000,
    headers: {
        'User-Agent': 'SpectralCopernicus/1.0 (PublicIngestionMVP)'
    }
});

/**
 * Fetches and parses an RSS feed from a URL.
 * Returns a structured result to allow graceful failure handling.
 */
export async function fetchRSS(url: string): Promise<RssFetchResult> {
    try {
        const feed = await parser.parseURL(url);
        return { ok: true, items: feed.items || [] };
    } catch (error: any) {
        // Extract status if available (rss-parser might wrap axios/http errors)
        const status = error.response ? error.response.status : undefined;
        return {
            ok: false,
            error: {
                url,
                status,
                message: error.message || 'Unknown RSS parsing error'
            }
        };
    }
}
