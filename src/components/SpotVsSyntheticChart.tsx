/**
 * Spot vs Synthetic Chart - Professional Financial Dashboard with ApexCharts
 */

import React, { useState, useEffect } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

// Dynamically import Chart component to prevent SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ChartDataPoint {
    time: string;
    timestamp: number;
    spot: number;
    weeklySynthetic?: number;
}

interface SpotVsSyntheticChartProps {
    data?: {
        spot: number;
        weeklySynthetic?: number;
        timestamp: string;
    };
    history?: any[];
    isConnected: boolean;
}

const SpotVsSyntheticChart: React.FC<SpotVsSyntheticChartProps> = ({
    data,
    history,
    isConnected
}) => {
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

    // Handle history data
    useEffect(() => {
        if (history && history.length > 0) {
            const validHistory = [];
            
            for (const d of history) {
                const spotValid = d.spot && !isNaN(d.spot);
                const weeklyValid = d.weeklySynthetic && !isNaN(d.weeklySynthetic);
                
                if (spotValid && weeklyValid) {
                    validHistory.push({
                        time: new Date(d.timestamp).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                        }),
                        timestamp: new Date(d.timestamp).getTime(),
                        spot: d.spot,
                        weeklySynthetic: d.weeklySynthetic
                    });
                }
            }
            
            setChartData(validHistory);
        }
    }, [history]);

    // Handle real-time data updates
    useEffect(() => {
        if (data && data.spot) {
            const newDataPoint = {
                time: new Date(data.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }),
                timestamp: new Date(data.timestamp).getTime(),
                spot: data.spot,
                weeklySynthetic: data.weeklySynthetic
            };

            if (isNaN(data.spot) || (data.weeklySynthetic && isNaN(data.weeklySynthetic))) {
                return;
            }

            setChartData(prev => [...prev, newDataPoint].slice(-100));
        }
    }, [data]);

    const formatPrice = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Prepare ApexCharts data series
    const spotSeries = chartData.map(point => [point.timestamp, point.spot]);
    const syntheticSeries = chartData.map(point => [point.timestamp, point.weeklySynthetic || 0]);

    // ApexCharts configuration
    const chartOptions: ApexOptions = {
        chart: {
            type: 'line',
            height: '100%',
            toolbar: {
                show: false
            },
            zoom: {
                enabled: false
            },
            animations: {
                enabled: true,
                dynamicAnimation: {
                    speed: 300
                }
            },
            background: 'transparent',
            foreColor: '#94a3b8'
        },
        colors: ['#06b6d4', '#10b981'],
        stroke: {
            width: 2.5,
            curve: 'smooth'
        },
        dataLabels: {
            enabled: false
        },
        markers: {
            size: 0,
            hover: {
                size: 6
            }
        },
        tooltip: {
            theme: 'dark',
            x: {
                format: 'HH:mm:ss'
            },
            y: {
                formatter: (value: number) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            },
            marker: {
                show: false
            },
            style: {
                fontSize: '12px',
                fontFamily: 'monospace'
            }
        },
        grid: {
            borderColor: '#475569',
            strokeDashArray: 3,
            xaxis: {
                lines: {
                    show: false
                }
            },
            yaxis: {
                lines: {
                    show: true
                }
            }
        },
        xaxis: {
            type: 'datetime',
            labels: {
                show: false,
                datetimeFormatter: {
                    hour: 'HH:mm'
                }
            },
            axisBorder: {
                show: false
            },
            axisTicks: {
                show: false
            }
        },
        yaxis: {
            opposite: true,
            labels: {
                formatter: (value: number) => `₹${value.toLocaleString('en-IN')}`,
                style: {
                    colors: ['#94a3b8'],
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    fontWeight: 600
                }
            },
            axisBorder: {
                show: false
            },
            axisTicks: {
                show: false
            }
        },
        legend: {
            show: false
        },
        states: {
            hover: {
                filter: {
                    type: 'lighten'
                }
            },
            active: {
                allowMultipleDataPointsSelection: false,
                filter: {
                    type: 'darken'
                }
            }
        }
    };

    const series = [
        {
            name: 'Spot Price',
            data: spotSeries
        },
        {
            name: 'Weekly Synthetic',
            data: syntheticSeries
        }
    ];

    return (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-cyan-500/20 hover:border-slate-600">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/30">
                <h2 className="text-sm font-bold text-slate-100 transition-all duration-300 tracking-tight uppercase flex items-center">
                    <svg className="w-4 h-4 mr-2 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Spot vs Synthetic
                </h2>
                <div className="flex space-x-5">
                    <div className="text-right">
                        <span className="text-xs text-slate-400 uppercase font-semibold">Spot</span>
                        <div className="font-mono text-sm font-bold text-cyan-300">
                            ₹{data?.spot ? formatPrice(data.spot) : '—'}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-slate-400 uppercase font-semibold">Synthetic</span>
                        <div className="font-mono text-sm font-bold text-emerald-400">
                            ₹{data?.weeklySynthetic ? formatPrice(data.weeklySynthetic) : '—'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-[320px] p-4">
                {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-sm text-slate-400">Waiting for data...</div>
                    </div>
                ) : (
                    <Chart
                        options={chartOptions}
                        series={series}
                        type="line"
                        height="100%"
                    />
                )}
            </div>
        </div>
    );
};

export default SpotVsSyntheticChart;
