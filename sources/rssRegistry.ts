import { Region } from '../domain/constants';

export interface RssSourceDef {
    id: string;
    name: string;
    url: string;
    mayFail?: boolean;
}

export const RSS_SOURCES_BY_REGION: Record<Region, RssSourceDef[]> = {
    north_europe: [
        { id: "ne_gcaptain", name: "gCaptain (Europe)", url: "https://gcaptain.com/tag/europe/feed/" },
        { id: "ne_maritime_exec", name: "Maritime Exec (Europe)", url: "https://www.maritime-executive.com/rss" }
    ],
    mediterranean: [
        { id: "med_seatrade", name: "Seatrade Maritime (Med)", url: "https://www.seatrade-maritime.com/rss/region/mediterranean", mayFail: true }, // Often 403
        { id: "med_hellenic", name: "Hellenic Shipping News", url: "https://www.hellenicshippingnews.com/feed/" },
        { id: "med_piraeus", name: "Piraeus Port News", url: "https://www.portseurope.com/feed/" } // Fallback
    ],
    middle_east: [
        { id: "me_seatrade", name: "Seatrade Maritime (ME)", url: "https://www.seatrade-maritime.com/rss/region/middle-east", mayFail: true },
        { id: "me_gulf_news", name: "Gulf News (Business)", url: "https://gulfnews.com/rss/business" },
        { id: "me_trade_arabia", name: "Trade Arabia", url: "http://www.tradearabia.com/rss.html" } // Fallback
    ],
    asia: [
        { id: "asia_splash247", name: "Splash247 (Asia)", url: "https://splash247.com/category/region/asia/feed/" },
        { id: "asia_seatrade", name: "Seatrade Maritime (Asia)", url: "https://www.seatrade-maritime.com/rss/region/asia", mayFail: true }
    ],
    north_america: [
        { id: "na_gcaptain", name: "gCaptain (USA)", url: "https://gcaptain.com/tag/usa/feed/" },
        { id: "na_freightwaves", name: "FreightWaves", url: "https://www.freightwaves.com/news/feed" }
    ],
    south_america: [
        { id: "sa_mercopress", name: "MercoPress", url: "https://en.mercopress.com/rss" },
        { id: "sa_bnamericas", name: "BNAmericas", url: "https://www.bnamericas.com/en/rss/news", mayFail: true }
    ],
    africa: [
        { id: "af_seatrade", name: "Seatrade Maritime (Africa)", url: "https://www.seatrade-maritime.com/rss/region/africa", mayFail: true },
        { id: "af_engineering_news", name: "Engineering News SA", url: "https://www.engineeringnews.co.za/rss/cre/pol/40/cat/20" }
    ],
    oceania: [
        { id: "oc_daily_cargo", name: "Daily Cargo News (AU)", url: "https://www.thedcn.com.au/feed/" },
        { id: "oc_scoop_nz", name: "Scoop NZ (Business)", url: "http://www.scoop.co.nz/rss/business.xml" }
    ],
    global: [
        { id: "gl_reuters_shipping", name: "Reuters Shipping", url: "https://www.reutersagency.com/feed/", mayFail: true },
        { id: "gl_imo", name: "IMO News", url: "https://www.imo.org/en/MediaCentre/Pages/RSSValues.aspx" },
        { id: "gl_splash247", name: "Splash247 (Global)", url: "https://splash247.com/feed/" }
    ],
    other: []
};
