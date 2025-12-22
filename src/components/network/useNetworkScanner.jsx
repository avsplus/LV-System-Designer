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
      onError?.('Selected agent is offline or not responding');
      return;
    }
    
    setIsScanning(true);
    
    try {
      console.log('🚀 Starting scan:', { agent_id: selectedAgent.agent_id, cidr, networkId });
      const { data } = await base44.functions.invoke('sendAgentCommand', {
        agent_id: selectedAgent.agent_id,
        command: 'start_scan',
        data: { cidr, network_id: networkId }
      });
      
      console.log('📡 Command sent:', data);
      
      if (data.status === 'queued') {
        onError?.('Agent offline, scan queued for when it reconnects');
        setIsScanning(false);
      } else {
        // Poll for results
        pollScanProgress(data.command_id);
      }
    } catch (error) {
      console.error('❌ Failed to start scan:', error);
      onError?.(error.response?.data?.error || error.message || 'Failed to start scan');
      setIsScanning(false);
    }
  }, [selectedAgent, onError]);

  const pollScanProgress = useCallback(async (commandId) => {
    console.log('🔄 Starting event polling for command:', commandId);
    let pollCount = 0;
    
    const pollInterval = setInterval(async () => {
      try {
        pollCount++;
        console.log(`📊 Poll #${pollCount} for command ${commandId}`);
        
        const { data: events } = await base44.functions.invoke('getAgentEvents', {
          agent_id: selectedAgent.agent_id,
          command_id: commandId,
          limit: 10
        });
        
        console.log('📦 Events received:', events);
        
        if (!events || events.length === 0) {
          // After 30 seconds with no events, warn the user
          if (pollCount === 15) {
            console.warn('⚠️ No events received after 30 seconds');
            onError?.('Agent not responding. It may be offline or not connected.');
            clearInterval(pollInterval);
            setIsScanning(false);
          }
          return;
        }
        
        // Process events in order
        events.reverse().forEach(event => {
          console.log('🎯 Processing event:', event.event_type, event.data);
          switch (event.event_type) {
            case 'scan_progress':
              onScanProgress?.(event.data);
              break;
            case 'device_found':
              onDeviceDiscovered?.(event.data);
              break;
            case 'scan_complete':
              console.log('✅ Scan complete');
              clearInterval(pollInterval);
              setIsScanning(false);
              onScanProgress?.({ percent: 100, status: 'complete' });
              break;
            case 'error':
              console.error('❌ Scan error:', event.data);
              clearInterval(pollInterval);
              setIsScanning(false);
              onError?.(event.data.message || 'Scan failed');
              break;
          }
        });
      } catch (error) {
        console.error('❌ Failed to poll events:', error);
      }
    }, 2000);
    
    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      console.warn('⏱️ Scan timeout reached');
      clearInterval(pollInterval);
      if (isScanning) {
        setIsScanning(false);
        onError?.('Scan timeout - agent did not respond');
      }
    }, 300000);
    
    // Store interval ID for cleanup
    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [selectedAgent, onScanProgress, onDeviceDiscovered, onError, isScanning]);

  const stopScan = useCallback(async () => {
    if (!selectedAgent) return;
    
    try {
      await base44.functions.invoke('sendAgentCommand', {
        agent_id: selectedAgent.agent_id,
        command: 'stop_scan',
        data: {}
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