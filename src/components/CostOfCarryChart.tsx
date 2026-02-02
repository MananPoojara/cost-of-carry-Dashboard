/**
 * Cost of Carry Chart Component
 * Bar chart showing cost of carry over time with Z-Score analysis
 */

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface CarryDataPoint {
    time: string;
    timestamp: number;
    weeklyCarry: number;
    monthlyCarry?: number;
    zScore?: number;
}

interface CostOfCarryChartProps {
    data?: {
        weeklyCarry?: number;
        monthlyCarry?: number;
        spreadZScore?: {
            zScore: number;
            interpretation: string;
            extremeLevel: string;
        };
        timestamp: string;
    };
    isConnected: boolean;
}

const CostOfCarryChart: React.FC<CostOfCarryChartProps> = ({
    data,
    isConnected
}) => {
    const [chartData, setChartData] = useState<CarryDataPoint[]>([]);
    const [carryRange, setCarryRange] = useState({ min: 0, max: 0 });

    useEffect(() => {
        if (data && data.weeklyCarry !== undefined) {
            const newDataPoint: CarryDataPoint = {
                time: new Date(data.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }),
                timestamp: new Date(data.timestamp).getTime(),
                weeklyCarry: data.weeklyCarry,
                monthlyCarry: data.monthlyCarry,
                zScore: data.spreadZScore?.zScore
            };

            setChartData(prev => {
                const updated = [...prev, newDataPoint];
                // Keep only last 50 data points for bar chart performance
                const trimmed = updated.slice(-50);

                // Update carry range for better Y-axis scaling
                const allCarries = trimmed.flatMap(point => [
                    point.weeklyCarry,
                    point.monthlyCarry || 0
                ]).filter(carry => carry !== 0);

                if (allCarries.length > 0) {
                    const min = Math.min(...allCarries);
                    const max = Math.max(...allCarries);
                    const padding = Math.max(Math.abs(max), Math.abs(min)) * 0.1; // 10% padding
                    setCarryRange({
                        min: Math.floor(min - padding),
                        max: Math.ceil(max + padding)
                    });
                }

                return trimmed;
            });
        }
    }, [data]);

    const formatCarry = (value: number) => `₹${value.toFixed(2)}`;

    const getBarColor = (value: number, zScore?: number) => {
        // Color based on Z-Score if available, otherwise based on positive/negative
        if (zScore !== undefined) {
            const absZScore = Math.abs(zScore);
            if (absZScore > 2) return value >= 0 ? '#DC2626' : '#7C2D12'; // Red for extreme
            if (absZScore > 1) return value >= 0 ? '#F59E0B' : '#92400E'; // Orange for notable
        }
        return value >= 0 ? '#10B981' : '#EF4444'; // Green for positive, red for negative
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
                    <p className="text-gray-300 text-sm mb-2">{`Time: ${label}`}</p>
                    <p className="text-green-400 text-sm">
                        {`Weekly Carry: ${formatCarry(data.weeklyCarry)}`}
                    </p>
                    {data.monthlyCarry !== undefined && (
                        <p className="text-blue-400 text-sm">
                            {`Monthly Carry: ${formatCarry(data.monthlyCarry)}`}
                        </p>
                    )}
                    {data.zScore !== undefined && (
                        <p className="text-yellow-400 text-sm">
                            {`Z-Score: ${data.zScore.toFixed(2)}`}
                        </p>
                    )}
                    <p className="text-gray-400 text-xs mt-1">
                        Carry = Synthetic - Spot
                    </p>
                </div>
            );
        }
        return null;
    };

    const CustomBar = (props: any) => {
        const { fill, ...rest } = props;
        const barColor = getBarColor(props.payload.weeklyCarry, props.payload.zScore);
        return <Bar {...rest} fill={barColor} />;
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-lg">
            {/* Chart Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">
                    Cost of Carry Analysis
                </h2>
                <div className="flex items-center space-x-4">
                    {/* Current Value */}
                    <div className="text-white text-sm">
                        <span className="text-gray-400">Current Weekly Carry: </span>
                        <span className={`font-semibold text-lg ${(data?.weeklyCarry || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                            {data?.weeklyCarry !== undefined
                                ? `${data.weeklyCarry >= 0 ? '+' : ''}${formatCarry(data.weeklyCarry)}`
                                : '--'
                            }
                        </span>
                    </div>

                    {/* Z-Score Indicator */}
                    {data?.spreadZScore && (
                        <div className="text-white text-sm">
                            <span className="text-gray-400">Z-Score: </span>
                            <span className={`font-semibold ${Math.abs(data.spreadZScore.zScore) > 2 ? 'text-red-400' :
                                    Math.abs(data.spreadZScore.zScore) > 1 ? 'text-yellow-400' : 'text-green-400'
                                }`}>
                                {data.spreadZScore.zScore.toFixed(2)}
                            </span>
                            {data.spreadZScore.extremeLevel === 'EXTREME' && (
                                <span className="ml-2 px-1 py-0.5 bg-red-600 text-white text-xs rounded">
                                    EXTREME
                                </span>
                            )}
                        </div>
                    )}

                    {/* Connection Status */}
                    <div className={`px-2 py-1 rounded text-xs font-medium ${isConnected ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                        {isConnected ? 'LIVE' : 'DISCONNECTED'}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                            dataKey="time"
                            stroke="#9CA3AF"
                            fontSize={12}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            stroke="#9CA3AF"
                            fontSize={12}
                            tickFormatter={formatCarry}
                            domain={carryRange.min !== 0 ? [carryRange.min, carryRange.max] : ['auto', 'auto']}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="2 2" />
                        <Bar
                            dataKey="weeklyCarry"
                            shape={<CustomBar />}
                            name="Weekly Carry"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Legend and Info */}
            <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                    {/* Color Legend */}
                    <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                            <span className="text-gray-300">Normal Positive</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                            <span className="text-gray-300">Normal Negative</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
                            <span className="text-gray-300">Notable (Z > 1)</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-700 rounded mr-2"></div>
                            <span className="text-gray-300">Extreme (Z > 2)</span>
                        </div>
                    </div>

                    {/* Chart Info */}
                    <p className="text-xs text-gray-500">
                        Showing last {chartData.length} bars • Z-Score based coloring
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CostOfCarryChart;