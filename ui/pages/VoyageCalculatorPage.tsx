
import React, { useState } from 'react';
import { voyageCalculatorService } from '../../app/compose';
import { VoyageScenarioInput, VoyageScenarioOutput } from '../../domain/types';
import { FuelType } from '../../domain/constants';

const VoyageCalculatorPage: React.FC = () => {
    const [fuelType, setFuelType] = useState<string>(FuelType.VLSFO);
    const [currency, setCurrency] = useState('USD');
    const [priceLow, setPriceLow] = useState<string>('');
    const [priceBase, setPriceBase] = useState<string>('');
    const [priceHigh, setPriceHigh] = useState<string>('');

    // Consumption Mode: 'total' | 'daily'
    const [mode, setMode] = useState<'total' | 'daily'>('total');
    const [totalFuel, setTotalFuel] = useState<string>('');
    const [dailyFuel, setDailyFuel] = useState<string>('');
    const [daysAtSea, setDaysAtSea] = useState<string>('');

    const [result, setResult] = useState<VoyageScenarioOutput | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRun = () => {
        setError(null);
        setResult(null);

        try {
            const input: VoyageScenarioInput = {
                fuel_type: fuelType,
                currency,
                price_low: parseFloat(priceLow),
                price_base: parseFloat(priceBase),
                price_high: parseFloat(priceHigh),
            };

            if (mode === 'total') {
                input.fuel_total_tonnes = parseFloat(totalFuel);
            } else {
                input.fuel_tonnes_per_day = parseFloat(dailyFuel);
                input.days_at_sea = parseFloat(daysAtSea);
            }

            // Primitive NaN check before sending to Service (Service checks values, but NaN passes number check sometimes or throws messy error)
            if (isNaN(input.price_low) || isNaN(input.price_base) || isNaN(input.price_high)) {
                throw new Error("Please enter valid numeric prices.");
            }
            if (mode === 'total' && isNaN(input.fuel_total_tonnes!)) throw new Error("Please enter valid total fuel.");
            if (mode === 'daily' && (isNaN(input.fuel_tonnes_per_day!) || isNaN(input.days_at_sea!))) throw new Error("Please enter valid daily consumption and days.");

            const out = voyageCalculatorService.compute(input);
            setResult(out);
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleReset = () => {
        setPriceLow(''); setPriceBase(''); setPriceHigh('');
        setTotalFuel(''); setDailyFuel(''); setDaysAtSea('');
        setResult(null); setError(null);
    };

    const loadPreset = () => {
        setFuelType(FuelType.Methanol);
        setPriceLow('800'); setPriceBase('950'); setPriceHigh('1100');
        setMode('daily');
        setDailyFuel('45'); setDaysAtSea('12');
        setError(null); setResult(null);
    };

    return (
        <div className="container" style={{ paddingTop: '24px', maxWidth: '800px' }}>
            <header style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px' }}>Voyage Calculator</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Estimate voyage costs based on price scenarios.</p>
            </header>

            <div className="card">
                {/* Inputs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Fuel Type</label>
                        <select value={fuelType} onChange={e => setFuelType(e.target.value)}>
                            {Object.values(FuelType).map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Currency</label>
                        <input type="text" value={currency} onChange={e => setCurrency(e.target.value)} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Price Low</label>
                        <input type="number" value={priceLow} onChange={e => setPriceLow(e.target.value)} placeholder="e.g. 500" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Price Base</label>
                        <input type="number" value={priceBase} onChange={e => setPriceBase(e.target.value)} placeholder="e.g. 600" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Price High</label>
                        <input type="number" value={priceHigh} onChange={e => setPriceHigh(e.target.value)} placeholder="e.g. 700" />
                    </div>
                </div>

                <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ marginRight: '16px' }}>
                            <input type="radio" checked={mode === 'total'} onChange={() => setMode('total')} /> Total Tonnes
                        </label>
                        <label>
                            <input type="radio" checked={mode === 'daily'} onChange={() => setMode('daily')} /> Daily Consumption
                        </label>
                    </div>
                    {mode === 'total' ? (
                        <input type="number" placeholder="Total Fuel (mt)" value={totalFuel} onChange={e => setTotalFuel(e.target.value)} />
                    ) : (
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <input type="number" placeholder="Tonnes / Day" value={dailyFuel} onChange={e => setDailyFuel(e.target.value)} />
                            <input type="number" placeholder="Days at Sea" value={daysAtSea} onChange={e => setDaysAtSea(e.target.value)} />
                        </div>
                    )}
                </div>

                {error && <div style={{ color: 'var(--error)', marginBottom: '16px' }}>{error}</div>}

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="primary" onClick={handleRun}>Run Scenario</button>
                    <button className="outline" onClick={handleReset}>Reset</button>
                    <button className="outline" onClick={loadPreset} style={{ marginLeft: 'auto' }}>Load Preset (Methanol)</button>
                </div>
            </div>

            {result && (
                <div className="card" style={{ marginTop: '24px', borderColor: 'var(--accent-primary)' }}>
                    <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Results ({result.results.currency})</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px', textAlign: 'center' }}>
                        <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Low Estimate</div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--success)' }}>{result.results.cost_low.toLocaleString()}</div>
                        </div>
                        <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--accent-primary)' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Base Estimate</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{result.results.cost_base.toLocaleString()}</div>
                        </div>
                        <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>High Estimate</div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--error)' }}>{result.results.cost_high.toLocaleString()}</div>
                        </div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        Total Fuel: <strong>{result.fuel_total_tonnes_used.toLocaleString()} mt</strong>
                        {result.sensitivity.notes && <span> • {result.sensitivity.notes}</span>}
                    </div>
                    <div style={{ fontSize: '11px', fontStyle: 'italic', opacity: 0.7 }}>
                        Disclaimer: {result.disclaimer}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoyageCalculatorPage;
