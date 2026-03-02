import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { appClient } from "@/api/appClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, Plus, Activity, Circle, RefreshCw, Trash2, Edit2, Check, X, Key, Download, Upload, ShieldOff
} from "lucide-react";
import AgentRegistration from "../components/network/AgentRegistration";
import AgentInstallerUpload from "../components/network/AgentInstallerUpload";
import { useSupabaseAgents } from "../components/network/useSupabaseAgents";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { toast } from "sonner";
import { useOrganization } from "../components/auth/useOrganization";
import { Badge } from "@/components/ui/badge";
import AgentHealthMonitor from "../components/network/AgentHealthMonitor";
import AgentHealthAlerts from "../components/network/AgentHealthAlerts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AgentManager() {
  console.log('🚀 AgentManager component mounted');
  const { organizationId } = useOrganization();
  console.log('🔍 organizationId from hook:', organizationId);
  const location = window.location;
  const urlParams = new URLSearchParams(location.search);
  const prefilledAgentId = urlParams.get('agentId');
  
  const [showAddDialog, setShowAddDialog] = useState(!!prefilledAgentId);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showInstallerUpload, setShowInstallerUpload] = useState(false);
  const [showUnregisterDialog, setShowUnregisterDialog] = useState(false);
  const [selectedAgentForUnregister, setSelectedAgentForUnregister] = useState(null);
  const [unregisterToken, setUnregisterToken] = useState('');
  const [editingAgent, setEditingAgent] = useState(null);
  const [agentForm, setAgentForm] = useState({
    agent_id: prefilledAgentId || '',
    name: '',
    location: '',
    assigned_network_id: ''
  });

  // Get current user
  const [currentUser, setCurrentUser] = React.useState(null);
  React.useEffect(() => {
    appClient.getMe().then(({ user }) => setCurrentUser(user)).catch(() => setCurrentUser(null));
  }, []);

  // Fetch agents from Supabase with realtime updates
  const { agents, loading: isLoading, supabase, refresh } = useSupabaseAgents(organizationId);
  
  // Debug logging
  React.useEffect(() => {
    console.log('AgentManager - organizationId:', organizationId);
    console.log('AgentManager - supabase client exists:', !!supabase);
    console.log('AgentManager - agents:', agents);
    console.log('AgentManager - loading:', isLoading);
  }, [organizationId, supabase, agents, isLoading]);
  
  // Listen for agent registration events
  React.useEffect(() => {
    const handleAgentRegistered = () => {
      refresh();
    };
    window.addEventListener('agent-registered', handleAgentRegistered);
    return () => {
      window.removeEventListener('agent-registered', handleAgentRegistered);
    };
  }, [refresh]);

  // Fetch installer URL
  const { data: installerData } = useQuery({
    queryKey: ['agentInstallerUrl', organizationId],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getAgentInstallerUrl', {});
      return data;
    },
    enabled: !!organizationId
  });

  // Fetch networks for assignment
  const { data: networks = [] } = useQuery({
    queryKey: ['networks', organizationId],
    queryFn: () => base44.entities.Network.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  // Mutations for Supabase
  const updateAgentMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase
        .from('agents')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Agent updated');
      setEditingAgent(null);
    }
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Agent removed');
    }
  });

  const generateUnregisterTokenMutation = useMutation({
    mutationFn: async (agent_id) => {
      const { data } = await base44.functions.invoke('generateUnregisterToken', { agent_id });
      return data;
    },
    onSuccess: (data) => {
      setUnregisterToken(data.token);
      toast.success('Unregister code generated');
    }
  });

  const resetForm = () => {
    setAgentForm({
      agent_id: '',
      name: '',
      location: '',
      assigned_network_id: ''
    });
  };



  const handleUpdateAgent = (agent) => {
    if (!editingAgent) return;
    const { id, created_at, updated_at, ...updateData } = editingAgent;
    updateAgentMutation.mutate({
      id: agent.id,
      data: updateData
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'scanning': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'offline': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return <Activity className="w-3 h-3" />;
      case 'scanning': return <RefreshCw className="w-3 h-3 animate-spin" />;
      case 'offline': return <Circle className="w-3 h-3" />;
      default: return <Circle className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <Link to={createPageUrl("NetworkMapping")}>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white h-9 w-9">
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1 sm:flex-initial">
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
              <span className="truncate">Agent Management</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">Manage your network scanning agents</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-800/50 border border-gray-700 rounded-lg">
            <span className="text-xs sm:text-sm text-gray-400">Total:</span>
            <span className="text-base sm:text-lg font-bold text-cyan-400">{agents.length}</span>
          </div>
          {installerData?.url && (
            <a href={installerData.url} download>
              <Button variant="outline" className="border-gray-700" size="sm">
                <Download className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            </a>
          )}
          {currentUser?.role === 'admin' && (
            <Button 
              variant="outline" 
              className="border-gray-700"
              onClick={() => setShowInstallerUpload(true)}
              size="sm"
            >
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">{installerData?.url ? 'Replace' : 'Upload'}</span>
            </Button>
          )}
          <Button onClick={() => setShowRegistration(true)} className="bg-cyan-600 hover:bg-cyan-700" size="sm">
            <Key className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Register</span>
          </Button>
        </div>
      </div>

      {/* Health Alerts */}
      <AgentHealthAlerts agents={agents} />

      {/* Agents List */}
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
            <Activity className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 opacity-20" />
            <p className="text-base sm:text-lg font-medium">No agents registered</p>
            <p className="text-xs sm:text-sm text-center">Register your first scanning agent to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {agents.map(agent => {
              const assignedNetwork = networks.find(n => n.id === agent.assigned_network_id);
              const isEditing = editingAgent?.id === agent.id;
              
              return (
                <div
                  key={agent.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    {isEditing ? (
                      <Input
                        value={editingAgent.name}
                        onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    ) : (
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-bold text-white truncate">{agent.name}</h3>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-mono truncate">{agent.agent_id}</p>
                      </div>
                    )}
                    
                    <div className="flex gap-1 flex-shrink-0">
                      {isEditing ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleUpdateAgent(agent)}
                            className="h-7 w-7 sm:h-8 sm:w-8 text-green-400"
                          >
                            <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingAgent(null)}
                            className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400"
                          >
                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingAgent({ ...agent, id: agent.id })}
                            className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400 hover:text-white"
                          >
                            <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedAgentForUnregister(agent);
                              setShowUnregisterDialog(true);
                              generateUnregisterTokenMutation.mutate(agent.agent_id);
                            }}
                            className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400 hover:text-yellow-400"
                            title="Generate Unregister Code"
                          >
                            <ShieldOff className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Remove this agent from database?')) {
                                deleteAgentMutation.mutate(agent.id);
                              }
                            }}
                            className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                      <AgentHealthMonitor agent={agent} compact />

                    {agent.version && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-gray-400">Version</span>
                        <span className="text-xs sm:text-sm text-white">{agent.version}</span>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <Label className="text-gray-400">Location</Label>
                        <Input
                          value={editingAgent.location || ''}
                          onChange={(e) => setEditingAgent({ ...editingAgent, location: e.target.value })}
                          placeholder="Office, Warehouse, etc."
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                        <Label className="text-gray-400">Assigned Network</Label>
                        <Select 
                          value={editingAgent.assigned_network_id || ''} 
                          onValueChange={(v) => setEditingAgent({ ...editingAgent, assigned_network_id: v })}
                        >
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                            <SelectValue placeholder="Select network..." />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value={null}>None</SelectItem>
                            {networks.map(network => (
                              <SelectItem key={network.id} value={network.id}>
                                {network.name} ({network.subnet})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <>
                        {agent.location && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-gray-400">Location</span>
                            <span className="text-xs sm:text-sm text-white truncate ml-2">{agent.location}</span>
                          </div>
                        )}

                        {assignedNetwork && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-gray-400">Network</span>
                            <span className="text-xs sm:text-sm text-white truncate ml-2">{assignedNetwork.name}</span>
                          </div>
                        )}

                        {agent.last_seen && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-gray-400">Last Seen</span>
                            <span className="text-[10px] sm:text-sm text-white">
                              {new Date(agent.last_seen).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AgentRegistration open={showRegistration} onOpenChange={setShowRegistration} />
      <AgentInstallerUpload open={showInstallerUpload} onOpenChange={setShowInstallerUpload} />
      
      {/* Unregister Dialog */}
      <Dialog open={showUnregisterDialog} onOpenChange={setShowUnregisterDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="w-5 h-5 text-yellow-400" />
              Unregister Agent
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Agent:</p>
              <p className="font-mono text-cyan-400">{selectedAgentForUnregister?.name}</p>
              <p className="text-xs text-gray-500 font-mono">{selectedAgentForUnregister?.agent_id}</p>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-sm text-yellow-300 font-semibold mb-2">
                ⚠️ Unregister Confirmation Code
              </p>
              <div className="bg-gray-950 border border-gray-700 rounded-lg p-4 text-center">
                <p className="text-2xl font-mono font-bold text-yellow-400 tracking-wider">
                  {unregisterToken || 'Generating...'}
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Provide this code to the agent. The agent must sign the unregister request with its private key.
              </p>
              <p className="text-xs text-yellow-500 mt-2">
                Expires in 15 minutes
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400">
                <strong>Two-Factor Unregister:</strong><br/>
                1. Copy this code to the agent<br/>
                2. Agent signs: agent_id + org_id + token + timestamp<br/>
                3. Agent sends signed request to backend<br/>
                4. Backend validates signature + token → unregisters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUnregisterDialog(false);
                setUnregisterToken('');
                setSelectedAgentForUnregister(null);
              }}
              className="border-gray-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
      );
      }
