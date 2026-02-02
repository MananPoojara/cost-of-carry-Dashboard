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
}

export const useWebSocket = (url: string): UseWebSocketReturn => {
  const [data, setData] = useState<MarketData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  
  const reconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  };
  
  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(url, {
      transports: ['websocket'],
      upgrade: false,
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });
    
    const socket = socketRef.current;
    
    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      setIsConnected(true);
      setError(null);
      
      // Request current data on connection
      socket.emit('requestCurrentData');
    });
    
    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from WebSocket server:', reason);
      setIsConnected(false);
      setError(`Disconnected: ${reason}`);
    });
    
    socket.on('connect_error', (error) => {
      console.error('🔴 WebSocket connection error:', error);
      setIsConnected(false);
      setError(`Connection error: ${error.message}`);
    });
    
    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setError(null);
    });
    
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🟡 Reconnection attempt ${attemptNumber}`);
      setError(`Reconnecting... (attempt ${attemptNumber})`);
    });
    
    socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed');
      setIsConnected(false);
      setError('Reconnection failed');
    });
    
    // Data event handlers
    socket.on('marketData', (newData: MarketData) => {
      setData(newData);
      setError(null);
    });
    
    socket.on('currentData', (currentData: MarketData) => {
      setData(currentData);
      setError(null);
    });
    
    socket.on('connectionStatus', (status: ConnectionStatus) => {
      setConnectionStatus(status);
    });
    
    // Error handling
    socket.on('error', (error) => {
      console.error('🔴 Socket error:', error);
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
    reconnect 
  };
};