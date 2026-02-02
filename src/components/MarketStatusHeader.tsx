/**
 * Market Status Header - Production-Grade Status Display
 * Shows connection status, ATM strike, expiries, and spread analysis
 */

import React from 'react';
import { format } from 'date-fns';

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
    lastUpdate?: string;
}

const MarketStatusHeader: React.FC<MarketStatusHeaderProps> = ({
    connectionStatus = 'DISCONNECTED',
    atmStrike,
    expiries,
    spreadZScore,
    lastUpdate
}) => {
    const getStatusColor = (status: string) => {
        const colors = {
            'LIVE': 'bg-green-600 text-white',
            'RECONNECTING': 'bg-yellow-600 text-white',
            'DISCONNECTED': 'bg-red-600 text-white',
            'FAILED': 'bg-red-800 text-white'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-600 text-white';
    };

    const getStatusIcon = (status: string) => {
        const icons = {
            'LIVE': '🟢',
            'RECONNECTING': '🟡',
            'DISCONNECTED': '🔴',
            'FAILED': '🔴'
        };
        return icons[status as keyof typeof icons] || '⚫';
    };

    const getZScoreColor = (zScore: number) => {
        const absZScore = Math.abs(zScore);
        if (absZScore > 2) return 'text-red-400';
        if (absZScore > 1) return 'text-yellow-400';
        return 'text-green-400';
    };

    const formatExpiry = (dateString?: string) => {
        if (!dateString) return '--';
        try {
            return format(new Date(dateString), 'dd MMM');
        } catch {
            return '--';
        }
    };

    const formatLastUpdate = (dateString?: string) => {
        if (!dateString) return '--';
        try {
            return format(new Date(dateString), 'HH:mm:ss');
        } catch {
            return '--';
        }
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Connection Status */}
                <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded-md text-sm font-semibold flex items-center space-x-2 ${getStatusColor(connectionStatus)}`}>
                        <span>{getStatusIcon(connectionStatus)}</span>
                        <span>{connectionStatus}</span>
                    </div>

                    {/* ATM Strike Display */}
                    <div className="text-white">
                        <span className="text-gray-400 text-sm">ATM Strike: </span>
                        <span className="font-semibold text-lg">
                            {atmStrike ? `₹${atmStrike.toLocaleString()}` : '--'}
                        </span>
                    </div>
                </div>

                {/* Expiry Information */}
                <div className="flex items-center space-x-6">
                    <div className="text-white text-sm">
                        <span className="text-gray-400">Weekly Expiry: </span>
                        <span className="font-medium">{formatExpiry(expiries?.weekly)}</span>
                    </div>
                    <div className="text-white text-sm">
                        <span className="text-gray-400">Monthly Expiry: </span>
                        <span className="font-medium">{formatExpiry(expiries?.monthly)}</span>
                    </div>
                </div>

                {/* Spread Z-Score */}
                {spreadZScore && (
                    <div className="text-white text-sm">
                        <span className="text-gray-400">Spread Z-Score: </span>
                        <span className={`font-semibold ${getZScoreColor(spreadZScore.zScore)}`}>
                            {spreadZScore.zScore.toFixed(2)}
                        </span>
                        <span className="text-gray-400 ml-2">
                            ({spreadZScore.interpretation})
                        </span>
                        {spreadZScore.extremeLevel === 'EXTREME' && (
                            <span className="ml-2 px-2 py-1 bg-red-600 text-white text-xs rounded">
                                EXTREME
                            </span>
                        )}
                    </div>
                )}

                {/* Last Update */}
                <div className="text-gray-400 text-sm">
                    <span>Last Update: </span>
                    <span className="font-mono">{formatLastUpdate(lastUpdate)}</span>
                </div>
            </div>

            {/* Market Hours Indicator */}
            <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex items-center justify-between text-sm">
                    <div className="text-gray-400">
                        Market Hours: 9:15 AM - 3:30 PM IST
                    </div>
                    <div className="text-gray-400">
                        {new Date().toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        })} IST
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketStatusHeader;