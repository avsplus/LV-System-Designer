import React, { useState, useCallback, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, Plus, Wifi, RefreshCw, Download, Trash2, 
  Settings, ZoomIn, ZoomOut, Maximize2, Network as NetworkIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { toast } from "sonner";
import { useOrganization } from "../components/auth/useOrganization";
import DeviceNode from "../components/network/DeviceNode";
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
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [scanProgress, setScanProgress] = useState({ percent: 0, devicesFound: 0 });
  const [deviceForm, setDeviceForm] = useState({
    name: '',
    type: 'other',
    ip_address: '',
    mac_address: '',
    location: '',
    notes: ''
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

  // Network scanner hooks
  const handleDeviceDiscovered = useCallback((deviceData) => {
    const existingDevice = devices.find(d => d.mac_address === deviceData.mac_address);
    
    if (existingDevice) {
      updateDeviceMutation.mutate({
        id: existingDevice.id,
        data: { status: 'online', vendor: deviceData.vendor }
      });
    } else {
      const gridSize = 150;
      const cols = Math.floor(800 / gridSize);
      const deviceCount = devices.length;
      const row = Math.floor(deviceCount / cols);
      const col = deviceCount % cols;
      
      createDeviceMutation.mutate({
        name: deviceData.hostname || deviceData.ip_address,
        type: 'other',
        ip_address: deviceData.ip_address,
        mac_address: deviceData.mac_address,
        vendor: deviceData.vendor,
        status: 'online',
        network_id: deviceData.network_id,
        position_x: 100 + col * gridSize,
        position_y: 100 + row * gridSize,
        connected_to: []
      });
      setScanProgress(prev => ({ ...prev, devicesFound: prev.devicesFound + 1 }));
    }
  }, [devices, createDeviceMutation, updateDeviceMutation]);

  const handleScanProgress = useCallback((progressData) => {
    setScanProgress({
      percent: progressData.percent || 0,
      devicesFound: scanProgress.devicesFound
    });
  }, [scanProgress.devicesFound]);

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

  // Device drag handling
  const handleDrag = useCallback((deviceId, info) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;
    
    updateDeviceMutation.mutate({
      id: deviceId,
      data: {
        position_x: device.position_x + info.delta.x / zoom,
        position_y: device.position_y + info.delta.y / zoom
      }
    });
  }, [devices, zoom, updateDeviceMutation]);

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setZoom(1);

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
              <Select value={selectedNetwork || ''} onValueChange={setSelectedNetwork}>
                <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select network..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {networks.map(network => (
                    <SelectItem key={network.id} value={network.id}>
                      {network.name} ({network.subnet || 'No subnet'})
                    </SelectItem>
                  ))}
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
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1">
            <Button size="icon" variant="ghost" onClick={handleZoomOut} className="h-7 w-7">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-400 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button size="icon" variant="ghost" onClick={handleZoomIn} className="h-7 w-7">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleZoomReset} className="h-7 w-7">
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        onClick={() => setSelectedDevice(null)}
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(6, 182, 212, 0.05) 1px, transparent 1px)',
          backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top left'
          }}
          className="absolute inset-0"
        >
          <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
            {devices.map(device => 
              device.connected_to?.map(targetId => {
                const target = devices.find(d => d.id === targetId);
                if (!target) return null;
                
                return (
                  <line
                    key={`${device.id}-${targetId}`}
                    x1={device.position_x + 40}
                    y1={device.position_y + 40}
                    x2={target.position_x + 40}
                    y2={target.position_y + 40}
                    stroke="rgba(6, 182, 212, 0.3)"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                );
              })
            )}
          </svg>
          
          {devices.map(device => (
            <DeviceNode
              key={device.id}
              device={device}
              onDrag={handleDrag}
              onClick={setSelectedDevice}
              isSelected={selectedDevice?.id === device.id}
            />
          ))}
        </div>
        
        {devices.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <NetworkIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">No devices yet</p>
              <p className="text-gray-500 text-sm">Add devices manually or scan your network</p>
            </div>
          </div>
        )}
      </div>

      <ScanProgress 
        progress={scanProgress.percent} 
        devicesFound={scanProgress.devicesFound} 
        isScanning={isScanning} 
      />

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