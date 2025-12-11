import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function useNetworkScanner(onDeviceDiscovered, onScanProgress, onError) {
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [agentVersion, setAgentVersion] = useState(null);
  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const currentScanRef = useRef(null);

  const sendMessage = useCallback((type, requestId, payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, requestId, payload }));
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket('ws://localhost:8765/ws');
    
    ws.onopen = () => {
      console.log('Connected to network scanner agent');
      setIsConnected(true);
      
      // Send hello handshake
      const helloRequestId = `hello-${Date.now()}`;
      ws.send(JSON.stringify({
        type: 'hello',
        requestId: helloRequestId,
        payload: {
          frontendVersion: 'fusion-console-v1',
          protocolVersion: 1
        }
      }));
      
      // Start ping interval (every 30 seconds)
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'ping',
            requestId: `ping-${Date.now()}`,
            payload: { timestamp: Date.now() }
          }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const { type, requestId, payload } = JSON.parse(event.data);
        
        switch (type) {
          case 'hello_ack':
            console.log('Agent handshake complete:', payload);
            setAgentVersion(payload.agentVersion);
            break;
            
          case 'pong':
            // Keep-alive acknowledged
            break;
            
          case 'device':
            // Convert agent format to our format
            const deviceData = {
              ip_address: payload.ip,
              mac_address: payload.mac,
              hostname: payload.hostname,
              vendor: payload.vendor,
              latency: payload.latency,
              network_id: payload.network_id
            };
            onDeviceDiscovered?.(deviceData);
            break;
            
          case 'scan_progress':
            onScanProgress?.({
              requestId,
              percent: payload.percent,
              status: payload.status,
              network_id: payload.network_id
            });
            
            if (payload.status === 'complete') {
              setIsScanning(false);
            }
            break;
            
          case 'scan_complete':
            setIsScanning(false);
            onScanProgress?.({
              requestId,
              percent: 100,
              status: 'complete',
              network_id: payload.network_id,
              totalDevices: payload.totalDevices
            });
            currentScanRef.current = null;
            break;
            
          case 'error':
            console.error('Scanner error:', payload);
            onError?.(payload.message || 'Scan failed');
            setIsScanning(false);
            currentScanRef.current = null;
            break;
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      onError?.('Failed to connect to scanner agent');
    };

    ws.onclose = () => {
      console.log('Disconnected from network scanner agent');
      setIsConnected(false);
      setIsScanning(false);
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };

    wsRef.current = ws;
  }, [onDeviceDiscovered, onScanProgress, onError]);

  const disconnect = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsScanning(false);
    currentScanRef.current = null;
  }, []);

  const startScan = useCallback((cidr, networkId) => {
    if (!isConnected || isScanning || !cidr || !networkId) return;
    
    setIsScanning(true);
    const requestId = `scan-${Date.now()}`;
    currentScanRef.current = requestId;
    
    sendMessage('start_scan', requestId, {
      cidr,
      network_id: networkId
    });
    
    return requestId;
  }, [isConnected, isScanning, sendMessage]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isScanning,
    agentVersion,
    connect,
    disconnect,
    startScan
  };
}