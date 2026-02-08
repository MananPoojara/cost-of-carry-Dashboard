'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, LineStyle, CrosshairMode } from 'lightweight-charts';

interface ChartData {
    time: number | string;
    value: number;
}

interface LightweightChartProps {
    data: ChartData[];
    title: string;
    color?: string;
    autoScale?: boolean;
    dark?: boolean;
}

const LightweightChart: React.FC<LightweightChartProps> = ({
    data,
    title,
    color = '#3b82f6',
    autoScale = true,
    dark = true
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chartOptions = {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: dark ? '#94a3b8' : '#64748b',
                fontSize: 12,
                fontFamily: 'Inter, system-ui, sans-serif',
            },
            grid: {
                vertLines: { color: dark ? '#1e293b' : '#e2e8f0', style: LineStyle.Dotted },
                horzLines: { color: dark ? '#1e293b' : '#e2e8f0', style: LineStyle.Dotted },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    width: 1,
                    color: dark ? '#475569' : '#94a3b8',
                    labelBackgroundColor: dark ? '#1e293b' : '#334155',
                },
                horzLine: {
                    width: 1,
                    color: dark ? '#475569' : '#94a3b8',
                    labelBackgroundColor: dark ? '#1e293b' : '#334155',
                },
            },
            timeScale: {
                borderColor: dark ? '#1e293b' : '#e2e8f0',
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderColor: dark ? '#1e293b' : '#e2e8f0',
                autoScale: autoScale,
            },
            handleScroll: true,
            handleScale: true,
        };

        const chart = createChart(chartContainerRef.current, {
            ...chartOptions,
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight || 300,
        });

        const series = chart.addAreaSeries({
            lineColor: color,
            topColor: `${color}44`,
            bottomColor: `${color}00`,
            lineWidth: 2,
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.05,
            },
        });

        chartRef.current = chart;
        seriesRef.current = series;

        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0 || !chartContainerRef.current) return;
            const { width, height } = entries[0].contentRect;
            chart.applyOptions({ width, height });
        });

        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, [color, autoScale, dark]);

    useEffect(() => {
        if (seriesRef.current && data.length > 0) {
            // Sort data by time to prevent lightweight-charts errors
            const sortedData = [...data]
                .map(d => ({
                    time: typeof d.time === 'string' ? Math.floor(new Date(d.time).getTime() / 1000) : d.time,
                    value: d.value
                }))
                .sort((a, b) => (a.time as number) - (b.time as number));

            // Filter unique times (lightweight-charts requirement)
            const uniqueData = sortedData.filter((item, index, self) =>
                index === 0 || item.time !== self[index - 1].time
            );

            seriesRef.current.setData(uniqueData as any);

            if (autoScale) {
                chartRef.current?.timeScale().fitContent();
            }
        }
    }, [data, autoScale]);

    return (
        <div className={`relative w-full h-full flex flex-col p-4 rounded-xl border transition-all hover:border-slate-500 overflow-hidden group ${dark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
            }`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-semibold flex items-center gap-2 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: color }}></div>
                    {title}
                </h3>
                {data.length > 0 && (
                    <div className={`text-xs font-mono ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                        LAST: <span className={dark ? 'text-slate-200' : 'text-slate-900'}>{data[data.length - 1].value.toFixed(2)}</span>
                    </div>
                )}
            </div>
            <div ref={chartContainerRef} className="flex-1 w-full min-h-0" />
        </div>
    );
};

export default LightweightChart;
