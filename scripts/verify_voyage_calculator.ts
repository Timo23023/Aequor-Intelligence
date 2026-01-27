
import { VoyageCalculatorService } from '../services/VoyageCalculatorService';
import { VoyageScenarioInput } from '../domain/types';
import { FuelType } from '../domain/constants';

const performVerification = () => {
    console.log("Starting Voyage Calculator Verification...");

    const service = new VoyageCalculatorService();

    // 1. Direct consumption test
    const input1: VoyageScenarioInput = {
        fuel_type: FuelType.VLSFO,
        currency: 'USD',
        price_low: 500,
        price_base: 600,
        price_high: 700,
        fuel_total_tonnes: 100
    };

    try {
        const out1 = service.compute(input1);
        console.log("Test 1 (Direct 100mt @ 600):");
        console.log(`  Fuel Used: ${out1.fuel_total_tonnes_used} (Expected 100)`);
        console.log(`  Cost Base: ${out1.results.cost_base} (Expected 60000)`);
        if (out1.fuel_total_tonnes_used === 100 && out1.results.cost_base === 60000) {
            console.log("  -> PASS");
        } else {
            console.error("  -> FAIL");
        }
    } catch (e) {
        console.error("  -> FAIL (Exception)", e);
    }

    // 2. Computed consumption test
    const input2: VoyageScenarioInput = {
        fuel_type: FuelType.LSMGO,
        currency: 'EUR',
        price_low: 800,
        price_base: 850,
        price_high: 900,
        fuel_tonnes_per_day: 20,
        days_at_sea: 5
    };

    try {
        const out2 = service.compute(input2);
        console.log("\nTest 2 (Computed 20t/d * 5days = 100mt @ 850):");
        console.log(`  Fuel Used: ${out2.fuel_total_tonnes_used} (Expected 100)`);
        console.log(`  Cost Base: ${out2.results.cost_base} (Expected 85000)`);
        if (out2.fuel_total_tonnes_used === 100 && out2.results.cost_base === 85000) {
            console.log("  -> PASS");
        } else {
            console.error("  -> FAIL");
        }
    } catch (e) {
        console.error("  -> FAIL (Exception)", e);
    }

    // 3. Validation Logic
    const inputInvalid: VoyageScenarioInput = {
        fuel_type: 'bad',
        currency: 'USD',
        price_low: 600,
        price_base: 500, // Invalid: Base < Low
        price_high: 700,
        fuel_total_tonnes: 10
    };

    try {
        console.log("\nTest 3 (Validation: Base < Low):");
        service.compute(inputInvalid);
        console.error("  -> FAIL (Should have thrown error)");
    } catch (e: any) {
        if (e.message.includes("Low <= Base <= High")) {
            console.log("  -> PASS (Caught expected error)");
        } else {
            console.error(`  -> FAIL (Wrong error message: ${e.message})`);
        }
    }
};

performVerification();
