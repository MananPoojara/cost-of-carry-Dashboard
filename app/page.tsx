'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/src/hooks/useWebSocket';
import MarketStatusHeader from '@/src/components/MarketStatusHeader';
import SpotVsSyntheticChart from '@/src/components/SpotVsSyntheticChart';
import CostOfCarryChart from '@/src/components/CostOfCarryChart';
import CalendarSpreadChart from '@/src/components/CalendarSpreadChart';
import WeeklySyntheticShortChart from '@/src/components/WeeklySyntheticShortChart';

export default function DashboardPage() {
  // Use environment variable for WebSocket URL, default to localhost:3004
  const wsUrl = typeof window !== 'undefined' 
    ? process.env.NEXT_PUBLIC_WEBSOCKET_URL || `ws://${window.location.hostname}:3004`
    : 'http://backend:3004';
  const { data, history, isConnected } = useWebSocket(wsUrl);
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [logs, setLogs] = useState<{msg: string, type: string, time: string}[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [wsTestResult, setWsTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [, forceUpdate] = useState({});

  // Loading state management
  useEffect(() => {
    if (data || history?.length > 0) {
      setIsLoading(false);
    }
  }, [data, history]);

  // WebSocket test function
  const testWebSocketConnection = async () => {
    try {
      setWsTestResult('Testing WebSocket connection...');
      
      // Test 1: HTTP connection
      const httpResponse = await fetch('http://localhost:3004');
      console.log('HTTP Test - Status:', httpResponse.status);
      
      // Test 2: WebSocket connection
      const io = (await import('socket.io-client')).default;
      const socket = io('http://localhost:3004', {
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
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      
      {/* Market Status Header */}
      <MarketStatusHeader 
        atmStrike={data?.atmStrike}
        spreadZScore={data?.spreadZScore}
        marketStatus={data?.marketStatus}
        isMarketClosed={data?.isMarketClosed}
      />

      {/* Top Header Bar */}
      <header className="bg-gray-800 px-6 py-4 flex-shrink-0 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Logo/Brand */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">DASHBOARD</h1>
                <p className="text-xs text-gray-400 font-medium">Real-time Trading Analytics</p>
              </div>
            </div>
            
            {/* Status Indicators */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-xs font-medium text-gray-300">
                  {isConnected ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${data?.isMarketClosed ? 'bg-amber-500' : 'bg-blue-500'} animate-pulse`}></div>
                <span className="text-xs font-medium text-gray-300">
                  {data?.isMarketClosed ? 'CLOSED' : 'OPEN'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Time Display */}
            <div className="text-sm font-mono text-gray-300">
              {new Date().toLocaleTimeString('en-US', { hour12: true })} IST
            </div>
            
            {/* Logs Toggle */}
            <button 
              className="px-3 py-1.5 bg-gray-700 text-white text-xs font-medium rounded-md hover:bg-gray-600 transition-colors flex items-center space-x-1"
              onClick={() => setShowLogs(!showLogs)}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{showLogs ? 'HIDE' : 'LOGS'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Metrics Cards Row */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-gray-800 flex-shrink-0 border-b border-gray-700">
        {/* ATM Strike */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-400 uppercase mb-1">ATM STRIKE</div>
          <div className="text-xl font-bold text-white">
            ₹{data?.atmStrike ? data.atmStrike.toLocaleString() : 'No data'}
          </div>
        </div>

        {/* Weekly Synthetic */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-400 uppercase mb-1">WEEKLY SYNTHETIC</div>
          <div className="text-xl font-bold text-white">
            ₹{data?.weeklySynthetic ? data.weeklySynthetic.toFixed(2) : 'No data'}
          </div>
        </div>

        {/* Calendar Spread */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-400 uppercase mb-1">CALENDAR SPREAD</div>
          <div className={`text-xl font-bold ${
            data?.calendarSpread !== undefined && data.calendarSpread !== null && data.calendarSpread >= 0 
              ? 'text-green-500' 
              : 'text-red-500'
          }`}>
            {data?.calendarSpread !== undefined && data.calendarSpread !== null
              ? (data.calendarSpread >= 0 ? '+' : '') + data.calendarSpread.toFixed(2)
              : 'No data'}
          </div>
        </div>

        {/* Cost of Carry */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-400 uppercase mb-1">COST OF CARRY</div>
          <div className={`text-xl font-bold ${
            data?.weeklyCarry !== undefined && data.weeklyCarry !== null && data.weeklyCarry >= 0
              ? 'text-green-500'
              : 'text-red-500'
          }`}>
            {data?.weeklyCarry !== undefined && data.weeklyCarry !== null
              ? (data.weeklyCarry >= 0 ? '+' : '') + data.weeklyCarry.toFixed(2)
              : 'No data'}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-gray-800 rounded-lg p-6 flex flex-col items-center space-y-4">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-white">Loading Data</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {isConnected 
                    ? 'Connected, loading data...' 
                    : 'Connecting...'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Charts Container */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Spot vs Synthetic Chart */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 h-[400px]">
              <SpotVsSyntheticChart data={data ?? undefined} history={history} isConnected={isConnected} />
            </div>
            
            {/* Cost of Carry Chart */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 h-[400px]">
              <CostOfCarryChart data={data ?? undefined} history={history} isConnected={isConnected} />
            </div>
            
            {/* Calendar Spread Chart */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 h-[400px]">
              <CalendarSpreadChart data={data ?? undefined} history={history} isConnected={isConnected} />
            </div>
            
            {/* Weekly Synthetic Short Chart */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 h-[400px]">
              <WeeklySyntheticShortChart data={data ?? undefined} history={history} isConnected={isConnected} />
            </div>
            
          </div>
        </div>

        {/* Logs Panel - Toggleable */}
        {showLogs && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-sm font-bold text-white flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Activity Logs
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {logs.map((log, i) => (
                <div key={i} className="text-xs p-2 bg-gray-700/50 rounded border border-gray-600">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-gray-300">{log.time}</span>
                    <span className="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs rounded">
                      {log.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-gray-200 font-mono">{log.msg}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 px-6 py-3 flex-shrink-0 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-xs">
            © 2024 Trading Dashboard • Real-time Analytics
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-xs">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="text-xs">
              {new Date().toLocaleTimeString()}
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
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .transition-fast {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Hover Effects */
        .hover-lift {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hover-lift:hover {
          transform: translateY(-4px);
        }
        
        .hover-glow {
          transition: box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hover-glow:hover {
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -6px rgba(0, 0, 0, 0.2);
        }
        
        /* Custom Scrollbar - Dark Theme */
        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
        }
        .scrollbar-thumb-slate-600::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #475569, #334155);
          border-radius: 4px;
          border: 1px solid #1e293b;
        }
        .scrollbar-thumb-slate-600::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #64748b, #475569);
        }
        .scrollbar-track-transparent::-webkit-scrollbar-track {
          background: transparent;
        }
        
        /* Firefox scrollbar - Dark Theme */
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: #475569 transparent;
        }
        
        /* Gradient Text Animation */
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradientShift 3s ease infinite;
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
        
        /* Responsive adjustments */
        @media (max-width: 1200px) {
          .grid-cols-2 {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 768px) {
          .grid-cols-4 {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}