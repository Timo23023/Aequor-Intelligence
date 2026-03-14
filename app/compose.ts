import { FeedService } from '../services/FeedService';
import { IndicatorService } from '../services/IndicatorService';
import { VoyageCalculatorService } from '../services/VoyageCalculatorService';
import { PortService } from '../services/PortService';
import { AlertService } from '../services/AlertService';
import { DummyAdapter } from '../adapters/dummy/DummyAdapter';
import { LiveOverlayAdapter } from '../adapters/dummy/LiveOverlayAdapter';

// Instantiate Base Adapter
import { PublicIngestionAdapter } from '../adapters/public/PublicIngestionAdapter';
import { HybridAdapter } from '../adapters/hybrid/HybridAdapter';

// Instantiate Base Adapter
const mode = import.meta.env.VITE_DATA_MODE || 'dummy';
let baseAdapter: any; // Using interface broadly

switch (mode) {
    case 'public':
        console.log('[Compose] Mode: Public Ingestion (Strict)');
        baseAdapter = new PublicIngestionAdapter();
        break;
    case 'hybrid':
        console.log('[Compose] Mode: Hybrid (Public + Dummy Fill)');
        baseAdapter = new HybridAdapter();
        break;
    case 'dummy':
    default:
        console.log('[Compose] Mode: Dummy (Safe)');
        baseAdapter = new DummyAdapter();
        break;
}

// Legacy toggle fallback (if someone still uses VITE_PUBLIC_INGESTION_ENABLED but no MODE)
if (mode === 'dummy' && import.meta.env.VITE_PUBLIC_INGESTION_ENABLED === 'true') {
    console.log('[Compose] Fallback: Enabling Public Adapter via legacy flag');
    baseAdapter = new PublicIngestionAdapter();
}
// Wrap with Live Overlay
const adapter = new LiveOverlayAdapter(baseAdapter);

// Instantiate Services
const feedService = new FeedService(adapter);
const indicatorService = new IndicatorService(adapter);
const voyageCalculatorService = new VoyageCalculatorService();
const portService = new PortService(adapter);
const alertService = new AlertService();

// Export singleton instances
export { feedService, indicatorService, voyageCalculatorService, portService, alertService, adapter as liveAdapter };



