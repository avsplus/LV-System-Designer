import { useState, useCallback } from 'react';
import { base44 } from "@/api/base44Client";

export default function useNetworkScanner(onDeviceDiscovered, onScanProgress, onError, organizationId, selectedAgent) {
  const [isScanning, setIsScanning] = useState(false);

  const [currentNetworkId, setCurrentNetworkId] = useState(null);

  const startScan = useCallback(async (cidr, networkId) => {
    if (!selectedAgent) {
      onError?.('No agent selected');
      return;
    }
    
    if (selectedAgent.status !== 'online' && selectedAgent.status !== 'registered') {
      onError?.('Selected agent is offline or not responding');
      return;
    }
    
    setCurrentNetworkId(networkId);
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
        }
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
          // After 8 minutes with no events, warn the user
          if (pollCount === 240) {
            console.warn('⚠️ No events received after 8 minutes');
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
            case 'command_completed':
              console.log('✅ Scan complete', eventData);
              clearInterval(pollInterval);
              setIsScanning(false);
              
              // Process all discovered hosts from the result
              const hosts = eventData.result?.hosts || eventData.hosts || [];
              console.log(`📦 Processing ${hosts.length} discovered hosts`);
              
              hosts.forEach(host => {
                if (host.mac) {
                  onDeviceDiscovered?.({
                    ip_address: host.ip,
                    mac_address: host.mac,
                    vendor: host.vendor,
                    hostname: host.hostname,
                    network_id: currentNetworkId
                  });
                }
              });
              
              // Show completion
              onScanProgress?.({ percent: 100, status: 'complete', devicesFound: hosts.length });
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
    
    // Timeout after 10 minutes (deep scans can take a while)
    const timeout = setTimeout(() => {
      console.warn('⏱️ Scan timeout reached');
      clearInterval(pollInterval);
      if (isScanning) {
        setIsScanning(false);
        onError?.('Scan timeout - agent did not respond');
      }
    }, 600000);
    
    // Store interval ID for cleanup
    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [selectedAgent, onScanProgress, onDeviceDiscovered, onError, isScanning, currentNetworkId]);

  const stopScan = useCallback(() => {
    setIsScanning(false);
  }, []);

  return {
    isScanning,
    startScan,
    stopScan
  };
}