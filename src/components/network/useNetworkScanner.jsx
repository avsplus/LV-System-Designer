import { useState, useEffect, useRef, useCallback } from 'react';

export default function useNetworkScanner(onDeviceDiscovered, onLinkDiscovered) {
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [devicesFound, setDevicesFound] = useState(0);
  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket('ws://localhost:8765');
    
    ws.onopen = () => {
      console.log('Connected to network scanner agent');
      setIsConnected(true);
      ws.send(JSON.stringify({ type: 'hello' }));
      
      // Start ping interval
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'pong':
            break;
            
          case 'device':
            onDeviceDiscovered?.(message.data);
            setDevicesFound(prev => prev + 1);
            break;
            
          case 'link':
            onLinkDiscovered?.(message.data);
            break;
            
          case 'progress':
            setProgress(message.percentage || 0);
            setDevicesFound(message.devices_found || 0);
            break;
            
          case 'complete':
            setIsScanning(false);
            setProgress(100);
            break;
            
          case 'error':
            console.error('Scanner error:', message.error);
            setIsScanning(false);
            break;
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('Disconnected from network scanner agent');
      setIsConnected(false);
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };

    wsRef.current = ws;
  }, [onDeviceDiscovered, onLinkDiscovered]);

  const disconnect = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const startScan = useCallback(() => {
    if (!isConnected || isScanning) return;
    
    setIsScanning(true);
    setProgress(0);
    setDevicesFound(0);
    
    wsRef.current?.send(JSON.stringify({ type: 'scan' }));
  }, [isConnected, isScanning]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isScanning,
    progress,
    devicesFound,
    connect,
    disconnect,
    startScan
  };
}