/**
 * Premium Analysis Chart - Professional Financial Dashboard with ApexCharts
 */

import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface PremiumAnalysisChartProps {
    data?: {
        spot: number;
        weeklySynthetic?: number;
        monthlySynthetic?: number;
        spreadZScore?: {
            zScore: number;
        };
    };
}

const PremiumAnalysisChart: React.FC<PremiumAnalysisChartProps> = ({ data }) => {
    // Prepare ApexCharts data for scatter plot
    const scatterData = data?.spreadZScore ? [{
        x: data.spreadZScore.zScore,
        y: 1
    }] : [];

    // ApexCharts configuration for scatter plot
    const chartOptions: ApexOptions = {
        chart: {
            type: 'scatter',
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
        colors: [data?.spreadZScore && Math.abs(data.spreadZScore.zScore) > 2 ? '#ef4444' : '#10b981'],
        markers: {
            size: 8,
            shape: 'diamond',
            strokeWidth: 1,
            strokeColors: '#000000'
        },
        tooltip: {
            theme: 'dark',
            x: {
                formatter: (value: number) => `Z-Score: ${value.toFixed(2)}`
            },
            y: {
                formatter: () => 'Distribution'
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
            strokeDashArray: 0,
            xaxis: {
                lines: {
                    show: true
                }
            },
            yaxis: {
                lines: {
                    show: false
                }
            }
        },
        xaxis: {
            type: 'numeric',
            min: -3,
            max: 3,
            tickAmount: 7,
            labels: {
                formatter: (value: number) => value.toString(),
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
        yaxis: {
            show: false,
            min: 0,
            max: 2
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
        name: 'Z-Score Distribution',
        data: scatterData
    }];

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
                <h2 className="text-sm font-bold text-gray-800 transition-all duration-300 tracking-tight">SPREAD DEVIATION (Z-SCORE)</h2>
                <div className="text-right">
                    <span className="text-xs text-gray-500 uppercase font-semibold transition-all duration-300">Z-SCORE</span>
                    <div className={`font-mono text-sm font-bold transition-all duration-300 ${data?.spreadZScore && Math.abs(data.spreadZScore.zScore) > 2 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {data?.spreadZScore ? (data.spreadZScore.zScore > 0 ? '+' : '') + data.spreadZScore.zScore.toFixed(2) : 'No data'}
                    </div>
                </div>
            </div>

            <div className="h-[300px] p-4">
                {!data?.spreadZScore ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-sm text-gray-400">NO Z-SCORE DATA</div>
                    </div>
                ) : scatterData.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-sm text-gray-400">Waiting for data...</div>
                    </div>
                ) : (
                    <Chart
                        options={chartOptions}
                        series={series}
                        type="scatter"
                        height="100%"
                    />
                )}
            </div>
            
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                    <span>EXTREME LOW</span>
                    <span>MEAN</span>
                    <span>EXTREME HIGH</span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-gray-200 flex rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-red-500/50" />
                    <div className="h-full w-1/3 bg-gray-400/30" />
                    <div className="h-full w-1/3 bg-green-500/50" />
                </div>
            </div>
        </div>
    );
};

export default PremiumAnalysisChart;