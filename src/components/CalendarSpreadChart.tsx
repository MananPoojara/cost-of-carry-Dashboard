/**
 * Calendar Spread Chart - Professional Financial Dashboard with ApexCharts
 */

import React, { useState, useEffect } from 'react';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

// Dynamically import Chart component to prevent SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ChartDataPoint {
    time: string;
    timestamp: number;
    monthlySynthetic: number;
    weeklySynthetic: number;
}

interface CalendarSpreadChartProps {
    data?: {
        monthlySynthetic?: number;
        weeklySynthetic?: number;
        timestamp: string;
    };
    history?: any[];
    isConnected: boolean;
}

const CalendarSpreadChart: React.FC<CalendarSpreadChartProps> = ({ data, history, isConnected }) => {
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

    useEffect(() => {
        if (history && history.length > 0) {
            const historyPoints = history.map(d => ({
                time: new Date(d.timestamp).toLocaleTimeString('en-IN', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                }),
                timestamp: new Date(d.timestamp).getTime(),
                monthlySynthetic: d.monthlySynthetic || 0,
                weeklySynthetic: d.weeklySynthetic || 0
            }));
            setChartData(historyPoints);
        }
    }, [history]);

    useEffect(() => {
        if (data && data.timestamp && (data.monthlySynthetic !== undefined || data.weeklySynthetic !== undefined)) {
            const newDataPoint: ChartDataPoint = {
                time: new Date(data.timestamp).toLocaleTimeString('en-IN', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                }),
                timestamp: new Date(data.timestamp).getTime(),
                monthlySynthetic: data.monthlySynthetic || 0,
                weeklySynthetic: data.weeklySynthetic || 0
            };
            setChartData(prev => [...prev, newDataPoint].slice(-60));
        }
    }, [data]);

    // Prepare ApexCharts data series
    const monthlySeries = chartData.map(point => [point.timestamp, point.monthlySynthetic]);
    const weeklySeries = chartData.map(point => [point.timestamp, point.weeklySynthetic]);

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
        colors: ['#10b981', '#f59e0b'],
        stroke: {
            width: [2.5, 2],
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
            name: 'Monthly Synthetic',
            data: monthlySeries
        },
        {
            name: 'Weekly Synthetic',
            data: weeklySeries
        }
    ];

    return (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-amber-500/20 hover:border-slate-600">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/30">
                <h2 className="text-sm font-bold text-slate-100 transition-all duration-300 tracking-tight uppercase flex items-center">
                    <svg className="w-4 h-4 mr-2 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6" />
                    </svg>
                    Monthly vs Weekly
                </h2>
                <div className="flex space-x-5">
                    <div className="text-right">
                        <span className="text-xs text-slate-400 uppercase font-semibold">Monthly</span>
                        <div className="font-mono text-sm font-bold text-emerald-400">
                            ₹{data?.monthlySynthetic ? data.monthlySynthetic.toFixed(2) : '—'}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-slate-400 uppercase font-semibold">Weekly</span>
                        <div className="font-mono text-sm font-bold text-amber-400">
                            ₹{data?.weeklySynthetic ? data.weeklySynthetic.toFixed(2) : '—'}
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

export default CalendarSpreadChart;
