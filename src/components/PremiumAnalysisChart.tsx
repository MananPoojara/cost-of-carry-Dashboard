/**
 * Premium Analysis Chart Component
 * Shows synthetic premium percentages over time
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface PremiumDataPoint {
    time: string;
    timestamp: number;
    weeklyPremium?: number;
    monthlyPremium?: number;
}

interface PremiumAnalysisChartProps {
    data?: {
        weeklyPremium?: number;
        monthlyPremium?: number;
        timestamp: string;
    };
    isConnected: boolean;
}

const PremiumAnalysisChart: React.FC<PremiumAnalysisChartProps> = ({
    data,
    isConnected
}) => {
    const [chartData, setChartData] = useState<PremiumDataPoint[]>([]);
    const [premiumRange, setPremiumRange] = useState({ min: 0, max: 0 });

    useEffect(() => {
        if (data && (data.weeklyPremium !== undefined || data.monthlyPremium !== undefined)) {
            const newDataPoint: PremiumDataPoint = {
                time: new Date(data.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }),
                timestamp: new Date(data.timestamp).getTime(),
                weeklyPremium: data.weeklyPremium,
                monthlyPremium: data.monthlyPremium
            };

            setChartData(prev => {
                const updated = [...prev, newDataPoint];
                // Keep only last 100 data points for performance
                const trimmed = updated.slice(-100);

                // Update premium range for better Y-axis scaling
                const allPremiums = trimmed.flatMap(point => [
                    point.weeklyPremium || 0,
                    point.monthlyPremium || 0
                ]).filter(premium => premium !== 0);

                if (allPremiums.length > 0) {
                    const min = Math.min(...allPremiums);
                    const max = Math.max(...allPremiums);
                    const padding = Math.max(Math.abs(max), Math.abs(min)) * 0.1; // 10% padding
                    setPremiumRange({
                        min: Math.floor((min - padding) * 100) / 100,
                        max: Math.ceil((max + padding) * 100) / 100
                    });
                }

                return trimmed;
            });
        }
    }, [data]);

    const formatPremium = (value: number) => `${value.toFixed(3)}%`;

    const getPremiumColor = (premium: number) => {
        if (Math.abs(premium) > 1) return '#EF4444'; // Red for high premium
        if (Math.abs(premium) > 0.5) return '#F59E0B'; // Orange for moderate premium
        return '#10B981'; // Green for normal premium
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
                    <p className="text-gray-300 text-sm mb-2">{`Time: ${label}`}</p>
                    {data.weeklyPremium !== undefined && (
                        <p className="text-purple-400 text-sm">
                            {`Weekly Premium: ${formatPremium(data.weeklyPremium)}`}
                        </p>
                    )}
                    {data.monthlyPremium !== undefined && (
                        <p className="text-yellow-400 text-sm">
                            {`Monthly Premium: ${formatPremium(data.monthlyPremium)}`}
                        </p>
                    )}
                    <p className="text-gray-400 text-xs mt-1">
                        Premium = (Synthetic - Spot) / Spot × 100
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
                    Synthetic Premium Analysis
                </h2>
                <div className="flex items-center space-x-4">
                    {/* Current Values */}
                    <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-purple-400 rounded-full mr-2"></div>
                            <span className="text-gray-300">
                                Weekly: {data?.weeklyPremium !== undefined ? formatPremium(data.weeklyPremium) : '--'}
                            </span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                            <span className="text-gray-300">
                                Monthly: {data?.monthlyPremium !== undefined ? formatPremium(data.monthlyPremium) : '--'}
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
                            tickFormatter={formatPremium}
                            domain={premiumRange.min !== 0 ? [premiumRange.min, premiumRange.max] : ['auto', 'auto']}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />

                        {/* Reference line at zero */}
                        <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="2 2" />

                        {/* Weekly Premium Line */}
                        <Line
                            type="monotone"
                            dataKey="weeklyPremium"
                            stroke="#A78BFA"
                            strokeWidth={2}
                            dot={false}
                            name="Weekly Premium %"
                            connectNulls={false}
                        />

                        {/* Monthly Premium Line */}
                        <Line
                            type="monotone"
                            dataKey="monthlyPremium"
                            stroke="#FCD34D"
                            strokeWidth={2}
                            dot={false}
                            name="Monthly Premium %"
                            connectNulls={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Premium Summary */}
            <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                    {/* Weekly Premium */}
                    {data?.weeklyPremium !== undefined && (
                        <div className="text-center">
                            <div className="text-sm text-gray-400 mb-1">Weekly Premium</div>
                            <div className={`text-2xl font-bold ${data.weeklyPremium >= 0 ? 'text-purple-400' : 'text-red-400'
                                }`}>
                                {data.weeklyPremium >= 0 ? '+' : ''}{formatPremium(data.weeklyPremium)}
                            </div>
                            <div className="text-xs text-gray-500">
                                {Math.abs(data.weeklyPremium) > 1 ? 'High Premium' :
                                    Math.abs(data.weeklyPremium) > 0.5 ? 'Moderate Premium' : 'Normal Premium'}
                            </div>
                        </div>
                    )}

                    {/* Monthly Premium */}
                    {data?.monthlyPremium !== undefined && (
                        <div className="text-center">
                            <div className="text-sm text-gray-400 mb-1">Monthly Premium</div>
                            <div className={`text-2xl font-bold ${data.monthlyPremium >= 0 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                {data.monthlyPremium >= 0 ? '+' : ''}{formatPremium(data.monthlyPremium)}
                            </div>
                            <div className="text-xs text-gray-500">
                                {Math.abs(data.monthlyPremium) > 1 ? 'High Premium' :
                                    Math.abs(data.monthlyPremium) > 0.5 ? 'Moderate Premium' : 'Normal Premium'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Premium Interpretation */}
                {data?.weeklyPremium !== undefined && data?.monthlyPremium !== undefined && (
                    <div className="mt-4 text-center">
                        <div className="text-sm text-gray-400">
                            Premium Difference: {' '}
                            <span className={`font-semibold ${(data.monthlyPremium - data.weeklyPremium) >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                {(data.monthlyPremium - data.weeklyPremium) >= 0 ? '+' : ''}
                                {formatPremium(data.monthlyPremium - data.weeklyPremium)}
                            </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            {data.monthlyPremium > data.weeklyPremium
                                ? 'Monthly options trading at higher premium (normal time decay)'
                                : 'Weekly options trading at higher premium (unusual condition)'
                            }
                        </div>
                    </div>
                )}
            </div>

            {/* Chart Info */}
            <div className="mt-2 text-center">
                <p className="text-xs text-gray-500">
                    Showing last {chartData.length} data points • Premium as % of spot price
                </p>
            </div>
        </div>
    );
};

export default PremiumAnalysisChart;