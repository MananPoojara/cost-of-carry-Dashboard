/**
 * NIFTY Synthetic Dashboard - Main Page
 * Production-grade trading dashboard with real-time data
 */

'use client';

import React from 'react';
import { useWebSocket } from '../src/hooks/useWebSocket';
import MarketStatusHeader from '../src/components/MarketStatusHeader';
import SpotVsSyntheticChart from '../src/components/SpotVsSyntheticChart';
import CostOfCarryChart from '../src/components/CostOfCarryChart';
import CalendarSpreadChart from '../src/components/CalendarSpreadChart';
import PremiumAnalysisChart from '../src/components/PremiumAnalysisChart';

export default function Dashboard() {
  const { data, connectionStatus, isConnected, error, reconnect } = useWebSocket(
    process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              NIFTY Synthetic Analysis Dashboard
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Real-time synthetic options analysis with production-grade features
            </p>
          </div>

          {/* Manual Reconnect Button */}
          {!isConnected && (
            <button
              onClick={reconnect}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Reconnect
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-6">
        {/* Market Status Header */}
        <MarketStatusHeader
          connectionStatus={data?.connectionStatus || connectionStatus?.status}
          atmStrike={data?.atmStrike}
          expiries={data?.expiries}
          spreadZScore={data?.spreadZScore}
          lastUpdate={data?.timestamp}
        />

        {/* Error Display */}
        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-400 mr-3">⚠️</div>
              <div>
                <h3 className="text-red-300 font-semibold">Connection Error</h3>
                <p className="text-red-200 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Chart 1: Spot vs Synthetic Weekly */}
          <SpotVsSyntheticChart
            data={data}
            isConnected={isConnected}
          />

          {/* Chart 2: Cost of Carry */}
          <CostOfCarryChart
            data={data}
            isConnected={isConnected}
          />

          {/* Chart 3: Calendar Spread */}
          <CalendarSpreadChart
            data={data}
            isConnected={isConnected}
          />

          {/* Chart 4: Premium Analysis */}
          <PremiumAnalysisChart
            data={data}
            isConnected={isConnected}
          />
        </div>

        {/* Data Summary Panel */}
        {data && (
          <div className="mt-6 bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Current Market Data Summary
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Spot Price */}
              <div className="text-center">
                <div className="text-sm text-gray-400">NIFTY Spot</div>
                <div className="text-xl font-bold text-green-400">
                  ₹{data.spot?.toLocaleString() || '--'}
                </div>
              </div>

              {/* Weekly Synthetic */}
              {data.weeklySynthetic && (
                <div className="text-center">
                  <div className="text-sm text-gray-400">Weekly Synthetic</div>
                  <div className="text-xl font-bold text-blue-400">
                    ₹{data.weeklySynthetic.toLocaleString()}
                  </div>
                </div>
              )}

              {/* Monthly Synthetic */}
              {data.monthlySynthetic && (
                <div className="text-center">
                  <div className="text-sm text-gray-400">Monthly Synthetic</div>
                  <div className="text-xl font-bold text-yellow-400">
                    ₹{data.monthlySynthetic.toLocaleString()}
                  </div>
                </div>
              )}

              {/* Weekly Carry */}
              {data.weeklyCarry !== undefined && (
                <div className="text-center">
                  <div className="text-sm text-gray-400">Weekly Carry</div>
                  <div className={`text-xl font-bold ${data.weeklyCarry >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                    {data.weeklyCarry >= 0 ? '+' : ''}₹{data.weeklyCarry.toFixed(2)}
                  </div>
                </div>
              )}

              {/* Calendar Spread */}
              {data.calendarSpread !== undefined && (
                <div className="text-center">
                  <div className="text-sm text-gray-400">Calendar Spread</div>
                  <div className={`text-xl font-bold ${data.calendarSpread >= 0 ? 'text-purple-400' : 'text-red-400'
                    }`}>
                    {data.calendarSpread >= 0 ? '+' : ''}₹{data.calendarSpread.toFixed(2)}
                  </div>
                </div>
              )}

              {/* ATM Strike */}
              {data.atmStrike && (
                <div className="text-center">
                  <div className="text-sm text-gray-400">ATM Strike</div>
                  <div className="text-xl font-bold text-gray-300">
                    ₹{data.atmStrike.toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {/* Z-Score Analysis */}
            {data.spreadZScore && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Spread Z-Score Analysis</div>
                  <div className="flex items-center justify-center space-x-4">
                    <div className={`text-2xl font-bold ${Math.abs(data.spreadZScore.zScore) > 2 ? 'text-red-400' :
                      Math.abs(data.spreadZScore.zScore) > 1 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                      {data.spreadZScore.zScore.toFixed(2)}
                    </div>
                    <div className="text-gray-300">
                      {data.spreadZScore.interpretation}
                    </div>
                    {data.spreadZScore.extremeLevel === 'EXTREME' && (
                      <div className="px-3 py-1 bg-red-600 text-white text-sm rounded-full">
                        EXTREME LEVEL
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-gray-700 text-center text-gray-400 text-sm">
          <p>
            NIFTY Synthetic Analysis Dashboard • Production-grade trading analytics
          </p>
          <p className="mt-1">
            Features: ATM Strike Auto-switching • Expiry Auto-rollover • Real-time Z-Score Analysis
          </p>
        </footer>
      </main>
    </div>
  );
}