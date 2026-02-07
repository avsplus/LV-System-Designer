import { useState, useCallback } from 'react';
import { base44 } from "@/api/base44Client";

export default function useNetworkScanner(onDeviceDiscovered, onScanProgress, onError, organizationId, selectedAgent, supabaseClient) {
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
    onScanProgress?.({ percent: 0, status: 'sent' });
    
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
        onScanProgress?.({ percent: 1, status: 'scanning' });
        // Subscribe to results
        subscribeScanResults(data.command_id);
      }
    } catch (error) {
      console.error('❌ Failed to start scan:', error);
      onError?.(error.response?.data?.error || error.message || 'Failed to start scan');
      setIsScanning(false);
    }
  }, [selectedAgent, onError, onScanProgress]);

  const subscribeScanResults = useCallback(async (commandId) => {
    console.log('🔔 Subscribing to scan results:', commandId);
    
    if (!supabaseClient) {
      onError?.('Supabase client not available');
      setIsScanning(false);
      return;
    }
    
    const processResult = async (resultRow) => {
        try {
          let result = resultRow.result;
          if (typeof result === 'string') {
            result = JSON.parse(result);
          }

          const hosts = result?.hosts || [];
          console.log(`📦 Processing ${hosts.length} discovered hosts`);

          const processPromises = hosts.map(host => {
            console.log('🔍 Processing host:', host);
            if (host.mac) {
              return onDeviceDiscovered?.({
                ip_address: host.ip,
                mac_address: host.mac,
                vendor: host.vendor,
                hostname: host.hostname,
                network_id: currentNetworkId,
                device_type: host.device_type,
                open_ports: host.open_ports || []
              });
            }
            return Promise.resolve();
          });

          await Promise.all(processPromises);
          console.log('✅ All devices processed');

          onScanProgress?.({ percent: 100, status: 'finished', devicesFound: hosts.length });
          
          setTimeout(() => {
            setIsScanning(false);
          }, 2000);
        } catch (error) {
          console.error('❌ Failed to process scan result:', error);
          onError?.('Failed to process scan results');
          setIsScanning(false);
        }
      };
    
    try {
      console.log('🔍 Checking for existing results for command_id:', commandId);
      
      // Check if results already exist (race condition)
      const { data: existingResults, error: selectError } = await supabaseClient
        .from('agent_scan_results')
        .select('*')
        .eq('command_id', commandId)
        .limit(1);

      if (selectError) {
        console.error('❌ Error checking existing results:', selectError);
      }

      if (existingResults && existingResults.length > 0) {
        console.log('📥 Found existing scan result:', existingResults[0]);
        await processResult(existingResults[0]);
        return;
      }

      console.log('🔔 Setting up Realtime subscription for command_id:', commandId);
      
      const channel = supabaseClient
        .channel(`scan-results-${commandId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'agent_scan_results',
            filter: `command_id=eq.${commandId}`,
          },
          async (payload) => {
            console.log('📥 Scan result received via Realtime:', payload.new);
            clearTimeout(timeout);
            await processResult(payload.new);
            supabaseClient.removeChannel(channel);
          }
        )
        .subscribe((status, err) => {
          console.log('📡 Subscription status:', status);
          if (err) {
            console.error('❌ Subscription error:', err);
          }
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to scan results channel');
            
            // WORKAROUND: Poll database since Realtime events aren't firing
            let processed = false;
            const pollInterval = setInterval(async () => {
              if (processed) {
                clearInterval(pollInterval);
                return;
              }
              
              const { data: results } = await supabaseClient
                .from('agent_scan_results')
                .select('*')
                .eq('command_id', commandId)
                .limit(1);
              
              if (results && results.length > 0) {
                console.log('✅ Found scan results via polling (Realtime workaround):', results[0]);
                processed = true;
                clearInterval(pollInterval);
                clearTimeout(timeout);
                await processResult(results[0]);
                supabaseClient.removeChannel(channel);
              }
            }, 2000);
            
            // Clear poll interval on timeout
            setTimeout(() => clearInterval(pollInterval), 600000);
          }
        });

      // Timeout after 10 minutes
      const timeout = setTimeout(() => {
        console.warn('⏱️ Scan timeout reached (10 minutes)');
        console.log('🔍 Checking for results one more time before timeout...');
        supabaseClient
          .from('agent_scan_results')
          .select('*')
          .eq('command_id', commandId)
          .limit(1)
          .then(({ data, error }) => {
            if (error) {
              console.error('❌ Final check error:', error);
            } else if (data && data.length > 0) {
              console.log('📥 Found result on final check!');
              processResult(data[0]);
            } else {
              console.log('❌ No results found after timeout');
            }
          });
        
        supabaseClient.removeChannel(channel);
        if (isScanning) {
          setIsScanning(false);
          onError?.('Scan timeout - agent did not respond');
        }
      }, 600000);
      
    } catch (error) {
      console.error('❌ Failed to subscribe:', error);
      onError?.('Failed to subscribe to scan results');
      setIsScanning(false);
    }
  }, [onScanProgress, onDeviceDiscovered, onError, isScanning, currentNetworkId, supabaseClient]);

  const stopScan = useCallback(() => {
    setIsScanning(false);
  }, []);

  return {
    isScanning,
    startScan,
    stopScan
  };
}