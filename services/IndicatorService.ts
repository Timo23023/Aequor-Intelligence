import { IMarketDataAdapter } from '../adapters/adapter';
import { Indicator, IndicatorFilters } from '../domain/types';

export class IndicatorService {
    constructor(private adapter: IMarketDataAdapter) { }

    async listIndicators(filters: IndicatorFilters = {}): Promise<Indicator[]> {
        return this.adapter.listIndicators(filters);
    }
}
