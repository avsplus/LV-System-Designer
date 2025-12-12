import React, { useState, useCallback, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, Plus, Wifi, RefreshCw, Trash2, 
  Network as NetworkIcon, Router, Server, Shield, 
  Monitor, Printer, HardDrive, Cpu, Box, ArrowUpDown, Check, X, Edit2, Eraser
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { toast } from "sonner";
import { useOrganization } from "../components/auth/useOrganization";
import { Badge } from "@/components/ui/badge";
import NetworkStats from "../components/network/NetworkStats";
import ScanProgress from "../components/network/ScanProgress";
import useNetworkScanner from "../components/network/useNetworkScanner";
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

export default function NetworkMapping() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  

  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [showNetworkDialog, setShowNetworkDialog] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [scanProgress, setScanProgress] = useState({ percent: 0, devicesFound: 0 });
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [editingDevice, setEditingDevice] = useState(null);
  const [editName, setEditName] = useState('');
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
  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['networkDevices', organizationId],
    queryFn: () => base44.entities.Device.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  const { data: networks = [] } = useQuery({
    queryKey: ['networks', organizationId],
    queryFn: () => base44.entities.Network.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  // Mutations
  const createDeviceMutation = useMutation({
    mutationFn: (data) => base44.entities.Device.create({ ...data, organization_id: organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networkDevices'] });
      toast.success('Device added');
      setShowDeviceDialog(false);
      resetForm();
    }
  });

  const updateDeviceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Device.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networkDevices'] });
    }
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: (id) => base44.entities.Device.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networkDevices'] });
      toast.success('Device removed');
      setSelectedDevice(null);
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
  const handleDeviceDiscovered = useCallback((deviceData) => {
    const existingDevice = devices.find(d => d.mac_address === deviceData.mac_address);
    
    if (existingDevice) {
      updateDeviceMutation.mutate({
        id: existingDevice.id,
        data: { 
          status: 'online', 
          vendor: deviceData.vendor,
          ip_address: deviceData.ip_address
        }
      });
    } else {
      createDeviceMutation.mutate({
        name: deviceData.hostname || deviceData.ip_address,
        type: 'other',
        ip_address: deviceData.ip_address,
        mac_address: deviceData.mac_address,
        vendor: deviceData.vendor,
        status: 'online',
        network_id: deviceData.network_id,
        connected_to: []
      });
      setScanProgress(prev => ({ percent: prev.percent, devicesFound: prev.devicesFound + 1 }));
    }
  }, [devices, createDeviceMutation, updateDeviceMutation]);

  const handleScanProgress = useCallback((progressData) => {
    setScanProgress(prev => ({
      percent: progressData.percent || 0,
      devicesFound: prev.devicesFound
    }));
  }, []);

  const handleScanError = useCallback((errorMessage) => {
    toast.error(errorMessage);
  }, []);

  const { isConnected, isScanning, agentVersion, connect, disconnect, startScan } = 
    useNetworkScanner(handleDeviceDiscovered, handleScanProgress, handleScanError);

  const handleStartScan = useCallback(() => {
    if (!selectedNetwork) {
      toast.error('Please select a network first');
      return;
    }
    
    const network = networks.find(n => n.id === selectedNetwork);
    if (!network?.subnet) {
      toast.error('Selected network has no subnet defined');
      return;
    }
    
    setScanProgress({ percent: 0, devicesFound: 0 });
    startScan(network.subnet, network.id);
  }, [selectedNetwork, networks, startScan]);



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

  const handleDeviceNameSave = (device) => {
    if (editName && editName !== device.name) {
      updateDeviceMutation.mutate({
        id: device.id,
        data: { name: editName }
      });
    }
    setEditingDevice(null);
    setEditName('');
  };

  const handleClearAllDevices = async () => {
    if (confirm('Clear all scanned devices? This cannot be undone.')) {
      for (const device of devices) {
        await base44.entities.Device.delete(device.id);
      }
      queryClient.invalidateQueries({ queryKey: ['networkDevices'] });
      toast.success('All devices cleared');
      setSelectedDevice(null);
    }
  };

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
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <NetworkIcon className="w-6 h-6 text-cyan-400" />
              Network Mapping
            </h1>
            <p className="text-sm text-gray-400">Visualize and manage your network topology</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Agent Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
            isConnected 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-gray-800/50 border-gray-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-600'
            }`} />
            <span className={`text-sm font-medium ${
              isConnected ? 'text-green-400' : 'text-gray-500'
            }`}>
              {isConnected ? 'Agent Connected' : 'Agent Offline'}
            </span>
            {isConnected && agentVersion && (
              <span className="text-xs text-gray-400">v{agentVersion}</span>
            )}
          </div>
          
          <NetworkStats devices={devices} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-gray-900/60 backdrop-blur-sm border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowDeviceDialog(true)}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Device
          </Button>
          
          {!isConnected ? (
            <Button onClick={connect} variant="outline" className="border-gray-700">
              <Wifi className="w-4 h-4 mr-2" />
              Connect Scanner
            </Button>
          ) : (
            <>
              <Button 
                onClick={() => setShowNetworkDialog(true)}
                variant="outline"
                className="border-gray-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Network
              </Button>
              
              <Select value={selectedNetwork || ''} onValueChange={setSelectedNetwork}>
                <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder={networks.length === 0 ? "No networks" : "Select network..."} />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {networks.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No networks available</div>
                  ) : (
                    networks.map(network => (
                      <SelectItem key={network.id} value={network.id}>
                        {network.name} ({network.subnet || 'No subnet'})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              <Button 
                onClick={handleStartScan} 
                disabled={isScanning || !selectedNetwork}
                variant="outline"
                className="border-green-500 text-green-400 hover:bg-green-500/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? 'Scanning...' : 'Scan Network'}
              </Button>
            </>
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
        </div>
        

      </div>

      {/* Device Table */}
      <div className="flex-1 overflow-auto p-6">
        {devices.length === 0 ? (
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
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('location')}>
                      <div className="flex items-center gap-2">
                        Location
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
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
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              device.status === 'online' ? 'bg-green-500/20' :
                              device.status === 'warning' ? 'bg-yellow-500/20' :
                              device.status === 'maintenance' ? 'bg-blue-500/20' :
                              'bg-gray-700'
                            }`}>
                              <Icon className={`w-5 h-5 ${
                                device.status === 'online' ? 'text-green-400' :
                                device.status === 'warning' ? 'text-yellow-400' :
                                device.status === 'maintenance' ? 'text-blue-400' :
                                'text-gray-500'
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
                            {device.type.replace('_', ' ')}
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
                            'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }>
                            {device.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {device.location || '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete this device?')) {
                                deleteDeviceMutation.mutate(device.id);
                              }
                            }}
                            className="text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
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