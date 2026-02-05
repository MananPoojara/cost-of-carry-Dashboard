/**
 * Monthly vs Weekly Spread Chart - Professional Quant Terminal Style
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
    time: string;
    timestamp: number;
    calendarSpread: number;
}

interface MonthlyVsWeeklySpreadChartProps {
    data?: {
        monthlySynthetic?: number;
        weeklySynthetic?: number;
        calendarSpread?: number;
        timestamp: string;
    };
    history?: any[];
    isConnected: boolean;
}

const MonthlyVsWeeklySpreadChart: React.FC<MonthlyVsWeeklySpreadChartProps> = ({
    data,
    history,
    isConnected
}) => {
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [spreadRange, setSpreadRange] = useState({ min: 0, max: 0 });

    // Handle history data
    useEffect(() => {
        if (history && history.length > 0) {
            const validHistory = [];
            for (const d of history) {
                if (d.calendarSpread && !isNaN(d.calendarSpread)) {
                    validHistory.push({
                        time: new Date(d.timestamp).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                        }),
                        timestamp: new Date(d.timestamp).getTime(),
                        calendarSpread: d.calendarSpread
                    });
                }
            }
            setChartData(validHistory);
        }
    }, [history]);

    // Update spread range when chart data changes
    useEffect(() => {
        if (chartData.length > 0) {
            const allSpreads = chartData.map(p => p.calendarSpread);
            if (allSpreads.length > 0) {
                const min = Math.min(...allSpreads);
                const max = Math.max(...allSpreads);
                const padding = (max - min) * 0.15 || 5;
                setSpreadRange({ min: min - padding, max: max + padding });
            }
        }
    }, [chartData]);

    useEffect(() => {
        if (data && data.calendarSpread !== undefined) {
            const newDataPoint: ChartDataPoint = {
                time: new Date(data.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }),
                timestamp: new Date(data.timestamp).getTime(),
                calendarSpread: data.calendarSpread
            };

            if (isNaN(data.calendarSpread)) {
                return;
            }

            setChartData(prev => {
                const updated = [...prev, newDataPoint].slice(-100); 
                return updated;
            });
        }
    }, [data]);

    const formatSpread = (v: number) => v.toFixed(2);

    return (
        <div className="bg-[#161B22] border border-[#1E2733] rounded-xl overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-[#1E2733]">
                <h2 className="text-sm font-medium text-[#C9D1D9]">
                    Calendar Spread
                </h2>
                <div className="text-right">
                    <span className="text-[11px] text-[#6E7681] uppercase tracking-wide">Spread</span>
                    <div className={`font-mono text-base font-semibold ${
                        data?.calendarSpread !== undefined && data.calendarSpread >= 0 
                            ? 'text-[#26A641]' 
                            : 'text-[#F85149]'
                    }`}>
                        {data?.calendarSpread !== undefined && data.calendarSpread !== null
                            ? (data.calendarSpread >= 0 ? '+' : '') + formatSpread(data.calendarSpread) 
                            : 'No data'}
                    </div>
                </div>
            </div>

            <div className="h-[320px] p-5 relative bg-[#0B0F14]">
                {chartData.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-[#6E7681] text-sm">Waiting for market data...</div>
                    </div>
                )}
                
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="0" stroke="#1E2733" vertical={false} horizontal={true} />
                        <XAxis dataKey="time" hide />
                        <YAxis 
                            orientation="right"
                            stroke="#6E7681"
                            fontSize={11}
                            fontFamily="Inter"
                            tickFormatter={(v) => v.toFixed(0)}
                            domain={spreadRange.min !== 0 && spreadRange.max !== 0 ? [spreadRange.min, spreadRange.max] : ['auto', 'auto']}
                            axisLine={false}
                            tickLine={false}
                            width={60}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: '#161B22', 
                                border: '1px solid #1E2733', 
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }}
                            itemStyle={{ fontSize: '12px', fontFamily: 'Inter', fontWeight: '500' }}
                            labelStyle={{ fontSize: '11px', color: '#6E7681', marginBottom: '4px' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="calendarSpread"
                            stroke={data?.calendarSpread !== undefined && data.calendarSpread >= 0 ? '#26A641' : '#F85149'}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                            name="Calendar Spread"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MonthlyVsWeeklySpreadChart;