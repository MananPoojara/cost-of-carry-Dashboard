/**
 * Enhanced Market Status Header - Professional Trading Dashboard
 * Features modern design with gradient accents and real-time indicators
 */

import React, { useState, useEffect } from 'react';

interface MarketStatusHeaderProps {
    connectionStatus?: string;
    atmStrike?: number;
    expiries?: {
        weekly?: string;
        monthly?: string;
    };
    spreadZScore?: {
        zScore: number;
        interpretation: string;
        extremeLevel: string;
    };
    lastUpdate?: string | null;
    marketStatus?: string;
    isMarketClosed?: boolean;
}

const MarketStatusHeader: React.FC<MarketStatusHeaderProps> = ({
    atmStrike,
    spreadZScore,
    marketStatus,
    isMarketClosed
}) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const getStatusConfig = () => {
        if (isMarketClosed) {
            return {
                color: 'from-red-500 to-orange-500',
                bgColor: 'bg-gradient-to-r from-red-500/10 to-orange-500/10',
                borderColor: 'border-red-500/30',
                textColor: 'text-red-400',
                statusText: 'MARKET CLOSED',
                description: 'Data frozen at market close - showing complete historical data'
            };
        }
        if (marketStatus === 'OPEN') {
            return {
                color: 'from-emerald-500 to-cyan-500',
                bgColor: 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10',
                borderColor: 'border-emerald-500/30',
                textColor: 'text-emerald-400',
                statusText: 'MARKET OPEN',
                description: 'Real-time data streaming'
            };
        }
        return {
            color: 'from-amber-500 to-yellow-500',
            bgColor: 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10',
            borderColor: 'border-amber-500/30',
            textColor: 'text-amber-400',
            statusText: 'PRE-MARKET',
            description: 'Market opens at 9:15 AM IST'
        };
    };

    const config = getStatusConfig();

    return (
        <div className="relative">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden rounded-xl">
                <div className={`absolute inset-0 ${config.bgColor} backdrop-blur-sm`}></div>
                <div className={`absolute inset-0 bg-gradient-to-r ${config.color} opacity-5 animate-pulse`}></div>
            </div>

            {/* Main Content */}
            <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 mb-6 shadow-2xl shadow-slate-950/50">
                {/* Market Status Banner */}
                <div className={`mb-6 p-4 rounded-lg border ${config.borderColor} ${config.bgColor}`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${config.color} animate-pulse`}></div>
                            <div>
                                <div className={`text-lg font-bold uppercase tracking-wider ${config.textColor} font-mono`}>
                                    {config.statusText}
                                </div>
                                <div className="text-sm text-slate-400 mt-1">
                                    {config.description}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-slate-400">
                            <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-mono">{currentTime.toLocaleTimeString('en-US', { hour12: true })} IST</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* ATM Strike */}
                    <div className="group">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Index Spot
                        </div>
                        <div className="text-2xl font-bold text-white font-mono group-hover:text-cyan-400 transition-colors">
                            {atmStrike ? atmStrike.toLocaleString() : '25,707'}
                        </div>
                        <div className="text-xs text-emerald-400 mt-1 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            +0.15%
                        </div>
                    </div>

                    {/* Synthetic */}
                    <div className="group">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Synthetic
                        </div>
                        <div className="text-2xl font-bold text-white font-mono group-hover:text-cyan-400 transition-colors">
                            {atmStrike ? (atmStrike + 15.75).toLocaleString() : '25,723'}
                        </div>
                        <div className="text-xs text-emerald-400 mt-1 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            +15.75
                        </div>
                    </div>

                    {/* Spread */}
                    <div className="group">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Spread
                        </div>
                        <div className="text-2xl font-bold text-white font-mono group-hover:text-cyan-400 transition-colors">
                            +15.75
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                            Basis Points
                        </div>
                    </div>

                    {/* Z-Score */}
                    <div className="group">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Z-Score
                        </div>
                        <div className={`text-2xl font-bold font-mono transition-colors ${
                            !spreadZScore ? 'text-slate-400' :
                            Math.abs(spreadZScore.zScore) > 2 ? 'text-red-400' :
                            Math.abs(spreadZScore.zScore) > 1 ? 'text-amber-400' : 'text-emerald-400'
                        } group-hover:text-cyan-400`}>
                            {spreadZScore ? spreadZScore.zScore.toFixed(2) : '0.48'}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                            {spreadZScore?.interpretation || 'Normal'}
                        </div>
                    </div>
                </div>

                {/* Subtle decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/5 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/5 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
            </div>
        </div>
    );
};

export default MarketStatusHeader;
