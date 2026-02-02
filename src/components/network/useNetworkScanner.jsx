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
          scope: 'local',
          scan_profile: 'deep',
          options: {
            enable_icmp: true,
            enable_tcp_probe: true,
            resolve_dns: false
          }
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
    console.log('🔄 Starting scan result polling:', commandId);
    let pollCount = 0;
    
    const pollInterval = setInterval(async () => {
      try {
        pollCount++;
        console.log(`📊 Poll #${pollCount} for command ${commandId}`);
        
        // Poll command status from agent_commands table
        const { data: command } = await base44.functions.invoke('getAgentCommand', {
          command_id: commandId
        });
        
        if (!command) {
          console.warn('⚠️ Command not found, will retry...');
          if (pollCount >= 240) {
            console.error('⚠️ Command not found after 8 minutes');
            onError?.('Agent not responding. It may be offline or not connected.');
            clearInterval(pollInterval);
            setIsScanning(false);
          }
          return;
        }
        
        console.log('📊 Command status:', command.status);
        
        // Check terminal states
        if (command.status === 'completed') {
          console.log('✅ Scan complete, fetching results from agent_scan_results...');
          clearInterval(pollInterval);
          
          // Read result from agent_scan_results table (source of truth)
          const { data: scanResult } = await base44.functions.invoke('getScanResults', {
            command_id: commandId
          });
          
          console.log('📦 Scan result from agent_scan_results:', scanResult);
          console.log('📦 Results field:', scanResult?.results);
          console.log('📦 Results type:', typeof scanResult?.results);
          console.log('📦 Results keys:', scanResult?.results ? Object.keys(scanResult.results) : 'null');
          
          if (!scanResult?.results?.hosts) {
            console.warn('⚠️ No hosts in scan results');
            console.warn('⚠️ Full scanResult structure:', JSON.stringify(scanResult, null, 2));
            setIsScanning(false);
            onScanProgress?.({ percent: 100, status: 'complete', devicesFound: 0 });
            return;
          }
          
          const hosts = scanResult.results.hosts || [];
          console.log(`📦 Processing ${hosts.length} discovered hosts`);
          
          hosts.forEach(host => {
            console.log('🔍 Processing host:', host);
            if (host.mac) {
              onDeviceDiscovered?.({
                ip_address: host.ip,
                mac_address: host.mac,
                vendor: host.vendor,
                hostname: host.hostname,
                network_id: currentNetworkId,
                device_type: host.device_type,
                open_ports: host.open_ports || []
              });
            } else {
              console.warn('⚠️ Host missing MAC address, skipping:', host);
            }
          });
          
          setIsScanning(false);
          onScanProgress?.({ percent: 100, status: 'complete', devicesFound: hosts.length });
          console.log('✅ Scan processing complete');
        } else if (command.status === 'failed') {
          console.error('❌ Scan failed');
          clearInterval(pollInterval);
          setIsScanning(false);
          onError?.('Scan failed');
        } else {
          console.log('⏳ Command still pending/issued, continuing to poll...');
        }
      } catch (error) {
        console.error('❌ Failed to poll:', error);
      }
    }, 2000);
    
    // Timeout after 10 minutes
    const timeout = setTimeout(() => {
      console.warn('⏱️ Scan timeout reached');
      clearInterval(pollInterval);
      if (isScanning) {
        setIsScanning(false);
        onError?.('Scan timeout - agent did not respond');
      }
    }, 600000);
    
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