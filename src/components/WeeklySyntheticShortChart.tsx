/**
 * Weekly Synthetic Short Chart - Professional Financial Dashboard with ApexCharts
 */

import React, { useState, useEffect } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

// Dynamically import Chart component to prevent SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ChartDataPoint {
    time: string;
    timestamp: number;
    weeklySyntheticShort: number;
}

interface WeeklySyntheticShortChartProps {
    data?: {
        weeklySynthetic?: number;
        timestamp: string;
    };
    history?: any[];
    isConnected: boolean;
}

const WeeklySyntheticShortChart: React.FC<WeeklySyntheticShortChartProps> = ({
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
                if (d.weeklySynthetic && !isNaN(d.weeklySynthetic)) {
                    validHistory.push({
                        time: new Date(d.timestamp).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                        }),
                        timestamp: new Date(d.timestamp).getTime(),
                        weeklySyntheticShort: d.weeklySynthetic
                    });
                }
            }
            setChartData(validHistory);
        }
    }, [history]);

    useEffect(() => {
        if (data && data.weeklySynthetic) {
            const newDataPoint: ChartDataPoint = {
                time: new Date(data.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }),
                timestamp: new Date(data.timestamp).getTime(),
                weeklySyntheticShort: data.weeklySynthetic
            };

            if (isNaN(data.weeklySynthetic)) {
                return;
            }

            setChartData(prev => [...prev, newDataPoint].slice(-100));
        }
    }, [data]);

    const formatPrice = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Prepare ApexCharts data series
    const seriesData = chartData.map(point => [point.timestamp, point.weeklySyntheticShort]);

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
        colors: ['#10b981'],
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

    const series = [{
        name: 'Weekly Synthetic Short',
        data: seriesData
    }];

    return (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-emerald-500/20 hover:border-slate-600">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/30">
                <h2 className="text-sm font-bold text-slate-100 transition-all duration-300 tracking-tight uppercase flex items-center">
                    <svg className="w-4 h-4 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" />
                    </svg>
                    Weekly Synthetic Short
                </h2>
                <div className="text-right">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Value</span>
                    <div className="font-mono text-sm font-bold text-emerald-400">
                        ₹{data?.weeklySynthetic ? formatPrice(data.weeklySynthetic) : '—'}
                    </div>
                </div>
            </div>

            <div className="h-[320px] p-4">
                <Chart
                    options={chartOptions}
                    series={series}
                    type="line"
                    height="100%"
                />
            </div>
        </div>
    );
};

export default WeeklySyntheticShortChart;
