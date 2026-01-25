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
        command_type: 'scan_network',
        parameters: { 
          cidr, 
          network_id: networkId,
          scope: 'local'
        },
        timeout_seconds: 300
      });
      
      console.log('📡 Command sent:', data);
      
      if (!data.command_id) {
        console.error('❌ No command_id returned');
        onError?.('Failed to start scan - no command ID returned');
        setIsScanning(false);
        return;
      }
      
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
        
        // Process events in order - flexible handling
        events.reverse().forEach(event => {
          console.log('🎯 Processing event:', event.event_type, event.data);
          
          // Best-effort data extraction - don't assume structure
          const eventData = event.data || {};
          
          switch (event.event_type) {
            case 'scan_progress':
              onScanProgress?.(eventData);
              break;
            case 'device_found':
              onDeviceDiscovered?.(eventData);
              break;
            case 'scan_complete':
              console.log('✅ Scan complete', eventData);
              clearInterval(pollInterval);
              setIsScanning(false);
              // Show completion with any available stats
              const completionMsg = eventData.discovered_hosts 
                ? `Found ${eventData.discovered_hosts} hosts` 
                : 'Scan complete';
              onScanProgress?.({ percent: 100, status: 'complete', ...eventData });
              break;
            case 'error':
              console.error('❌ Scan error:', eventData);
              clearInterval(pollInterval);
              setIsScanning(false);
              onError?.(eventData?.message || eventData?.error || 'Scan failed');
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
        command_type: 'stop_scan',
        parameters: {},
        timeout_seconds: 10
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