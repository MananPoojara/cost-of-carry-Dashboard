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
            foreColor: '#6b7280'
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
            borderColor: '#e5e7eb',
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
                    colors: ['#6b7280'],
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
                <h2 className="text-sm font-bold text-gray-800 transition-all duration-300 tracking-tight">MONTHLY VS WEEKLY SYNTHETIC</h2>
                <div className="flex space-x-3">
                    <div className="text-right">
                        <span className="text-xs text-gray-500 uppercase font-semibold transition-all duration-300">MLY</span>
                        <div className="font-mono text-sm font-bold text-emerald-600 transition-all duration-300">
                            {data?.monthlySynthetic ? data.monthlySynthetic.toFixed(2) : 'No data'}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-gray-500 uppercase font-semibold transition-all duration-300">WKY</span>
                        <div className="font-mono text-sm font-bold text-amber-600 transition-all duration-300">
                            {data?.weeklySynthetic ? data.weeklySynthetic.toFixed(2) : 'No data'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-[300px] p-4">
                {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-sm text-gray-400">Waiting for data...</div>
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