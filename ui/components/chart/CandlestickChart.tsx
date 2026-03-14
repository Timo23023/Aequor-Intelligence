/**
 * ui/components/chart/CandlestickChart.tsx
 * Phase 13: Candlestick + volume chart using lightweight-charts v5.
 * Self-contained; exposes timeframe switching via Chip primitives.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    createChart,
    CandlestickSeries,
    HistogramSeries,
    ColorType,
    CrosshairMode,
} from 'lightweight-charts';
import type {
    IChartApi,
    ISeriesApi,
    CandlestickData,
    HistogramData,
    SeriesOptionsMap,
} from 'lightweight-charts';
import Chip from '../primitives/Chip';

type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y';

export interface OHLCVBar {
    time: string; // 'YYYY-MM-DD'
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface CandlestickChartProps {
    data: OHLCVBar[];
    title?: string;
    onTimeframeChange?: (tf: Timeframe) => void;
}

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y'];

const CandlestickChart: React.FC<CandlestickChartProps> = ({ data, title, onTimeframeChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
    const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('1M');
    const [tooltip, setTooltip] = useState<{
        time: string;
        open: number;
        high: number;
        low: number;
        close: number;
        pct: number;
    } | null>(null);

    const handleTF = useCallback((tf: Timeframe) => {
        setActiveTimeframe(tf);
        onTimeframeChange?.(tf);
    }, [onTimeframeChange]);

    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: 'rgba(255,255,255,0.35)',
                fontSize: 11,
            },
            grid: {
                vertLines: { color: 'rgba(255,255,255,0.04)' },
                horzLines: { color: 'rgba(255,255,255,0.04)' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { color: 'rgba(255,255,255,0.2)', labelBackgroundColor: '#192038' },
                horzLine: { color: 'rgba(255,255,255,0.2)', labelBackgroundColor: '#192038' },
            },
            rightPriceScale: {
                borderColor: 'rgba(255,255,255,0.08)',
                textColor: 'rgba(255,255,255,0.35)',
            },
            timeScale: {
                borderColor: 'rgba(255,255,255,0.08)',
                timeVisible: true,
                secondsVisible: false,
            },
        });

        chartRef.current = chart;

        // v5: addSeries(SeriesType, options)
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#f43f5e',
            borderUpColor: '#10b981',
            borderDownColor: '#f43f5e',
            wickUpColor: '#10b981',
            wickDownColor: '#f43f5e',
        });
        candleRef.current = candleSeries;

        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#3b82f6',
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
        });
        chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.85, bottom: 0 },
        });
        volumeRef.current = volumeSeries;

        // Crosshair tooltip
        chart.subscribeCrosshairMove((param) => {
            if (!param.time || !param.seriesData.get(candleSeries)) {
                setTooltip(null);
                return;
            }
            const bar = param.seriesData.get(candleSeries) as CandlestickData;
            if (!bar) { setTooltip(null); return; }
            const pct = bar.open > 0 ? ((bar.close - bar.open) / bar.open) * 100 : 0;
            setTooltip({
                time: String(param.time),
                open: bar.open,
                high: bar.high,
                low: bar.low,
                close: bar.close,
                pct,
            });
        });

        // ResizeObserver
        const ro = new ResizeObserver(() => {
            if (containerRef.current) {
                chart.applyOptions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
                });
            }
        });
        ro.observe(containerRef.current);

        return () => {
            ro.disconnect();
            chart.remove();
            chartRef.current = null;
        };
    }, []);

    // Update data when it changes
    useEffect(() => {
        if (!candleRef.current || !volumeRef.current || !data.length) return;

        const candleData: CandlestickData[] = data.map(d => ({
            time: d.time as unknown as CandlestickData['time'],
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
        }));
        const volData: HistogramData[] = data.map(d => ({
            time: d.time as unknown as HistogramData['time'],
            value: d.volume,
            color: d.close >= d.open ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.30)',
        }));

        candleRef.current.setData(candleData);
        volumeRef.current.setData(volData);
        chartRef.current?.timeScale().fitContent();
    }, [data]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 14px',
                borderBottom: '1px solid var(--border-subtle)',
                flexShrink: 0,
                gap: '8px',
            }}>
                {/* Tooltip info or title */}
                <div style={{
                    fontSize: 'var(--font-body)',
                    color: 'var(--text-dim-1)',
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: 0,
                    flex: 1,
                }}>
                    {tooltip ? (
                        <span>
                            <span style={{ color: 'var(--text-dim-2)' }}>{tooltip.time}&nbsp;</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>O </span>
                            <span style={{ marginRight: 8 }}>{tooltip.open.toFixed(2)}</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>H </span>
                            <span style={{ marginRight: 8 }}>{tooltip.high.toFixed(2)}</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>L </span>
                            <span style={{ marginRight: 8 }}>{tooltip.low.toFixed(2)}</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>C </span>
                            <span style={{ marginRight: 8 }}>{tooltip.close.toFixed(2)}</span>
                            <span style={{
                                color: tooltip.pct >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                                fontWeight: 600,
                            }}>
                                {tooltip.pct >= 0 ? '+' : ''}{tooltip.pct.toFixed(2)}%
                            </span>
                        </span>
                    ) : (
                        <span style={{ color: 'var(--text-dim-2)' }}>{title ?? 'Chart'}</span>
                    )}
                </div>

                {/* Timeframe chips */}
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {TIMEFRAMES.map(tf => (
                        <Chip
                            key={tf}
                            label={tf}
                            active={activeTimeframe === tf}
                            onClick={() => handleTF(tf)}
                            style={{ height: '22px', fontSize: '11px', padding: '0 7px' }}
                        />
                    ))}
                </div>
            </div>

            {/* Chart container */}
            <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
        </div>
    );
};

export default CandlestickChart;
