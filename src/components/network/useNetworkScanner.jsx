import { useState, useCallback } from 'react';
import { base44 } from "@/api/base44Client";

export default function useNetworkScanner(onDeviceDiscovered, onScanProgress, onError, organizationId, selectedAgent) {
  const [isScanning, setIsScanning] = useState(false);

  const startScan = useCallback(async (cidr, networkId) => {
    if (!selectedAgent) {
      onError?.('No agent selected');
      return;
    }
    
    if (selectedAgent.status !== 'online' && selectedAgent.status !== 'registered') {
      onError?.('Selected agent is offline');
      return;
    }
    
    setIsScanning(true);
    
    try {
      const { data } = await base44.functions.invoke('sendAgentCommand', {
        agentId: selectedAgent.agent_id,
        command: {
          name: 'start_scan',
          params: { cidr, network_id: networkId }
        }
      });
      
      if (data.status === 'queued') {
        onError?.('Agent offline, scan queued for when it reconnects');
        setIsScanning(false);
      } else {
        // Poll for results (simplified - in production use SSE or WebSocket)
        pollScanProgress(data.command_id);
      }
    } catch (error) {
      console.error('Failed to start scan:', error);
      onError?.(error.message || 'Failed to start scan');
      setIsScanning(false);
    }
  }, [selectedAgent, onError]);

  const pollScanProgress = useCallback(async (commandId) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data: events } = await base44.functions.invoke('getAgentEvents', {
          agentId: selectedAgent.agent_id,
          commandId,
          limit: 10
        });
        
        if (!events || events.length === 0) return;
        
        // Process events in order
        events.reverse().forEach(event => {
          switch (event.event_type) {
            case 'scan_progress':
              onScanProgress?.(event.data);
              break;
            case 'device_found':
              onDeviceDiscovered?.(event.data);
              break;
            case 'scan_complete':
              clearInterval(pollInterval);
              setIsScanning(false);
              onScanProgress?.({ percent: 100, status: 'complete' });
              break;
            case 'error':
              clearInterval(pollInterval);
              setIsScanning(false);
              onError?.(event.data.message || 'Scan failed');
              break;
          }
        });
      } catch (error) {
        console.error('Failed to poll events:', error);
      }
    }, 2000);
    
    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (isScanning) {
        setIsScanning(false);
        onError?.('Scan timeout');
      }
    }, 300000);
  }, [selectedAgent, onScanProgress, onDeviceDiscovered, onError, isScanning]);

  const stopScan = useCallback(async () => {
    if (!selectedAgent) return;
    
    try {
      await base44.functions.invoke('sendAgentCommand', {
        agentId: selectedAgent.agent_id,
        command: { name: 'stop_scan', params: {} }
      });
      setIsScanning(false);
    } catch (error) {
      console.error('Failed to stop scan:', error);
    }
  }, [selectedAgent]);

  return {
    isScanning,
    startScan,
    stopScan
  };
}