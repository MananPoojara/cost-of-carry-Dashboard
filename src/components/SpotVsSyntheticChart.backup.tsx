/**
 * Spot vs Synthetic Chart - Professional Quant Terminal Style
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
    console.log('[SpotVsSyntheticChart] Component called with:', { data, historyLength: history?.length, isConnected });
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [priceRange, setPriceRange] = useState({ min: 0, max: 0 });

    // Handle history data
    useEffect(() => {
        console.log('[SpotVsSynthetic] History changed:', history?.length, 'points');
        console.log('[SpotVsSynthetic] History data sample:', history?.slice(0, 3));
        if (history && history.length > 0) {
            console.log('[SpotVsSynthetic] Processing history data...');
            const validHistory = [];
            let validCount = 0;
            let invalidCount = 0;
            
            for (const d of history) {
                const spotValid = d.spot && !isNaN(d.spot);
                const weeklyValid = d.weeklySynthetic && !isNaN(d.weeklySynthetic);
                
                console.log('[SpotVsSynthetic] Data point - Spot:', d.spot, 'Weekly:', d.weeklySynthetic, 'Spot Valid:', spotValid, 'Weekly Valid:', weeklyValid);
                
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
                    validCount++;
                } else {
                    invalidCount++;
                }
            }
            
            console.log('[SpotVsSynthetic] Data validation - Valid:', validCount, 'Invalid:', invalidCount);
            console.log('[SpotVsSynthetic] Setting chart data:', validHistory.length, 'points');
            console.log('[SpotVsSynthetic] Chart data sample:', validHistory.slice(0, 3));
            setChartData(validHistory);
        }
    }, [history]);

    // Update price range when chart data changes
    useEffect(() => {
        if (chartData.length > 0) {
            const allPrices = chartData.flatMap(p => [p.spot, p.weeklySynthetic || 0]).filter(v => v > 0);
            if (allPrices.length > 0) {
                const min = Math.min(...allPrices);
                const max = Math.max(...allPrices);
                const padding = (max - min) * 0.15 || 10;
                setPriceRange({ min: min - padding, max: max + padding });
            }
        }
    }, [chartData]);

    useEffect(() => {
        console.log('[SpotVsSynthetic] Data changed:', data);
        console.log('[SpotVsSynthetic] Data spot:', data?.spot, 'weeklySynthetic:', data?.weeklySynthetic);
        if (data && data.spot) {
            const newDataPoint: ChartDataPoint = {
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
                console.log('[SpotVsSynthetic] Invalid data, skipping');
                return;
            }

            console.log('[SpotVsSynthetic] Adding data point:', newDataPoint);
            console.log('[SpotVsSynthetic] Previous chart data length:', chartData.length);
            setChartData(prev => {
                const updated = [...prev, newDataPoint].slice(-100); 
                console.log('[SpotVsSynthetic] Chart data updated, length:', updated.length);
                console.log('[SpotVsSynthetic] Updated chart data sample:', updated.slice(-3));
                return updated;
            });
        }
    }, [data]);

    const formatPrice = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    console.log('[SpotVsSyntheticChart] Rendering with data:', data, 'history:', history?.length, 'chartData:', chartData.length);
    
    console.log('[SpotVsSyntheticChart] Rendering with data:', data, 'history:', history?.length, 'chartData:', chartData.length);
    
    return (
        <div className="bg-white border-4 border-red-500 rounded-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md p-2">
            <div className="bg-yellow-200 text-yellow-800 p-2 mb-2 font-bold text-center">CHART COMPONENT RENDERING</div>
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
                <h2 className="text-sm font-bold text-gray-800 transition-all duration-300 tracking-tight">
                    SPOT VS WEEKLY SYNTHETIC
                </h2>
                <div className="flex space-x-4">
                    <div className="text-right">
                        <span className="text-xs text-gray-500 uppercase font-semibold transition-all duration-300">SPOT</span>
                        <div className="font-mono text-sm font-bold text-gray-700 transition-all duration-300">
                            {data?.spot ? formatPrice(data.spot) : '--'}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-gray-500 uppercase font-semibold transition-all duration-300">SYNTHETIC</span>
                        <div className="font-mono text-sm font-bold text-emerald-600 transition-all duration-300">
                            {data?.weeklySynthetic ? formatPrice(data.weeklySynthetic) : '--'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-[300px] p-4 bg-white border-4 border-red-500">
                <div className="absolute top-2 left-2 text-xs text-gray-400 z-50">
                    Data points: {chartData.length}
                </div>
                {chartData.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-sm text-gray-400">Waiting for data...</div>
                    </div>
                )}
                
                {chartData.length > 0 && (
                    <>
                        <div className="absolute inset-0 bg-green-50 border border-green-200 rounded p-2 m-2 z-10">
                            <div className="text-green-800 text-xs font-bold">DEBUG: Chart Data Available ({chartData.length} points)</div>
                            <div className="text-green-700 text-xs">Sample: {JSON.stringify(chartData[0])}</div>
                        </div>
                        <div className="absolute inset-0 bg-blue-100 opacity-30 rounded"></div>
                        <div className="absolute top-10 left-10 w-32 h-20 bg-purple-200 border-2 border-purple-500 z-20">
                            <div className="text-purple-800 text-xs p-1">TEST AREA</div>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} horizontal={true} />
                            <XAxis dataKey="time" hide />
                            <YAxis 
                                orientation="right"
                                stroke="#6b7280"
                                fontSize={11}
                                fontFamily="monospace"
                                tickFormatter={(v) => v.toFixed(0)}
                                domain={[priceRange.min, priceRange.max]}
                                axisLine={false}
                                tickLine={false}
                                width={60}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#ffffff', 
                                    border: '1px solid #e5e7eb', 
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                                itemStyle={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 'normal', color: '#374151' }}
                                labelStyle={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="spot"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                                name="Spot"
                            />
                            <Line
                                type="monotone"
                                dataKey="weeklySynthetic"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                                name="Synthetic"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                )}
            </div>
        </div>
    );
};

export default SpotVsSyntheticChart;
