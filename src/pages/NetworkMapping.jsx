import React, { useState, useCallback, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, Plus, Wifi, RefreshCw, Trash2, 
  Network as NetworkIcon, Router, Server, Shield, 
  Monitor, Printer, HardDrive, Cpu, Box, ArrowUpDown, Check, X, Edit2, Eraser, Activity, AlertTriangle, Link2, CheckCircle, XCircle, AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { toast } from "sonner";
import { useOrganization } from "../components/auth/useOrganization";
import { Badge } from "@/components/ui/badge";
import NetworkStats from "../components/network/NetworkStats";
import ScanProgress from "../components/network/ScanProgress";
import useNetworkScanner from "../components/network/useNetworkScanner";
import { useSupabaseAgents } from "../components/network/useSupabaseAgents";
import { useSupabaseDevices } from "../components/network/useSupabaseDevices";
import AgentHealthMonitor from "../components/network/AgentHealthMonitor";
import AgentHealthAlerts from "../components/network/AgentHealthAlerts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MonitoringToggle from "../components/network/MonitoringToggle";

export default function NetworkMapping() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [lastSeenCache, setLastSeenCache] = useState({});

  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [showNetworkDialog, setShowNetworkDialog] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [scanProgress, setScanProgress] = useState({ percent: 0, devicesFound: 0, status: 'sent' });
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [editingDevice, setEditingDevice] = useState(null);
  const [editName, setEditName] = useState('');
  const discoveredInCurrentScan = useRef(new Set());
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const [isPinging, setIsPinging] = useState(false);
  const [pingResults, setPingResults] = useState([]);
  const [deviceForm, setDeviceForm] = useState({
    name: '',
    type: 'other',
    ip_address: '',
    mac_address: '',
    location: '',
    notes: ''
  });
  const [networkForm, setNetworkForm] = useState({
    name: '',
    description: '',
    subnet: '',
    location: ''
  });

  // Fetch devices and networks
  // Use Supabase Realtime for auto-updates instead of polling
  const { devices = [], isLoading } = useSupabaseDevices(organizationId, selectedAgent?.agent_id, supabaseClient);

  const { data: networks = [] } = useQuery({
    queryKey: ['networks', organizationId],
    queryFn: () => base44.entities.Network.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: nameMappings = [] } = useQuery({
    queryKey: ['deviceNameMappings', organizationId],
    queryFn: () => base44.entities.DeviceNameMapping.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  // Mutations using Supabase
  const createDeviceMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabaseClient
        .from('devices')
        .insert({ 
          ...data, 
          organization_id: organizationId,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      setShowDeviceDialog(false);
      resetForm();
      toast.success('Device added');
    }
  });

  const updateDeviceMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: result, error } = await supabaseClient
        .from('devices')
        .update({ ...data, updated_date: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    }
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabaseClient
        .from('devices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Device removed');
      setSelectedDevice(null);
    },
    onError: () => {
      toast.error('Failed to delete device');
    }
  });

  const createNetworkMutation = useMutation({
    mutationFn: (data) => base44.entities.Network.create({ ...data, organization_id: organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networks'] });
      toast.success('Network created');
      setShowNetworkDialog(false);
      setNetworkForm({ name: '', description: '', subnet: '', location: '' });
    }
  });

  // Network scanner hooks
  const handleDeviceDiscovered = useCallback(async (deviceData) => {
    // Flexible data extraction - don't assume structure
    if (!deviceData) return;
    
    // Normalize MAC address for consistent matching
    const normalizedMac = deviceData.mac_address?.toLowerCase().replace(/[:-]/g, '');
    if (!normalizedMac) return;
    
    // Skip if already processed in this scan session
    if (discoveredInCurrentScan.current.has(normalizedMac)) {
      return;
    }
    
    // Mark as discovered immediately to prevent race conditions
    discoveredInCurrentScan.current.add(normalizedMac);
    
    try {
      // Query Supabase directly for most up-to-date data
      const { data: allDevices } = await supabaseClient
        .from('devices')
        .select('*')
        .eq('organization_id', organizationId);

      const existingDevice = allDevices?.find(d => {
        const deviceMac = d.mac_address?.toLowerCase().replace(/[:-]/g, '');
        return deviceMac === normalizedMac;
      });
      
      const nameMapping = nameMappings.find(m => {
        const mappingMac = m.mac_address?.toLowerCase().replace(/[:-]/g, '');
        return mappingMac === normalizedMac;
      });
      
      if (existingDevice) {
        // Update existing device - restore custom name if it exists
        const updateData = { 
          status: 'online', 
          vendor: deviceData.vendor,
          ip_address: deviceData.ip_address,
          device_type: deviceData.device_type,
          open_ports: deviceData.open_ports || [],
          agent_id: selectedAgent?.agent_id
        };
        
        // Always restore custom name if mapping exists
        if (nameMapping?.custom_name) {
          updateData.name = nameMapping.custom_name;
        }
        
        await updateDeviceMutation.mutateAsync({
          id: existingDevice.id,
          data: updateData
        });
      } else {
        // Check for stored custom name
        const deviceName = nameMapping?.custom_name || deviceData.hostname || deviceData.ip_address;
        
        // Create new device
        await createDeviceMutation.mutateAsync({
          name: deviceName,
          type: 'other',
          device_type: deviceData.device_type,
          ip_address: deviceData.ip_address,
          mac_address: deviceData.mac_address,
          vendor: deviceData.vendor,
          status: 'online',
          network_id: deviceData.network_id,
          agent_id: selectedAgent?.agent_id,
          connected_to: [],
          open_ports: deviceData.open_ports || [],
          created_by: (await base44.auth.me())?.email
        });
        }
    } catch (error) {
      console.error('Error processing device:', error);
      // Remove from discovered set on error so it can be retried
      discoveredInCurrentScan.current.delete(normalizedMac);
    }
  }, [organizationId, nameMappings, createDeviceMutation, updateDeviceMutation]);

  const handleScanProgress = useCallback((progressData) => {
    // Flexible handling - extract what exists
    const percent = progressData?.percent ?? progressData?.progress ?? 0;
    const status = progressData?.status || 'scanning';
    const devicesFound = progressData?.devicesFound;

    setScanProgress(prev => ({
      percent,
      status,
      devicesFound: devicesFound !== undefined ? devicesFound : prev.devicesFound
    }));
  }, []);

  const handleScanError = useCallback((errorMessage) => {
    toast.error(errorMessage);
  }, []);

  const { agents, supabase: supabaseClient, refresh: refreshAgents } = useSupabaseAgents(organizationId);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const { isScanning, startScan, stopScan } = 
    useNetworkScanner(handleDeviceDiscovered, handleScanProgress, handleScanError, organizationId, selectedAgent);
  
  // Health monitoring
  const [showHealthPanel, setShowHealthPanel] = useState(false);





  const resetForm = () => {
    setDeviceForm({
      name: '',
      type: 'other',
      ip_address: '',
      mac_address: '',
      location: '',
      notes: ''
    });
  };

  const handleAddDevice = () => {
    if (!deviceForm.name) {
      toast.error('Device name is required');
      return;
    }
    
    const gridSize = 150;
    const cols = Math.floor(800 / gridSize);
    const deviceCount = devices.length;
    const row = Math.floor(deviceCount / cols);
    const col = deviceCount % cols;
    
    createDeviceMutation.mutate({
      ...deviceForm,
      position_x: 100 + col * gridSize,
      position_y: 100 + row * gridSize,
      status: 'offline',
      connected_to: []
    });
    
    toast.success('Device added');
  };

  const handleAddNetwork = () => {
    if (!networkForm.name || !networkForm.subnet) {
      toast.error('Network name and subnet are required');
      return;
    }
    createNetworkMutation.mutate(networkForm);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDeviceNameEdit = (device) => {
    setEditingDevice(device.id);
    setEditName(device.name);
  };

  const handleDeviceNameSave = async (device) => {
    if (editName && editName !== device.name && device.mac_address) {
      try {
        // Normalize MAC address
        const normalizedMac = device.mac_address.toLowerCase().replace(/[:-]/g, '');
        
        // Store/update name mapping first
        const existingMapping = nameMappings.find(m => {
          const mappingMac = m.mac_address?.toLowerCase().replace(/[:-]/g, '');
          return mappingMac === normalizedMac;
        });
        
        if (existingMapping) {
          await base44.entities.DeviceNameMapping.update(existingMapping.id, { custom_name: editName });
          } else {
          await base44.entities.DeviceNameMapping.create({
            organization_id: organizationId,
            mac_address: device.mac_address,
            custom_name: editName
          });
          }

          // Then update device in Supabase
          await updateDeviceMutation.mutateAsync({
          id: device.id,
          data: { name: editName }
          });
        
        // Refresh both queries
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['deviceNameMappings'] }),
          queryClient.invalidateQueries({ queryKey: ['networkDevices'] })
        ]);
        
        toast.success('Device name saved');
      } catch (error) {
        toast.error('Failed to save device name');
        console.error('Name save error:', error);
      }
    }
    setEditingDevice(null);
    setEditName('');
  };

  const handleClearAllDevices = async () => {
    if (confirm('Clear all scanned devices? This cannot be undone.')) {
      try {
        const { error } = await supabaseClient
          .from('devices')
          .delete()
          .eq('organization_id', organizationId);

        if (error) throw error;
        toast.success('All devices cleared');
        setSelectedDevice(null);
      } catch (error) {
        toast.error('Failed to clear devices');
      }
    }
  };

  const handlePingDevices = async () => {
    if (selectedDevices.size === 0) {
      toast.error('No devices selected for ping');
      return;
    }

    if (!selectedAgent) {
      toast.error('No agent selected');
      return;
    }

    setIsPinging(true);
    setPingResults([]);

    try {
      const targets = Array.from(selectedDevices)
        .map(deviceId => devices.find(d => d.id === deviceId))
        .filter(d => d?.ip_address)
        .map(d => d.ip_address);

      if (targets.length === 0) {
        toast.error('Selected devices have no IP addresses');
        setIsPinging(false);
        return;
      }

      const { data } = await base44.functions.invoke('sendAgentCommand', {
        agent_id: selectedAgent.agent_id,
        command_type: 'ping_devices',
        parameters: {
          targets,
          timeoutMs: 1000,
          count: 3,
          maxConcurrency: 16
        }
      });

      if (data.command_id) {
        toast.success(`Pinging ${targets.length} devices...`);
        subscribePingResults(data.command_id);
      } else {
        throw new Error('Failed to send ping command');
      }
    } catch (error) {
      toast.error('Failed to ping devices: ' + error.message);
      setIsPinging(false);
    }
  };

  const subscribePingResults = async (commandId) => {
    try {
      console.log('🔔 Subscribing to ping results:', commandId);

      const channel = supabaseClient
        .channel(`ping-results-${commandId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'agent_ping_results',
            filter: `command_id=eq.${commandId}`,
          },
          async (payload) => {
            console.log('📥 Ping result received:', payload.new);
            
            try {
              let result = payload.new.result;
              if (typeof result === 'string') {
                result = JSON.parse(result);
              }

              const targets = result?.targets || [];
              console.log('📦 Processing ping results for', targets.length, 'targets');
              
              if (!Array.isArray(targets) || targets.length === 0) {
                toast.error('No ping results returned');
                setIsPinging(false);
                supabaseClient.removeChannel(channel);
                return;
              }

              setPingResults(targets);
              
              const online = targets.filter(r => r.reachable).length;
              toast.success(`Ping complete: ${online}/${targets.length} devices online`);
              
              // Update device statuses in Supabase
              const updatePromises = targets.map(target => {
                const device = devices.find(d => d.ip_address === target.ip);
                if (device) {
                  return supabaseClient
                    .from('devices')
                    .update({ 
                      status: target.reachable ? 'online' : 'offline',
                      updated_date: new Date().toISOString()
                    })
                    .eq('id', device.id);
                }
                return Promise.resolve();
              });

              await Promise.all(updatePromises);
              
              setIsPinging(false);
              supabaseClient.removeChannel(channel);
            } catch (error) {
              console.error('Failed to process ping result:', error);
              toast.error('Failed to process ping results');
              setIsPinging(false);
              supabaseClient.removeChannel(channel);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Ping subscription status:', status);
        });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (isPinging) {
          supabaseClient.removeChannel(channel);
          setIsPinging(false);
          toast.error('Ping timeout - no response from agent');
        }
      }, 30000);
    } catch (error) {
      console.error('Failed to subscribe to ping results:', error);
      toast.error('Failed to start ping monitoring');
      setIsPinging(false);
    }
  };

  const handleRemoveDuplicates = async () => {
    // Group devices by normalized MAC address
    const macGroups = {};
    devices.forEach(device => {
      if (!device.mac_address) return;
      const normalizedMac = device.mac_address.toLowerCase().replace(/[:-]/g, '');
      if (!macGroups[normalizedMac]) {
        macGroups[normalizedMac] = [];
      }
      macGroups[normalizedMac].push(device);
    });

    // Find duplicates (groups with more than one device)
    const duplicates = Object.values(macGroups).filter(group => group.length > 1);
    
    if (duplicates.length === 0) {
      toast.info('No duplicates found');
      return;
    }

    const totalDuplicates = duplicates.reduce((sum, group) => sum + (group.length - 1), 0);
    
    if (!confirm(`Found ${totalDuplicates} duplicate devices. Keep the most recently updated version and remove the rest?`)) {
      return;
    }

    try {
      const deletePromises = [];
      
      // For each duplicate group, keep the most recent and delete the rest
      duplicates.forEach(group => {
        // Sort by updated_date descending
        group.sort((a, b) => new Date(b.updated_date || 0) - new Date(a.updated_date || 0));

        // Delete all except the first (most recent)
        for (let i = 1; i < group.length; i++) {
          deletePromises.push(
            supabaseClient
              .from('devices')
              .delete()
              .eq('id', group[i].id)
              .then(() => null)
              .catch(() => null)
          );
        }
      });

      await Promise.all(deletePromises);
      toast.success(`Removed ${totalDuplicates} duplicate devices`);
      setSelectedDevice(null);
    } catch (error) {
      toast.error('Failed to remove some duplicates');
    }
  };

  useEffect(() => {
    // Track when agents change status to reset their timer
    agents.forEach(agent => {
      const isOnline = agent.status === 'online' || agent.status === 'registered';
      if (lastSeenCache[agent.id] !== isOnline) {
        setLastSeenCache(prev => ({
          ...prev,
          [agent.id]: isOnline
        }));
      }
    });
  }, [agents]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const sortedDevices = [...devices].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';
    
    if (sortField === 'ip_address') {
      const aOctets = aVal.split('.').map(n => parseInt(n) || 0);
      const bOctets = bVal.split('.').map(n => parseInt(n) || 0);
      for (let i = 0; i < 4; i++) {
        if (aOctets[i] !== bOctets[i]) {
          return sortDirection === 'asc' ? aOctets[i] - bOctets[i] : bOctets[i] - aOctets[i];
        }
      }
      return 0;
    }
    
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("AVCanvas")}>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/654057aa4_AVSystemDesign-NetAgentIcon.png" 
              alt="OrionTrace" 
              className="w-12 h-12"
            />
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                OrionTrace
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Coming Soon</Badge>
              </h1>
              <p className="text-sm text-gray-400">Network Agent</p>
              <p className="text-xs text-gray-500">Visualize and manage your network topology</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("AgentManager")}>
            <Button variant="outline" className="border-gray-700">
              <Activity className="w-4 h-4 mr-2" />
              Manage Agents
            </Button>
          </Link>
          <Button
            variant="outline"
            className="border-gray-700"
            onClick={async () => {
              try {
                const org = await base44.entities.Organization.filter({ id: organizationId });
                const installerUrl = org?.[0]?.agent_installer_url;
                if (installerUrl) {
                  window.open(installerUrl, '_blank');
                } else {
                  toast.error('No agent installer available. Please upload one in Agent Manager.');
                }
              } catch (error) {
                toast.error('Failed to get installer URL');
              }
            }}
          >
            <Activity className="w-4 h-4 mr-2" />
            Download Agent
          </Button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-500/10 border-y border-yellow-500/30 px-6 py-3">
        <div className="flex items-center gap-3 text-yellow-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Tool Under Active Development</p>
            <p className="text-xs text-yellow-400/80">This feature is currently being developed and may not work as intended. Some features may be incomplete or unstable.</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-gray-900/60 backdrop-blur-sm border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedAgent && (
            <>
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className={`w-2 h-2 rounded-full ${
                  selectedAgent.status === 'online' || selectedAgent.status === 'registered' ? 'bg-green-400 animate-pulse' : 
                  selectedAgent.status === 'scanning' ? 'bg-blue-400 animate-pulse' :
                  selectedAgent.status === 'error' ? 'bg-red-400 animate-pulse' :
                  'bg-red-400'
                }`} />
                <div>
                  <p className="text-sm font-medium text-white">{selectedAgent.name}</p>
                  <p className="text-xs text-gray-400">{selectedAgent.status}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setSelectedAgent(null)}
                className="border-gray-700"
              >
                Change Agent
              </Button>
            </>
          )}
          <div className="flex gap-2">
            {selectedAgent && (
              <>
                {isScanning ? (
                <Button 
                  onClick={stopScan} 
                  variant="outline"
                  className="border-red-500 text-red-400 hover:bg-red-500/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Stop Scan
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    discoveredInCurrentScan.current.clear();
                    setScanProgress({ percent: 0, devicesFound: 0 });
                    startScan('', '');
                  }} 
                  variant="outline"
                  className="border-green-500 text-green-400 hover:bg-green-500/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Scan Network
                </Button>
              )}
              
              {selectedDevice && (
                <Button 
                  onClick={() => deleteDeviceMutation.mutate(selectedDevice.id)}
                  variant="outline"
                  className="border-red-500 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Device
                </Button>
              )}
              
              {selectedDevices.size > 0 && (
                <Button 
                  onClick={handlePingDevices}
                  disabled={isPinging}
                  variant="outline"
                  className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  {isPinging ? 'Pinging...' : `Ping Selected (${selectedDevices.size})`}
                </Button>
              )}
              
              {devices.length > 0 && (
                <Button 
                  onClick={handleClearAllDevices}
                  variant="outline"
                  className="border-red-500 text-red-400 hover:bg-red-500/10"
                >
                  <Eraser className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
                )}
                </>
                )}
                </div>
                </div>
                </div>

      {/* Health Alerts */}
      <AgentHealthAlerts agents={agents} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 relative">
        {/* Health Panel Sidebar */}
        {showHealthPanel && selectedAgent && (
          <div className="absolute top-6 right-6 w-80 bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-2xl z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Agent Health</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHealthPanel(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <AgentHealthMonitor agent={selectedAgent} />
          </div>
        )}

        {!selectedAgent ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center mb-8">
              <Activity className="w-16 h-16 mx-auto mb-4 text-cyan-400/50" />
              <h2 className="text-2xl font-bold text-white mb-2">Select an Agent</h2>
              <p className="text-gray-400">Choose an agent to start scanning and mapping your network</p>
            </div>
            
            {agents.length === 0 ? (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-400 mb-4">No agents registered yet</p>
                <Link to={createPageUrl("AgentManager")}>
                  <Button className="bg-cyan-600 hover:bg-cyan-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Register Your First Agent
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl">
                {agents.map(agent => {
                  // Filter devices for this specific agent (by agent_id and organization_id)
                  const agentDevices = devices.filter(d => 
                    d.agent_id === agent.agent_id && d.organization_id === agent.organization_id
                  );
                  
                  const agentStats = {
                    total: agentDevices.length,
                    online: agentDevices.filter(d => d.status === 'online').length,
                    offline: agentDevices.filter(d => d.status === 'offline').length,
                    warning: agentDevices.filter(d => d.status === 'warning').length
                  };
                  
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent)}
                      className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-cyan-500/50 hover:bg-gray-800/50 transition-all text-left shadow-lg shadow-black/50 hover:shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{agent.name}</h3>
                        <p className="text-xs text-gray-500 font-mono">{agent.agent_id}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        agent.status === 'online' || agent.status === 'registered' ? 'bg-green-400 animate-pulse' : 
                        agent.status === 'scanning' ? 'bg-blue-400 animate-pulse' :
                        agent.status === 'error' ? 'bg-red-400 animate-pulse' :
                        'bg-red-400'
                      }`} />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Status</span>
                          <Badge className={
                            agent.status === 'online' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            agent.status === 'scanning' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            agent.status === 'error' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }>
                            {agent.status}
                          </Badge>
                          {agent.last_seen && (() => {
                            const timeDiff = currentTime - new Date(agent.last_seen).getTime();
                            const seconds = Math.floor(timeDiff / 1000);
                            const minutes = Math.floor(seconds / 60);
                            const hours = Math.floor(minutes / 60);
                            const days = Math.floor(hours / 24);

                            const isOnline = agent.status === 'online' || agent.status === 'registered';
                            const timeText = days > 0 ? `${days}d ${hours % 24}h` :
                                            hours > 0 ? `${hours}h ${minutes % 60}m` :
                                            minutes > 0 ? `${minutes}m ${seconds % 60}s` :
                                            `${seconds}s`;

                            return (
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] text-gray-500 mb-0.5">Last Seen</span>
                                <span className={`text-[10px] font-medium ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                                  {timeText}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                        </div>

                        {/* Divider between Status and Location */}
                        <div className="my-4 border-t border-gray-800" />

                        <div className="space-y-2">
                        {agent.version && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Version</span>
                            <span className="text-sm text-white">{agent.version}</span>
                          </div>
                        )}
                        
                        {agent.location && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Location</span>
                            <span className="text-sm text-white">{agent.location}</span>
                          </div>
                        )}
                        
                        {agent.last_seen && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Last Seen</span>
                            <span className="text-xs text-gray-500">
                              {new Date(agent.last_seen).toLocaleString()}
                            </span>
                          </div>
                        )}
                        
                        {/* Health indicators */}
                        {agent.health?.cpu_percent !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">CPU</span>
                            <span className={`text-sm font-medium ${
                              agent.health.cpu_percent > 90 ? 'text-red-400' :
                              agent.health.cpu_percent > 70 ? 'text-yellow-400' :
                              'text-green-400'
                            }`}>
                              {agent.health.cpu_percent.toFixed(0)}%
                            </span>
                          </div>
                        )}
                        
                        {agent.health?.memory_percent !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Memory</span>
                            <span className={`text-sm font-medium ${
                              agent.health.memory_percent > 90 ? 'text-red-400' :
                              agent.health.memory_percent > 70 ? 'text-yellow-400' :
                              'text-green-400'
                            }`}>
                              {agent.health.memory_percent.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Device Stats at bottom */}
                      <div className="mt-4 pt-4 border-t border-gray-800">
                        <div className="flex items-center justify-between mb-3">
                          <div className="grid grid-cols-2 gap-2 text-xs flex-1">
                            <div className="flex items-center gap-1">
                              <Activity className="w-3 h-3 text-cyan-400" />
                              <span className="text-gray-400">Total:</span>
                              <span className="text-cyan-400 font-bold">{agentStats.total}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-400" />
                              <span className="text-gray-400">Online:</span>
                              <span className="text-green-400 font-bold">{agentStats.online}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-red-400" />
                              <span className="text-gray-400">Offline:</span>
                              <span className="text-red-400 font-bold">{agentStats.offline}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-yellow-400" />
                              <span className="text-gray-400">Warning:</span>
                              <span className="text-yellow-400 font-bold">{agentStats.warning}</span>
                            </div>
                          </div>

                          {/* Monitor Toggle */}
                          <div 
                            className="ml-3 pl-3 border-l border-gray-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MonitoringToggle 
                              agent={agent}
                              onSuccess={() => {
                                refreshAgents();
                                queryClient.invalidateQueries({ queryKey: ['networkDevices'] });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <NetworkIcon className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No devices yet</p>
            <p className="text-sm">Add devices manually or scan a network</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50 border-b border-gray-800">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedDevices.size === devices.length && devices.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDevices(new Set(devices.map(d => d.id)));
                          } else {
                            setSelectedDevices(new Set());
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-cyan-600"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-2">
                        Device
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('type')}>
                      <div className="flex items-center gap-2">
                        Type
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('ip_address')}>
                      <div className="flex items-center gap-2">
                        IP Address
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('mac_address')}>
                      <div className="flex items-center gap-2">
                        MAC Address
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-2">
                        Status
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Ports
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {sortedDevices.map(device => {
                    const icons = {
                      router: Router,
                      switch: NetworkIcon,
                      server: Server,
                      firewall: Shield,
                      access_point: Wifi,
                      workstation: Monitor,
                      printer: Printer,
                      nas: HardDrive,
                      iot: Cpu
                    };
                    const Icon = icons[device.type] || Box;
                    
                    return (
                      <tr 
                        key={device.id} 
                        className="hover:bg-gray-800/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedDevice(device)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedDevices.has(device.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedDevices);
                              if (e.target.checked) {
                                newSelected.add(device.id);
                              } else {
                                newSelected.delete(device.id);
                              }
                              setSelectedDevices(newSelected);
                            }}
                            className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-cyan-600"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              device.status === 'online' ? 'bg-green-500/20' :
                              device.status === 'warning' ? 'bg-yellow-500/20' :
                              device.status === 'maintenance' ? 'bg-blue-500/20' :
                              'bg-red-900/30'
                            }`}>
                              <Icon className={`w-5 h-5 ${
                                device.status === 'online' ? 'text-green-400' :
                                device.status === 'warning' ? 'text-yellow-400' :
                                device.status === 'maintenance' ? 'text-blue-400' :
                                'text-red-400'
                              }`} />
                            </div>
                            <div className="flex-1">
                              {editingDevice === device.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleDeviceNameSave(device);
                                      if (e.key === 'Escape') setEditingDevice(null);
                                    }}
                                    className="h-8 bg-gray-800 border-gray-700 text-white"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-green-400"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeviceNameSave(device);
                                    }}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-gray-400"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingDevice(null);
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 group">
                                  <p className="text-white font-medium">{device.name}</p>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeviceNameEdit(device);
                                    }}
                                  >
                                    <Edit2 className="w-3 h-3 text-gray-400" />
                                  </Button>
                                </div>
                              )}
                              {device.vendor && (
                                <p className="text-xs text-gray-500">{device.vendor}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-gray-700 text-gray-300 border-gray-600">
                            {device.device_type || device.type?.replace('_', ' ') || 'other'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-300 font-mono text-sm">
                          {device.ip_address || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                          {device.mac_address || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={
                            device.status === 'online' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            device.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                            device.status === 'maintenance' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            'bg-red-900/30 text-red-400 border-red-900/50'
                          }>
                            {device.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {device.open_ports ? (
                            <div className="flex flex-wrap gap-1">
                              {device.open_ports.slice(0, 3).map((port, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs border-gray-700 text-gray-400">
                                  {port}
                                </Badge>
                              ))}
                              {device.open_ports.length > 3 && (
                                <Badge variant="outline" className="text-xs border-gray-700 text-gray-500">
                                  +{device.open_ports.length - 3}
                                </Badge>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.info('Link device to floorplan - coming soon');
                            }}
                            className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
                          >
                            <Link2 className="w-4 h-4 mr-2" />
                            Link
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ScanProgress 
        progress={scanProgress.percent} 
        devicesFound={scanProgress.devicesFound} 
        isScanning={isScanning}
        onStop={stopScan}
        scanState={scanProgress.status}
      />

      {/* Add Network Dialog */}
      <Dialog open={showNetworkDialog} onOpenChange={setShowNetworkDialog}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Create Network</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Network Name</Label>
              <Input
                value={networkForm.name}
                onChange={(e) => setNetworkForm({ ...networkForm, name: e.target.value })}
                placeholder="Office Network, Guest WiFi, etc."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div>
              <Label className="text-gray-300">Subnet (CIDR)</Label>
              <Input
                value={networkForm.subnet}
                onChange={(e) => setNetworkForm({ ...networkForm, subnet: e.target.value })}
                placeholder="192.168.1.0/24"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div>
              <Label className="text-gray-300">Location</Label>
              <Input
                value={networkForm.location}
                onChange={(e) => setNetworkForm({ ...networkForm, location: e.target.value })}
                placeholder="Main Office, Building A, etc."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div>
              <Label className="text-gray-300">Description</Label>
              <Textarea
                value={networkForm.description}
                onChange={(e) => setNetworkForm({ ...networkForm, description: e.target.value })}
                placeholder="Network description..."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNetworkDialog(false)} className="border-gray-700">
              Cancel
            </Button>
            <Button onClick={handleAddNetwork} className="bg-cyan-600 hover:bg-cyan-700">
              Create Network
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Device Dialog */}
      <Dialog open={showDeviceDialog} onOpenChange={setShowDeviceDialog}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Add Network Device</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Device Name</Label>
              <Input
                value={deviceForm.name}
                onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                placeholder="Router, Server, etc."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div>
              <Label className="text-gray-300">Device Type</Label>
              <Select value={deviceForm.type} onValueChange={(v) => setDeviceForm({ ...deviceForm, type: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="router">Router</SelectItem>
                  <SelectItem value="switch">Switch</SelectItem>
                  <SelectItem value="server">Server</SelectItem>
                  <SelectItem value="firewall">Firewall</SelectItem>
                  <SelectItem value="access_point">Access Point</SelectItem>
                  <SelectItem value="workstation">Workstation</SelectItem>
                  <SelectItem value="printer">Printer</SelectItem>
                  <SelectItem value="nas">NAS</SelectItem>
                  <SelectItem value="iot">IoT Device</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">IP Address</Label>
                <Input
                  value={deviceForm.ip_address}
                  onChange={(e) => setDeviceForm({ ...deviceForm, ip_address: e.target.value })}
                  placeholder="192.168.1.1"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">MAC Address</Label>
                <Input
                  value={deviceForm.mac_address}
                  onChange={(e) => setDeviceForm({ ...deviceForm, mac_address: e.target.value })}
                  placeholder="00:00:00:00:00:00"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-gray-300">Location</Label>
              <Input
                value={deviceForm.location}
                onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })}
                placeholder="Server Room, Office, etc."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div>
              <Label className="text-gray-300">Notes</Label>
              <Textarea
                value={deviceForm.notes}
                onChange={(e) => setDeviceForm({ ...deviceForm, notes: e.target.value })}
                placeholder="Additional notes..."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeviceDialog(false)} className="border-gray-700">
              Cancel
            </Button>
            <Button onClick={handleAddDevice} className="bg-cyan-600 hover:bg-cyan-700">
              Add Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}