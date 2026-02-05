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
    console.log('[WebSocket] Initializing connection to:', url);
    console.log('[WebSocket] Component mounted, initializing socket');
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
      console.log('[WebSocket] Connected to WebSocket server');
      console.log('[WebSocket] Socket URL:', url);
      console.log('[WebSocket] Socket ID:', socket.id);
      console.log('[WebSocket] Connected state before:', isConnected);
      setIsConnected(true);
      setError(null);
      setLastUpdated(new Date().toISOString());
      console.log('[WebSocket] Connected state after:', true);
      
      // Request current data immediately after connection
      console.log('[WebSocket] Requesting current data after connection');
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
      console.log('[WebSocket] Disconnected from WebSocket server:', reason);
      console.log('[WebSocket] Connected state before:', isConnected);
      setIsConnected(false);
      console.log('[WebSocket] Connected state after:', false);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });
    
    socket.on('connect_error', (error: any) => {
      console.error('[WebSocket] Connection error:', error);
      console.error('[WebSocket] Error details:', error.message, error.type, error.description);
      setIsConnected(false);
      setError(`Connection error: ${error.message}`);
    });
    
    // Data validation
    const isValidData = (data: MarketData) => {
      // Check if we have essential data fields
      const hasSpot = data.spot && !isNaN(data.spot) && data.spot > 0;
      const hasTimestamp = data.timestamp && new Date(data.timestamp).toString() !== 'Invalid Date';
      
      // At least one synthetic value should be present
      const hasSynthetic = (data.weeklySynthetic && !isNaN(data.weeklySynthetic)) || 
                          (data.monthlySynthetic && !isNaN(data.monthlySynthetic));
      
      return hasSpot && hasTimestamp && hasSynthetic;
    };
    
    // Data event handlers with debouncing to prevent excessive updates
    let lastUpdateTime = 0;
    socket.on('marketData', (newData: MarketData) => {
      const now = Date.now();
      // Debounce rapid updates - only update every 200ms to prevent excessive re-renders
      if (now - lastUpdateTime < 200) {
        return;
      }
      lastUpdateTime = now;
      
      console.log('[WebSocket] Market data received:', newData);
      console.log('[WebSocket] Data keys:', Object.keys(newData));
      console.log('[WebSocket] Spot:', newData.spot, 'Weekly:', newData.weeklySynthetic);
      console.log('[WebSocket] Timestamp:', newData.timestamp);
      
      // Validate data before processing
      if (!isValidData(newData)) {
        console.warn('[WebSocket] Received invalid data, skipping update:', newData);
        return;
      }
      
      console.log('[WebSocket] Setting data state...');
      setData(prevData => {
        // Only update if the data is different to prevent unnecessary re-renders
        if (prevData && 
            prevData.spot === newData.spot && 
            prevData.weeklySynthetic === newData.weeklySynthetic &&
            prevData.monthlySynthetic === newData.monthlySynthetic &&
            prevData.atmStrike === newData.atmStrike) {
          return prevData;
        }
        return newData;
      });
      console.log('[WebSocket] Data state set');
      setLastUpdated(new Date().toISOString());
      setError(null);
    });

    socket.on('historyData', (historyData: MarketData[]) => {
      console.log('[WebSocket] History data received:', historyData.length, 'points');
      if (historyData.length > 0) {
        console.log('[WebSocket] First point:', historyData[0]);
        console.log('[WebSocket] Last point:', historyData[historyData.length - 1]);
        console.log('[WebSocket] Last point spot:', historyData[historyData.length - 1].spot);
      }
      
      // Validate history data
      const validHistory = historyData.filter(isValidData);
      if (validHistory.length !== historyData.length) {
        console.warn(`[WebSocket] Filtered out ${historyData.length - validHistory.length} invalid history points`);
      }
      
      console.log('[WebSocket] Setting history state...');
      setHistory(prevHistory => {
        // Only update if the history is different to prevent unnecessary re-renders
        if (prevHistory.length === validHistory.length) {
          const isSame = prevHistory.every((item, index) => 
            item.spot === validHistory[index].spot &&
            item.weeklySynthetic === validHistory[index].weeklySynthetic &&
            item.monthlySynthetic === validHistory[index].monthlySynthetic
          );
          if (isSame) {
            return prevHistory;
          }
        }
        return validHistory;
      });
      console.log('[WebSocket] History state set');
      if (validHistory.length > 0) {
        console.log('[WebSocket] Setting latest data point...');
        setData(prevData => {
          const latestPoint = validHistory[validHistory.length - 1];
          // Only update if the data is different to prevent unnecessary re-renders
          if (prevData && 
              prevData.spot === latestPoint.spot && 
              prevData.weeklySynthetic === latestPoint.weeklySynthetic &&
              prevData.monthlySynthetic === latestPoint.monthlySynthetic &&
              prevData.atmStrike === latestPoint.atmStrike) {
            return prevData;
          }
          return latestPoint;
        });
        console.log('[WebSocket] Latest data point set');
      }
      console.log('[WebSocket] History state should be set now');
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