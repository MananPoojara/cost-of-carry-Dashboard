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
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 overflow-hidden">
      
      {/* Market Status Header */}
      <MarketStatusHeader 
        atmStrike={data?.atmStrike}
        spreadZScore={data?.spreadZScore}
        marketStatus={data?.marketStatus}
        isMarketClosed={data?.isMarketClosed}
      />

      {/* Top Header Bar */}
      <header className="bg-slate-900/80 backdrop-blur-md px-8 py-5 flex-shrink-0 border-b border-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Logo/Brand */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">NIFTY Dashboard</h1>
                <p className="text-xs text-slate-400 font-medium">Real-time Trading Analytics</p>
              </div>
            </div>
            
            {/* Status Indicators */}
            <div className="flex items-center space-x-6 ml-12">
              <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-xs font-semibold text-slate-300">
                  {isConnected ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className={`w-2 h-2 rounded-full ${data?.isMarketClosed ? 'bg-amber-400' : 'bg-blue-400'} animate-pulse`}></div>
                <span className="text-xs font-semibold text-slate-300">
                  {data?.isMarketClosed ? 'CLOSED' : 'OPEN'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-5">
            {/* Time Display */}
            <div className="text-sm font-mono text-slate-400">
              {new Date().toLocaleTimeString('en-US', { hour12: true })} IST
            </div>
            
            {/* Logs Toggle */}
            <button 
              className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700/50 transition-all duration-200 flex items-center space-x-2 hover:border-slate-600"
              onClick={() => setShowLogs(!showLogs)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{showLogs ? 'HIDE' : 'LOGS'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Metrics Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 px-8 py-6 flex-shrink-0 bg-slate-900/40">
        {/* ATM Strike */}
        <div className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/80 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide">ATM Strike</div>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono group-hover:text-cyan-300 transition-colors">
            ₹{data?.atmStrike ? data.atmStrike.toLocaleString() : '—'}
          </div>
        </div>

        {/* Weekly Synthetic */}
        <div className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/80 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Weekly Synthetic</div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono group-hover:text-blue-300 transition-colors">
            ₹{data?.weeklySynthetic ? data.weeklySynthetic.toFixed(2) : '—'}
          </div>
        </div>

        {/* Calendar Spread */}
        <div className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/80 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Calendar Spread</div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6" />
              </svg>
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono group-hover:text-emerald-300 transition-colors ${
            data?.calendarSpread !== undefined && data.calendarSpread !== null && data.calendarSpread >= 0 
              ? 'text-emerald-400' 
              : 'text-red-400'
          }`}>
            {data?.calendarSpread !== undefined && data.calendarSpread !== null
              ? (data.calendarSpread >= 0 ? '+' : '') + data.calendarSpread.toFixed(2)
              : '—'}
          </div>
        </div>

        {/* Cost of Carry */}
        <div className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/80 transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Cost of Carry</div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono group-hover:text-purple-300 transition-colors ${
            data?.weeklyCarry !== undefined && data?.weeklyCarry !== null && data.weeklyCarry >= 0
              ? 'text-emerald-400'
              : 'text-red-400'
          }`}>
            {data?.weeklyCarry !== undefined && data?.weeklyCarry !== null
              ? (data.weeklyCarry >= 0 ? '+' : '') + data.weeklyCarry.toFixed(2)
              : '—'}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 flex flex-col items-center space-y-4 border border-slate-700/50 shadow-2xl">
              <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white">Loading Data</h3>
                <p className="text-sm text-slate-400 mt-2">
                  {isConnected 
                    ? 'Connected, loading data...' 
                    : 'Connecting...'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Charts Container */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Spot vs Synthetic Chart */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700/50 h-[420px] overflow-hidden shadow-lg hover:border-slate-600/80 transition-all duration-200">
              <SpotVsSyntheticChart data={data ?? undefined} history={history} isConnected={isConnected} />
            </div>
            
            {/* Cost of Carry Chart */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700/50 h-[420px] overflow-hidden shadow-lg hover:border-slate-600/80 transition-all duration-200">
              <CostOfCarryChart data={data ?? undefined} history={history} isConnected={isConnected} />
            </div>
            
            {/* Calendar Spread Chart */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700/50 h-[420px] overflow-hidden shadow-lg hover:border-slate-600/80 transition-all duration-200">
              <CalendarSpreadChart data={data ?? undefined} history={history} isConnected={isConnected} />
            </div>
            
            {/* Weekly Synthetic Short Chart */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700/50 h-[420px] overflow-hidden shadow-lg hover:border-slate-600/80 transition-all duration-200">
              <WeeklySyntheticShortChart data={data ?? undefined} history={history} isConnected={isConnected} />
            </div>
            
          </div>
        </div>

        {/* Logs Panel - Toggleable */}
        {showLogs && (
          <div className="w-96 bg-slate-900/80 backdrop-blur-md border-l border-slate-700/50 flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-700/50">
              <h3 className="text-sm font-bold text-white flex items-center">
                <svg className="w-4 h-4 mr-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Activity Logs
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {logs.map((log, i) => (
                <div key={i} className="text-xs p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600/80 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-slate-400 text-xs">{log.time}</span>
                    <span className="px-2 py-0.5 bg-slate-700/50 text-slate-300 text-xs rounded border border-slate-600/50">
                      {log.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-slate-200 font-mono text-xs break-words">{log.msg}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-slate-900/80 backdrop-blur-md text-slate-400 px-8 py-4 flex-shrink-0 border-t border-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="text-xs">
            © 2025 NIFTY Trading Dashboard • Real-time Analytics Platform
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`}></div>
              <span className="text-xs text-slate-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="text-xs text-slate-500">
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
