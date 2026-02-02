/**
 * Spot vs Synthetic Chart Component
 * Real-time comparison of NIFTY spot vs synthetic weekly prices
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
    time: string;
    timestamp: number;
    spot: number;
    weeklySynthetic?: number;
    carry?: number;
}

interface SpotVsSyntheticChartProps {
    data?: {
        spot: number;
        weeklySynthetic?: number;
        weeklyCarry?: number;
        timestamp: string;
    };
    isConnected: boolean;
}

const SpotVsSyntheticChart: React.FC<SpotVsSyntheticChartProps> = ({
    data,
    isConnected
}) => {
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [priceRange, setPriceRange] = useState({ min: 0, max: 0 });

    useEffect(() => {
        if (data && data.spot) {
            const newDataPoint: ChartDataPoint = {
                time: new Date(data.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }),
                timestamp: new Date(data.timestamp).getTime(),
                spot: data.spot,
                weeklySynthetic: data.weeklySynthetic,
                carry: data.weeklyCarry
            };

            setChartData(prev => {
                const updated = [...prev, newDataPoint];
                // Keep only last 100 data points for performance
                const trimmed = updated.slice(-100);

                // Update price range for better Y-axis scaling
                const allPrices = trimmed.flatMap(point => [
                    point.spot,
                    point.weeklySynthetic || 0
                ]).filter(price => price > 0);

                if (allPrices.length > 0) {
                    const min = Math.min(...allPrices);
                    const max = Math.max(...allPrices);
                    const padding = (max - min) * 0.02; // 2% padding
                    setPriceRange({
                        min: Math.floor(min - padding),
                        max: Math.ceil(max + padding)
                    });
                }

                return trimmed;
            });
        }
    }, [data]);

    const formatPrice = (value: number) => `₹${value.toFixed(2)}`;

    const formatTooltipValue = (value: number, name: string) => {
        if (name === 'carry') {
            return [`₹${value.toFixed(2)}`, 'Cost of Carry'];
        }
        return [formatPrice(value), name];
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
                    <p className="text-gray-300 text-sm mb-2">{`Time: ${label}`}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color }} className="text-sm">
                            {`${entry.name}: ${formatPrice(entry.value)}`}
                        </p>
                    ))}
                    {payload.find((p: any) => p.dataKey === 'carry') && (
                        <p className="text-gray-400 text-xs mt-1">
                            Carry = Synthetic - Spot
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-lg">
            {/* Chart Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">
                    NIFTY Spot vs Weekly Synthetic
                </h2>
                <div className="flex items-center space-x-4">
                    {/* Current Values */}
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                            <span className="text-sm text-gray-300">
                                Spot: {data?.spot ? formatPrice(data.spot) : '--'}
                            </span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                            <span className="text-sm text-gray-300">
                                Weekly: {data?.weeklySynthetic ? formatPrice(data.weeklySynthetic) : '--'}
                            </span>
                        </div>
                    </div>

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
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                            tickFormatter={formatPrice}
                            domain={priceRange.min > 0 ? [priceRange.min, priceRange.max] : ['auto', 'auto']}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="spot"
                            stroke="#10B981"
                            strokeWidth={2}
                            dot={false}
                            name="NIFTY Spot"
                            connectNulls={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="weeklySynthetic"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={false}
                            name="Weekly Synthetic"
                            connectNulls={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Cost of Carry Display */}
            {data?.weeklyCarry !== undefined && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-center space-x-4">
                        <span className="text-sm text-gray-400">Cost of Carry:</span>
                        <span className={`font-semibold text-lg ${data.weeklyCarry >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                            {data.weeklyCarry >= 0 ? '+' : ''}₹{data.weeklyCarry.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500">
                            ({((data.weeklyCarry / data.spot) * 100).toFixed(3)}%)
                        </span>
                    </div>
                </div>
            )}

            {/* Chart Info */}
            <div className="mt-2 text-center">
                <p className="text-xs text-gray-500">
                    Showing last {chartData.length} data points • Updates every second
                </p>
            </div>
        </div>
    );
};

export default SpotVsSyntheticChart;