/**
 * WebSocket Hook for Real-time Data Connection
 * Handles connection state and automatic reconnection
 */

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface MarketData {
  spot: number;
  weeklySynthetic?: number;
  monthlySynthetic?: number;
  weeklyCarry?: number;
  monthlyCarry?: number;
  calendarSpread?: number;
  weeklyPremium?: number;
  monthlyPremium?: number;
  atmStrike?: number;
  spreadZScore?: {
    zScore: number;
    interpretation: string;
    extremeLevel: string;
  };
  connectionStatus: string;
  marketStatus: string;
  isMarketClosed?: boolean;
  dataRange?: {
    startDate: string;
    endDate: string;
  };
  expiries?: {
    weekly: string;
    monthly: string;
  };
  timestamp: string;
}

interface ConnectionStatus {
  status: string;
  display: {
    color: string;
    text: string;
    bgColor: string;
    textColor: string;
  };
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

interface UseWebSocketReturn {
  data: MarketData | null;
  connectionStatus: ConnectionStatus | null;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
  lastUpdated: string | null;
  history: MarketData[];
}

export const useWebSocket = (url: string): UseWebSocketReturn => {
  const [data, setData] = useState<MarketData | null>(null);
  const [history, setHistory] = useState<MarketData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  
  const reconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  };
  
  useEffect(() => {
    console.log('🔄 [WebSocket] Initializing connection to:', url);
    console.log('🔄 [WebSocket] Component mounted, initializing socket');
    // Initialize socket connection
    socketRef.current = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });
    
    const socket = socketRef.current;
    
    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ [WebSocket] Connected to WebSocket server');
      console.log('✅ [WebSocket] Socket URL:', url);
      console.log('✅ [WebSocket] Socket ID:', socket.id);
      console.log('✅ [WebSocket] Connected state before:', isConnected);
      setIsConnected(true);
      setError(null);
      setLastUpdated(new Date().toISOString());
      console.log('✅ [WebSocket] Connected state after:', true);
      
      // Request current data immediately after connection
      console.log('📤 [WebSocket] Requesting current data after connection');
      socket.emit('requestCurrentData');
      
      // Explicitly set connection status to LIVE on successful connect
      setConnectionStatus(prev => ({
        ...prev,
        status: 'LIVE',
        display: {
          color: '#00ffa3',
          text: 'Connected to backend',
          bgColor: 'bg-emerald-500/10',
          textColor: 'text-emerald-400'
        }
      } as any));
      
      // Request current data on connection
      socket.emit('requestCurrentData');
    });
    
    socket.on('disconnect', (reason) => {
      console.log('❌ [WebSocket] Disconnected from WebSocket server:', reason);
      console.log('❌ [WebSocket] Connected state before:', isConnected);
      setIsConnected(false);
      console.log('❌ [WebSocket] Connected state after:', false);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });
    
    socket.on('connect_error', (error: any) => {
      console.error('❌ [WebSocket] Connection error:', error);
      console.error('❌ [WebSocket] Error details:', error.message, error.type, error.description);
      setIsConnected(false);
      setError(`Connection error: ${error.message}`);
    });
    
    // Data event handlers
    socket.on('marketData', (newData: MarketData) => {
      console.log('📊 [WebSocket] Market data received:', newData);
      console.log('📊 [WebSocket] Data keys:', Object.keys(newData));
      console.log('📊 [WebSocket] Spot:', newData.spot, 'Weekly:', newData.weeklySynthetic);
      console.log('📊 [WebSocket] Timestamp:', newData.timestamp);
      console.log('📊 [WebSocket] Setting data state...');
      setData(newData);
      console.log('📊 [WebSocket] Data state set');
      setLastUpdated(new Date().toISOString());
      setError(null);
    });

    socket.on('historyData', (historyData: MarketData[]) => {
      console.log('📈 [WebSocket] History data received:', historyData.length, 'points');
      if (historyData.length > 0) {
        console.log('📈 [WebSocket] First point:', historyData[0]);
        console.log('📈 [WebSocket] Last point:', historyData[historyData.length - 1]);
        console.log('📈 [WebSocket] Last point spot:', historyData[historyData.length - 1].spot);
      }
      console.log('📈 [WebSocket] Setting history state...');
      setHistory(historyData);
      console.log('📈 [WebSocket] History state set');
      if (historyData.length > 0) {
        console.log('📈 [WebSocket] Setting latest data point...');
        setData(historyData[historyData.length - 1]);
        console.log('📈 [WebSocket] Latest data point set');
      }
      console.log('📈 [WebSocket] History state should be set now');
    });
    
    socket.on('currentData', (currentData: MarketData) => {
      setData(currentData);
      setLastUpdated(new Date().toISOString());
      setError(null);
    });
    
    socket.on('connectionStatus', (status: ConnectionStatus) => {
      setConnectionStatus(status);
    });
    
    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      setError(`Socket error: ${error}`);
    });
    
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [url]);
  
  return { 
    data, 
    connectionStatus, 
    isConnected, 
    error, 
    reconnect,
    lastUpdated,
    history
  };
};