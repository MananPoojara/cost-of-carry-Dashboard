/**
 * Calendar Spread Chart Component
 * Shows Monthly vs Weekly synthetic spread analysis
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface SpreadDataPoint {
    time: string;
    timestamp: number;
    monthlySynthetic?: number;
    weeklySynthetic?: number;
    calendarSpread?: number;
}

interface CalendarSpreadChartProps {
    data?: {
        monthlySynthetic?: number;
        weeklySynthetic?: number;
        calendarSpread?: number;
        timestamp: string;
    };
    isConnected: boolean;
}

const CalendarSpreadChart: React.FC<CalendarSpreadChartProps> = ({
    data,
    isConnected
}) => {
    const [chartData, setChartData] = useState<SpreadDataPoint[]>([]);
    const [spreadRange, setSpreadRange] = useState({ min: 0, max: 0 });

    useEffect(() => {
        if (data && (data.monthlySynthetic !== undefined || data.weeklySynthetic !== undefined)) {
            const newDataPoint: SpreadDataPoint = {
                time: new Date(data.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }),
                timestamp: new Date(data.timestamp).getTime(),
                monthlySynthetic: data.monthlySynthetic,
                weeklySynthetic: data.weeklySynthetic,
                calendarSpread: data.calendarSpread
            };

            setChartData(prev => {
                const updated = [...prev, newDataPoint];
                // Keep only last 100 data points for performance
                const trimmed = updated.slice(-100);

                // Update spread range for better Y-axis scaling
                const allValues = trimmed.flatMap(point => [
                    point.monthlySynthetic || 0,
                    point.weeklySynthetic || 0,
                    point.calendarSpread || 0
                ]).filter(value => value !== 0);

                if (allValues.length > 0) {
                    const min = Math.min(...allValues);
                    const max = Math.max(...allValues);
                    const padding = (max - min) * 0.02; // 2% padding
                    setSpreadRange({
                        min: Math.floor(min - padding),
                        max: Math.ceil(max + padding)
                    });
                }

                return trimmed;
            });
        }
    }, [data]);

    const formatPrice = (value: number) => `₹${value.toFixed(2)}`;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
                    <p className="text-gray-300 text-sm mb-2">{`Time: ${label}`}</p>
                    {data.monthlySynthetic !== undefined && (
                        <p className="text-yellow-400 text-sm">
                            {`Monthly Synthetic: ${formatPrice(data.monthlySynthetic)}`}
                        </p>
                    )}
                    {data.weeklySynthetic !== undefined && (
                        <p className="text-red-400 text-sm">
                            {`Weekly Synthetic: ${formatPrice(data.weeklySynthetic)}`}
                        </p>
                    )}
                    {data.calendarSpread !== undefined && (
                        <p className="text-purple-400 text-sm font-semibold">
                            {`Calendar Spread: ${formatPrice(data.calendarSpread)}`}
                        </p>
                    )}
                    <p className="text-gray-400 text-xs mt-1">
                        Spread = Monthly - Weekly
                    </p>
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
                    Monthly Long vs Weekly Short Spread
                </h2>
                <div className="flex items-center space-x-4">
                    {/* Current Values */}
                    <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                            <span className="text-gray-300">
                                Monthly: {data?.monthlySynthetic ? formatPrice(data.monthlySynthetic) : '--'}
                            </span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                            <span className="text-gray-300">
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
                            domain={spreadRange.min > 0 ? [spreadRange.min, spreadRange.max] : ['auto', 'auto']}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />

                        {/* Monthly Synthetic Line */}
                        <Line
                            type="monotone"
                            dataKey="monthlySynthetic"
                            stroke="#FCD34D"
                            strokeWidth={2}
                            dot={false}
                            name="Monthly Synthetic"
                            connectNulls={false}
                        />

                        {/* Weekly Synthetic Line */}
                        <Line
                            type="monotone"
                            dataKey="weeklySynthetic"
                            stroke="#F87171"
                            strokeWidth={2}
                            dot={false}
                            name="Weekly Synthetic"
                            connectNulls={false}
                        />

                        {/* Calendar Spread Line */}
                        <Line
                            type="monotone"
                            dataKey="calendarSpread"
                            stroke="#A78BFA"
                            strokeWidth={3}
                            dot={false}
                            name="Calendar Spread"
                            connectNulls={false}
                        />

                        {/* Reference line at zero for spread */}
                        <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="2 2" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Calendar Spread Display */}
            {data?.calendarSpread !== undefined && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-center space-x-4">
                        <span className="text-sm text-gray-400">Calendar Spread:</span>
                        <span className={`font-semibold text-xl ${data.calendarSpread >= 0 ? 'text-purple-400' : 'text-red-400'
                            }`}>
                            {data.calendarSpread >= 0 ? '+' : ''}₹{data.calendarSpread.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500">
                            (Monthly - Weekly)
                        </span>
                    </div>

                    {/* Spread Interpretation */}
                    <div className="mt-2 text-center">
                        <p className="text-xs text-gray-400">
                            {data.calendarSpread > 0
                                ? 'Monthly trading at premium to Weekly (Time decay advantage)'
                                : data.calendarSpread < 0
                                    ? 'Weekly trading at premium to Monthly (Unusual condition)'
                                    : 'No spread difference'
                            }
                        </p>
                    </div>
                </div>
            )}

            {/* Chart Info */}
            <div className="mt-2 text-center">
                <p className="text-xs text-gray-500">
                    Showing last {chartData.length} data points • Calendar spread analysis
                </p>
            </div>
        </div>
    );
};

export default CalendarSpreadChart;