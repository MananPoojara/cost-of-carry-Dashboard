'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/src/hooks/useWebSocket';
import MarketStatusHeader from '@/src/components/MarketStatusHeader';
import SpotVsSyntheticChart from '@/src/components/SpotVsSyntheticChart';
import CostOfCarryChart from '@/src/components/CostOfCarryChart';
import CalendarSpreadChart from '@/src/components/CalendarSpreadChart';
import WeeklySyntheticShortChart from '@/src/components/WeeklySyntheticShortChart';

export default function DashboardPage() {
  const { data, history, isConnected } = useWebSocket('http://localhost:3001');
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [logs, setLogs] = useState<{msg: string, type: string, time: string}[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [wsTestResult, setWsTestResult] = useState('');
  const [, forceUpdate] = useState({});

  // WebSocket test function
  const testWebSocketConnection = async () => {
    try {
      setWsTestResult('Testing WebSocket connection...');
      
      // Test 1: HTTP connection
      const httpResponse = await fetch('http://localhost:3001');
      console.log('HTTP Test - Status:', httpResponse.status);
      
      // Test 2: WebSocket connection
      const io = (await import('socket.io-client')).default;
      const socket = io('http://localhost:3001', {
        transports: ['websocket'],
        timeout: 5000
      });
      
      socket.on('connect', () => {
        setWsTestResult('WebSocket Connected!');
        console.log('WebSocket connected with ID:', socket.id);
        socket.close();
      });
      
      socket.on('connect_error', (error) => {
        setWsTestResult(`WebSocket Error: ${error.message}`);
        console.error('WebSocket connection error:', error);
      });
      
      // Timeout
      setTimeout(() => {
        if (socket.connected) {
          socket.close();
        } else {
          setWsTestResult('WebSocket Connection Timeout');
          socket.close();
        }
      }, 6000);
      
    } catch (error: any) {
      setWsTestResult(`Connection error: ${error.message}`);
      console.error('Test error:', error);
    }
  };

  // Force reconnection test
  useEffect(() => {
    if (!isConnected) {
      console.log('[Dashboard] Attempting WebSocket reconnection...');
      // Force component remount to trigger new connection
      setTimeout(() => {
        forceUpdate({});
      }, 2000);
    }
  }, [isConnected, forceUpdate]);

  console.log('[Dashboard] Render - data:', data, 'history length:', history?.length, 'isConnected:', isConnected);
  console.log('[Dashboard] First history item:', history?.[0]);
  console.log('[Dashboard] Last history item:', history?.[history.length - 1]);
  
  // Force reconnection test
  useEffect(() => {
    if (!isConnected) {
      console.log('[Dashboard] Attempting WebSocket reconnection...');
      // Force component remount to trigger new connection
      setTimeout(() => {
        forceUpdate({});
      }, 2000);
    }
  }, [isConnected, forceUpdate]);

  // Simulation/Activity Logs
  useEffect(() => {
    console.log('[Dashboard] Data updated:', data);
    console.log('[Dashboard] History length:', history?.length);
    if (data) {
      const newLog = {
        msg: `DATA_UPDATE: NIFTY@${data.spot?.toFixed(2)} | WKL:${data.weeklyCarry?.toFixed(2)}`,
        type: 'info',
        time: new Date().toLocaleTimeString('en-US', { hour12: false })
      };
      setLogs(prev => [newLog, ...prev].slice(0, 50));
    }
  }, [data, history]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50 text-gray-800 overflow-hidden">
      
      {/* Market Closed Notification */}
      {data?.isMarketClosed && (
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-3 flex-shrink-0 shadow-lg">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-center">
                <div className="text-white font-bold text-sm">MARKET CLOSED</div>
                <div className="text-white/90 text-xs">
                  Showing data from {data?.dataRange?.startDate} to {data?.dataRange?.endDate}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-3 flex-shrink-0 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Logo/Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-lg flex items-center justify-center shadow-md border border-white/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">DASHBOARD</h1>
                <p className="text-xs text-white/80 font-medium">Professional Trading Analytics</p>
              </div>
            </div>
            
            {/* Status Indicators */}
            <div className="flex items-center space-x-3 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20">
              <div className="flex items-center space-x-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse shadow-sm`}></div>
                <span className="text-xs font-semibold text-white">
                  {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
              <div className="h-3 w-px bg-white/30"></div>
              <div className="flex items-center space-x-2">
                <div className={`w-2.5 h-2.5 rounded-full ${data?.isMarketClosed ? 'bg-yellow-400' : 'bg-blue-400'} animate-pulse shadow-sm`}></div>
                <span className="text-xs font-semibold text-white">
                  {data?.isMarketClosed ? 'MARKET CLOSED' : 'MARKET OPEN'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Time Display */}
            <div className="text-sm font-mono text-white bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20 shadow-md">
              {new Date().toLocaleTimeString('en-US', { hour12: true })} IST
            </div>
            
            {/* Force Sync Button */}
            <button 
              className="px-4 py-2 bg-white text-blue-600 text-xs font-bold rounded-lg tracking-wide hover:bg-blue-50 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 flex items-center space-x-2 border border-white/30"
              onClick={() => setShowLogs(!showLogs)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{showLogs ? 'HIDE LOGS' : 'SHOW LOGS'}</span>
            </button>

          </div>
        </div>
      </header>

      {/* Metrics Cards Row */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-white flex-shrink-0 border-b border-gray-200 shadow-sm">
        {/* ATM Strike */}
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-200">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">ATM STRIKE</div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-gray-800 transition-all">
              ₹{data?.atmStrike?.toLocaleString() || '--'}
            </span>
          </div>
        </div>

        {/* Weekly Synthetic */}
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-200">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">WEEKLY SYNTHETIC</div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-gray-800 transition-all">
              ₹{data?.weeklySynthetic?.toFixed(2) || '--'}
            </span>
          </div>
        </div>

        {/* Calendar Spread */}
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-200">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">CALENDAR SPREAD</div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-xl font-bold transition-all ${
              data?.calendarSpread && data.calendarSpread >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {data?.calendarSpread ? (data.calendarSpread >= 0 ? '+' : '') + data.calendarSpread.toFixed(2) : '--'}
            </span>
            <span className="text-xs text-gray-500 uppercase font-semibold transition-all">PTS</span>
          </div>
        </div>

        {/* Cost of Carry */}
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-200">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">COST OF CARRY</div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-xl font-bold transition-all ${
              data?.weeklyCarry && data.weeklyCarry >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {data?.weeklyCarry ? (data.weeklyCarry >= 0 ? '+' : '') + data.weeklyCarry.toFixed(2) : '--'}
            </span>
            <span className="text-xs text-gray-500 uppercase font-semibold transition-all">BPS</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Charts Container */}
        <div className="flex-1 p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <div className="grid grid-cols-2 gap-6 auto-rows-fr">
            
            {/* Spot vs Synthetic Chart */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-300" style={{ minHeight: '350px' }}>
              <SpotVsSyntheticChart data={data ?? undefined} history={history} isConnected={isConnected} />
            </div>
            
            {/* Cost of Carry Chart */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
              <CostOfCarryChart data={data ?? undefined} history={history} isConnected={isConnected} />
            </div>
            
            {/* Calendar Spread Chart */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
              <CalendarSpreadChart data={data ?? undefined} history={history} isConnected={isConnected} />
            </div>
            
            {/* Weekly Synthetic Short Chart */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
              <WeeklySyntheticShortChart data={data ?? undefined} history={history} isConnected={isConnected} />
            </div>
            
          </div>
        </div>

        {/* Logs Panel - Toggleable */}
        {showLogs && (
          <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-xl">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Activity Logs
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {logs.map((log, i) => (
                <div key={i} className="text-xs p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-gray-600">{log.time}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-semibold">
                      {log.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-gray-700 font-mono">{log.msg}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-8 py-4 flex-shrink-0 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">
            © 2024 Professional Trading Dashboard • Real-time Market Analytics
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`}></div>
              <span className="text-xs text-gray-300">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Data Refresh: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        
        /* Smooth Transitions */
        .transition-all {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .transition-fast {
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Hover Effects */
        .hover-lift {
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hover-lift:hover {
          transform: translateY(-2px);
        }
        
        .hover-glow {
          transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hover-glow:hover {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        
        /* Custom Scrollbar */
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
          background-color: #d1d5db;
          border-radius: 3px;
        }
        .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb:hover {
          background-color: #9ca3af;
        }
        .scrollbar-track-transparent::-webkit-scrollbar-track {
          background-color: transparent;
        }
        
        /* Firefox scrollbar */
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db transparent;
        }
        
        /* Respect user's motion preference */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}