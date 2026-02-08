'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWebSocket } from '@/src/hooks/useWebSocket';
import { formatInTimeZone } from 'date-fns-tz';
import {
  BarChart3,
  Activity,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  LayoutDashboard,
  Settings,
  Bell,
  Search,
  ChevronRight,
  Info,
  Sun,
  Moon
} from 'lucide-react';
import LightweightChart from '@/src/components/LightweightChart';

export default function DashboardPage() {
  const wsUrl = typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_WEBSOCKET_URL || `ws://${window.location.hostname}:3004`
    : 'ws://localhost:3004';

  const { data, history, isConnected, lastUpdated } = useWebSocket(wsUrl);
  const [activeTab, setActiveTab] = useState('ANALYTICS');
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Loading state management
  useEffect(() => {
    if (data || history?.length > 0) {
      setTimeout(() => setIsLoading(false), 500);
    }
  }, [data, history]);

  // Transform history for Lightweight Charts
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return { spot: [], weekly: [], monthly: [], spread: [] };

    return {
      spot: history.map(h => ({ time: h.timestamp, value: h.spot })),
      weekly: history.filter(h => h.weeklyCarry !== undefined).map(h => ({ time: h.timestamp, value: h.weeklyCarry! })),
      monthly: history.filter(h => h.monthlyCarry !== undefined).map(h => ({ time: h.timestamp, value: h.monthlyCarry! })),
      spread: history.filter(h => h.calendarSpread !== undefined).map(h => ({ time: h.timestamp, value: h.calendarSpread! }))
    };
  }, [history]);

  const marketStatus = data?.marketStatus || 'CLOSED';
  const isMarketOpen = marketStatus === 'OPEN';

  return (
    <div className={`min-h-screen font-sans selection:bg-blue-500/30 ${isDarkMode ? 'bg-[#0B0F14] text-slate-300' : 'bg-slate-50 text-slate-800'}`}>

      {/* Side Navigation (Compact) */}
      <nav className={`fixed left-0 top-0 bottom-0 w-16 border-r flex flex-col items-center py-6 gap-8 z-50 transition-colors ${isDarkMode ? 'bg-[#0B0F14] border-slate-800/50' : 'bg-white border-slate-200 shadow-sm'
        }`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col gap-6">
          <NavIcon icon={<LayoutDashboard size={20} />} active={activeTab === 'ANALYTICS'} dark={isDarkMode} onClick={() => setActiveTab('ANALYTICS')} />
          <NavIcon icon={<BarChart3 size={20} />} active={activeTab === 'CHARTS'} dark={isDarkMode} onClick={() => setActiveTab('CHARTS')} />
          <NavIcon icon={<Activity size={20} />} active={activeTab === 'LOGS'} dark={isDarkMode} onClick={() => setActiveTab('LOGS')} />
        </div>
        <div className="mt-auto flex flex-col gap-6">
          <NavIcon
            icon={isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            dark={isDarkMode}
            onClick={() => setIsDarkMode(!isDarkMode)}
          />
          <NavIcon icon={<Bell size={20} />} dark={isDarkMode} />
          <NavIcon icon={<Settings size={20} />} dark={isDarkMode} />
        </div>
      </nav>

      {/* Main Container */}
      <main className="pl-16 flex flex-col min-h-screen">

        {/* Superior Header */}
        <header className={`h-16 border-b sticky top-0 z-40 px-8 flex items-center justify-between transition-colors ${isDarkMode ? 'bg-[#0B0F14]/80 border-slate-800/50' : 'bg-white/80 border-slate-200 shadow-sm'
          } backdrop-blur-md`}>
          <div className="flex items-center gap-8">
            <div>
              <h1 className={`text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${isDarkMode ? 'from-white to-slate-400' : 'from-slate-900 to-slate-500'
                }`}>
                COST OF CARRY
              </h1>
              <p className={`text-[10px] uppercase tracking-[0.2em] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Alpha Terminal v2.0
              </p>
            </div>

            {/* Market Badge */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider ${isMarketOpen
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
              }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {marketStatus}
            </div>

            {/* Connection Status */}
            <div className={`flex items-center gap-4 text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-1 h-1 rounded-full ${isConnected ? 'bg-blue-500' : 'bg-red-500'}`} />
                {isConnected ? 'LIVE FEED ACTIVE' : 'RECONNECTING...'}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={10} />
                {formatInTimeZone(new Date(), 'Asia/Kolkata', 'HH:mm')} IST
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-blue-400 transition-colors ${isDarkMode ? 'text-slate-500' : 'text-slate-400'
                }`} size={14} />
              <input
                type="text"
                placeholder="Search instrument..."
                className={`border rounded-lg py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-blue-500/50 transition-all w-48 focus:w-64 ${isDarkMode ? 'bg-slate-900/50 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-900'
                  }`}
              />
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 p-8 pt-6 space-y-6">

          {/* Market Intelligence Row */}
          {!isMarketOpen && (
            <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-200">
                    {data?.marketStatus === 'WEEKEND' ? 'Weekend - Market Closed' :
                      data?.marketStatus === 'HOLIDAY' ? 'Holiday - Market Closed' :
                        'Market is currently closed'}
                  </p>
                  <p className="text-xs text-amber-500/70">{data?.marketDescription || 'Showing final snapshot data from last session'}</p>
                </div>
              </div>
              <button className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1">
                VIEW SESSION SUMMARY <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Nifty Spot"
              value={data?.spot?.toLocaleString()}
              subValue="+12.45 (0.05%)"
              type="neutral"
              dark={isDarkMode}
              icon={<TrendingUp size={14} />}
            />
            <MetricCard
              label="Weekly Carry"
              value={data?.weeklyCarry?.toFixed(2)}
              subValue={data?.weeklyPremium ? `${data.weeklyPremium.toFixed(3)}%` : undefined}
              type={data?.weeklyCarry && data.weeklyCarry > 0 ? 'bullish' : 'bearish'}
              dark={isDarkMode}
              icon={<Zap size={14} />}
            />
            <MetricCard
              label="Calendar Spread"
              value={data?.calendarSpread?.toFixed(2)}
              subValue={`Z-Score: ${data?.spreadZScore?.zScore?.toFixed(2) || '0.00'}`}
              type="special"
              dark={isDarkMode}
              icon={<BarChart3 size={14} />}
            />
            <MetricCard
              label="ATM Strike"
              value={data?.atmStrike?.toLocaleString()}
              subValue="Current Adjustment"
              type="neutral"
              dark={isDarkMode}
              icon={<Info size={14} />}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[1000px] lg:h-[800px] min-h-[600px]">
            <div className="grid grid-rows-2 gap-4">
              <div className="h-full min-h-[300px]">
                <LightweightChart
                  title="NIFTY SPOT PRICE"
                  data={chartData.spot}
                  color="#3b82f6"
                  dark={isDarkMode}
                />
              </div>
              <div className="h-full min-h-[300px]">
                <LightweightChart
                  title="COST OF CARRY (WEEKLY)"
                  data={chartData.weekly}
                  color="#10b981"
                  dark={isDarkMode}
                />
              </div>
            </div>
            <div className="grid grid-rows-2 gap-4">
              <div className="h-full min-h-[300px]">
                <LightweightChart
                  title="CALENDAR SPREAD"
                  data={chartData.spread}
                  color="#f59e0b"
                  dark={isDarkMode}
                />
              </div>
              <div className="h-full min-h-[300px]">
                <LightweightChart
                  title="MONTHLY CARRY"
                  data={chartData.monthly}
                  color="#a855f7"
                  dark={isDarkMode}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer Bar */}
        <footer className={`h-10 border-t px-8 flex items-center justify-between text-[10px] font-bold transition-colors ${isDarkMode ? 'bg-[#0B0F14] border-slate-800/50 text-slate-500' : 'bg-white border-slate-200 text-slate-400 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]'
          }`}>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 uppercase">
              <ShieldCheck size={12} className="text-emerald-500" />
              Institutional Data Integration Verified
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={isDarkMode ? 'text-slate-600' : 'text-slate-400'}>LATENCY: 42ms</span>
            <span className={isDarkMode ? 'text-slate-600' : 'text-slate-400'}>TICKER: @{data?.atmStrike || 'NIFTY'}</span>
          </div>
        </footer>

      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-[#0B0F14] z-[100] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center animate-bounce shadow-2xl shadow-blue-500/20">
              <Zap className="text-white" size={24} />
            </div>
            <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 animate-[loading_1.5s_ease-in-out_infinite]" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Initializing Terminal...</p>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

    </div>
  );
}

function NavIcon({ icon, active = false, dark = true, onClick }: { icon: any, active?: boolean, dark?: boolean, onClick?: () => void }) {
  const activeStyles = dark
    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
    : 'bg-blue-500 text-white shadow-md shadow-blue-500/20';

  const inactiveStyles = dark
    ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100';

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl transition-all duration-300 group relative ${active ? activeStyles : inactiveStyles}`}
    >
      {icon}
      {active && <div className={`absolute left-[calc(100%+12px)] w-1 h-1 rounded-full ${dark ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-blue-600'}`} />}
    </button>
  );
}

function MetricCard({ label, value, subValue, type, icon, dark = true }: { label: string, value?: string, subValue?: string, type: 'bullish' | 'bearish' | 'neutral' | 'special', icon: any, dark?: boolean }) {
  const typeStyles = {
    bullish: dark ? 'text-emerald-400' : 'text-emerald-600',
    bearish: dark ? 'text-rose-400' : 'text-rose-600',
    neutral: dark ? 'text-slate-200' : 'text-slate-900',
    special: dark ? 'text-blue-400' : 'text-blue-600'
  };

  const bgStyles = {
    bullish: dark ? 'from-emerald-500/5 to-transparent border-emerald-500/10' : 'bg-emerald-50/30 border-emerald-200/50',
    bearish: dark ? 'from-rose-500/5 to-transparent border-rose-500/10' : 'bg-rose-50/30 border-rose-200/50',
    neutral: dark ? 'from-slate-500/5 to-transparent border-slate-500/10' : 'bg-slate-50/50 border-slate-200/50',
    special: dark ? 'from-blue-500/5 to-transparent border-blue-500/10' : 'bg-blue-50/30 border-blue-200/50'
  };

  return (
    <div className={`p-4 rounded-2xl border transition-all cursor-default ${dark ? `bg-gradient-to-br ${bgStyles[type]} backdrop-blur-sm group hover:border-slate-700` : `${bgStyles[type]} group hover:border-slate-300 hover:shadow-sm`
      }`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${dark ? 'text-slate-500 group-hover:text-slate-400' : 'text-slate-400 group-hover:text-slate-500'
          }`}>{label}</span>
        <div className={`p-1.5 rounded-lg border ${dark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          } ${typeStyles[type]}`}>
          {icon}
        </div>
      </div>
      <div className="flex flex-col">
        <span className={`text-xl font-bold font-mono tracking-tight ${typeStyles[type]}`}>
          {value || '---'}
        </span>
        {subValue && (
          <span className={`text-[10px] font-medium mt-1 uppercase tracking-tight ${dark ? 'text-slate-500' : 'text-slate-400'
            }`}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}