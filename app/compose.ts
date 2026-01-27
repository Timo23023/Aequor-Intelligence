import { FeedService } from '../services/FeedService';
import { IndicatorService } from '../services/IndicatorService';
import { VoyageCalculatorService } from '../services/VoyageCalculatorService';
import { PortService } from '../services/PortService';
import { AlertService } from '../services/AlertService';
import { DummyAdapter } from '../adapters/dummy/DummyAdapter';
import { LiveOverlayAdapter } from '../adapters/dummy/LiveOverlayAdapter';

// Instantiate Base Adapter
const baseAdapter = new DummyAdapter();
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



