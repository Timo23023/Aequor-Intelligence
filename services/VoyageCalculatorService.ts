
import { VoyageScenarioInput, VoyageScenarioOutput } from '../domain/types';

export class VoyageCalculatorService {

    compute(input: VoyageScenarioInput): VoyageScenarioOutput {
        // 1. Validation
        this.validateInput(input);

        // 2. Determine Total Fuel Consumption
        let totalFuel = 0;
        let consumptionMethod = '';

        if (input.fuel_total_tonnes !== undefined && input.fuel_total_tonnes >= 0) {
            totalFuel = input.fuel_total_tonnes;
            consumptionMethod = 'direct';
        } else if (
            input.fuel_tonnes_per_day !== undefined &&
            input.days_at_sea !== undefined &&
            input.fuel_tonnes_per_day >= 0 &&
            input.days_at_sea >= 0
        ) {
            totalFuel = input.fuel_tonnes_per_day * input.days_at_sea;
            consumptionMethod = 'computed';
        } else {
            // Should be caught by validateInput, but defensive check
            throw new Error("Unable to compute fuel consumption. Provide Total Tonnes OR (Tonnes/Day + Days at Sea).");
        }

        // 3. Calculate Costs
        const costLow = totalFuel * input.price_low;
        const costBase = totalFuel * input.price_base;
        const costHigh = totalFuel * input.price_high;

        // 4. Construct Output
        return {
            fuel_total_tonnes_used: totalFuel,
            results: {
                cost_low: costLow,
                cost_base: costBase,
                cost_high: costHigh,
                currency: input.currency || 'USD'
            },
            sensitivity: {
                primary_driver: 'fuel_price',
                notes: consumptionMethod === 'computed'
                    ? `Based on daily consumption of ${input.fuel_tonnes_per_day} tonnes for ${input.days_at_sea} days.`
                    : undefined
            },
            disclaimer: "Decision-support only. Not financial advice. Assumptions may be wrong."
        };
    }

    private validateInput(input: VoyageScenarioInput): void {
        // Numeric Non-negative check
        if (input.price_low < 0 || input.price_base < 0 || input.price_high < 0) {
            throw new Error("Prices must be non-negative.");
        }

        // Low <= Base <= High
        if (input.price_low > input.price_base || input.price_base > input.price_high) {
            throw new Error("Prices must follow logic: Low <= Base <= High.");
        }

        // Consumption inputs existence
        const hasDirect = input.fuel_total_tonnes !== undefined && input.fuel_total_tonnes !== null; // Strict null check not strictly needed if type is number|undefined
        const hasComputed = input.fuel_tonnes_per_day !== undefined && input.days_at_sea !== undefined;

        if (!hasDirect && !hasComputed) {
            throw new Error("Must provide either 'Total Fuel Tonnes' or 'Consumption per Day' + 'Days at Sea'.");
        }

        if (hasComputed) {
            if ((input.fuel_tonnes_per_day ?? -1) < 0 || (input.days_at_sea ?? -1) < 0) {
                throw new Error("Consumption and Days at Sea must be non-negative.");
            }
        } else {
            if ((input.fuel_total_tonnes ?? -1) < 0) {
                throw new Error("Total Fuel Tonnes must be non-negative.");
            }
        }
    }
}
