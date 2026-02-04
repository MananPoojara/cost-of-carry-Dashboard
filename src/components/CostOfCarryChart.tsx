/**
 * Cost of Carry Chart - Professional Financial Dashboard with ApexCharts
 */

import React, { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface ChartDataPoint {
    time: string;
    timestamp: number;
    weeklyCarry: number;
    monthlyCarry: number;
}

interface CostOfCarryChartProps {
    data?: {
        weeklyCarry?: number;
        monthlyCarry?: number;
        timestamp: string;
    };
    history?: any[];
    isConnected: boolean;
}

const CostOfCarryChart: React.FC<CostOfCarryChartProps> = ({ data, history, isConnected }) => {
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
                weeklyCarry: d.weeklyCarry || 0,
                monthlyCarry: d.monthlyCarry || 0
            }));
            setChartData(historyPoints);
        }
    }, [history]);

    useEffect(() => {
        if (data && data.timestamp && (data.weeklyCarry !== undefined || data.monthlyCarry !== undefined)) {
            const newDataPoint: ChartDataPoint = {
                time: new Date(data.timestamp).toLocaleTimeString('en-IN', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                }),
                timestamp: new Date(data.timestamp).getTime(),
                weeklyCarry: data.weeklyCarry || 0,
                monthlyCarry: data.monthlyCarry || 0
            };
            setChartData(prev => [...prev, newDataPoint].slice(-100));
        }
    }, [data]);

    // Prepare ApexCharts data series
    const weeklySeries = chartData.map(point => [point.timestamp, point.weeklyCarry]);
    const monthlySeries = chartData.map(point => [point.timestamp, point.monthlyCarry]);

    // ApexCharts configuration
    const chartOptions: ApexOptions = {
        chart: {
            type: 'area',
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
        colors: ['#3b82f6', '#8b5cf6'],
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
                formatter: (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)} BPS`
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
                formatter: (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)} BPS`,
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
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.1,
                stops: [0, 90, 100]
            }
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
            name: 'Weekly Carry',
            data: weeklySeries
        },
        {
            name: 'Monthly Carry',
            data: monthlySeries
        }
    ];

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
                <h2 className="text-sm font-bold text-gray-800 transition-all duration-300 tracking-tight">COST OF CARRY</h2>
                <div className="flex space-x-3">
                    <div className="text-right">
                        <span className="text-xs text-gray-500 uppercase font-semibold transition-all duration-300">WEEKLY</span>
                        <div className={`font-mono text-sm font-bold transition-all duration-300 ${data?.weeklyCarry && data.weeklyCarry >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {data?.weeklyCarry ? (data.weeklyCarry > 0 ? '+' : '') + data.weeklyCarry.toFixed(2) : '--'}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-gray-500 uppercase font-semibold transition-all duration-300">MONTHLY</span>
                        <div className={`font-mono text-sm font-bold transition-all duration-300 ${data?.monthlyCarry && data.monthlyCarry >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                            {data?.monthlyCarry ? (data.monthlyCarry > 0 ? '+' : '') + data.monthlyCarry.toFixed(2) : '--'}
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
                        type="area"
                        height="100%"
                    />
                )}
            </div>
        </div>
    );
};

export default CostOfCarryChart;