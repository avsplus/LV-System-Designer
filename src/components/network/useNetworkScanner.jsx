import { useState, useCallback } from 'react';
import { base44 } from "@/api/base44Client";

export default function useNetworkScanner(onDeviceDiscovered, onScanProgress, onError, organizationId) {
  const [isScanning, setIsScanning] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const loadAgents = useCallback(async () => {
    try {
      const { data } = await base44.functions.invoke('listAgents', {});
      setAgents(data || []);
      
      // Auto-select first online agent
      const onlineAgent = data?.find(a => a.status === 'online');
      if (onlineAgent) {
        setSelectedAgent(onlineAgent);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
      onError?.('Failed to load agents');
    }
  }, [onError]);

  const startScan = useCallback(async (cidr, networkId) => {
    if (!selectedAgent) {
      onError?.('No agent selected');
      return;
    }
    
    if (selectedAgent.status !== 'online') {
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

  const pollScanProgress = useCallback((commandId) => {
    // Simplified polling - in production, implement proper event streaming
    const interval = setInterval(() => {
      // Check scan status from backend
      // This would call a new endpoint like /api/agents/{agentId}/events
      // For now, just simulate completion after 5 seconds
    }, 1000);
    
    setTimeout(() => {
      clearInterval(interval);
      setIsScanning(false);
      onScanProgress?.({ percent: 100, status: 'complete' });
    }, 5000);
  }, [onScanProgress]);

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
    agents,
    selectedAgent,
    setSelectedAgent,
    isScanning,
    loadAgents,
    startScan,
    stopScan
  };
}