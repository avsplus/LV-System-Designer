import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, Plus, Activity, Circle, RefreshCw, Trash2, Edit2, Check, X, Key
} from "lucide-react";
import AgentRegistration from "../components/network/AgentRegistration";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { toast } from "sonner";
import { useOrganization } from "../components/auth/useOrganization";
import { Badge } from "@/components/ui/badge";
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
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const location = window.location;
  const urlParams = new URLSearchParams(location.search);
  const prefilledAgentId = urlParams.get('agentId');
  
  const [showAddDialog, setShowAddDialog] = useState(!!prefilledAgentId);
  const [showRegistration, setShowRegistration] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [agentForm, setAgentForm] = useState({
    agent_id: prefilledAgentId || '',
    name: '',
    location: '',
    assigned_network_id: ''
  });

  // Fetch agents
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents', organizationId],
    queryFn: () => base44.entities.Agent.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  // Fetch networks for assignment
  const { data: networks = [] } = useQuery({
    queryKey: ['networks', organizationId],
    queryFn: () => base44.entities.Network.filter({ organization_id: organizationId }),
    enabled: !!organizationId
  });

  // Mutations
  const createAgentMutation = useMutation({
    mutationFn: (data) => base44.entities.Agent.create({ ...data, organization_id: organizationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agent registered');
      setShowAddDialog(false);
      resetForm();
    }
  });

  const updateAgentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Agent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agent updated');
      setEditingAgent(null);
    }
  });

  const deleteAgentMutation = useMutation({
    mutationFn: (id) => base44.entities.Agent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agent removed');
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

  const handleAddAgent = () => {
    if (!agentForm.agent_id || !agentForm.name) {
      toast.error('Agent ID and name are required');
      return;
    }
    createAgentMutation.mutate({
      ...agentForm,
      status: 'offline',
      version: 'unknown'
    });
  };

  const handleUpdateAgent = (agent) => {
    if (!editingAgent) return;
    updateAgentMutation.mutate({
      id: agent.id,
      data: editingAgent
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
      <div className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("NetworkMapping")}>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-cyan-400" />
              Agent Management
            </h1>
            <p className="text-sm text-gray-400">Manage your network scanning agents</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg">
            <span className="text-sm text-gray-400">Total Agents:</span>
            <span className="text-lg font-bold text-cyan-400">{agents.length}</span>
          </div>
          <Button onClick={() => setShowRegistration(true)} className="bg-cyan-600 hover:bg-cyan-700">
            <Key className="w-4 h-4 mr-2" />
            Register Agent
          </Button>
        </div>
      </div>

      {/* Agents List */}
      <div className="flex-1 overflow-auto p-6">
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Activity className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No agents registered</p>
            <p className="text-sm">Register your first scanning agent to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(agent => {
              const assignedNetwork = networks.find(n => n.id === agent.assigned_network_id);
              const isEditing = editingAgent?.id === agent.id;
              
              return (
                <div
                  key={agent.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    {isEditing ? (
                      <Input
                        value={editingAgent.name}
                        onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    ) : (
                      <div>
                        <h3 className="text-lg font-bold text-white">{agent.name}</h3>
                        <p className="text-xs text-gray-500 font-mono">{agent.agent_id}</p>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleUpdateAgent(agent)}
                            className="h-8 w-8 text-green-400"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingAgent(null)}
                            className="h-8 w-8 text-gray-400"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingAgent({ ...agent, id: agent.id })}
                            className="h-8 w-8 text-gray-400 hover:text-white"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Remove this agent?')) {
                                deleteAgentMutation.mutate(agent.id);
                              }
                            }}
                            className="h-8 w-8 text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Status</span>
                      <Badge className={`flex items-center gap-1 ${getStatusColor(agent.status)}`}>
                        {getStatusIcon(agent.status)}
                        {agent.status}
                      </Badge>
                    </div>

                    {agent.version && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Version</span>
                        <span className="text-sm text-white">{agent.version}</span>
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
                            <span className="text-sm text-gray-400">Location</span>
                            <span className="text-sm text-white">{agent.location}</span>
                          </div>
                        )}

                        {assignedNetwork && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Assigned Network</span>
                            <span className="text-sm text-white">{assignedNetwork.name}</span>
                          </div>
                        )}

                        {agent.last_seen && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Last Seen</span>
                            <span className="text-sm text-white">
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

      {/* Add Agent Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Register Network Agent</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Agent ID</Label>
              <Input
                value={agentForm.agent_id}
                onChange={(e) => setAgentForm({ ...agentForm, agent_id: e.target.value })}
                placeholder="unique-agent-id"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Unique identifier for this agent</p>
            </div>
            
            <div>
              <Label className="text-gray-300">Agent Name</Label>
              <Input
                value={agentForm.name}
                onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                placeholder="Main Office Scanner"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div>
              <Label className="text-gray-300">Location</Label>
              <Input
                value={agentForm.location}
                onChange={(e) => setAgentForm({ ...agentForm, location: e.target.value })}
                placeholder="Office, Warehouse, etc."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div>
              <Label className="text-gray-300">Assigned Network (Optional)</Label>
              <Select 
                value={agentForm.assigned_network_id} 
                onValueChange={(v) => setAgentForm({ ...agentForm, assigned_network_id: v })}
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
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="border-gray-700">
              Cancel
            </Button>
            <Button onClick={handleAddAgent} className="bg-cyan-600 hover:bg-cyan-700">
              Register Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AgentRegistration open={showRegistration} onOpenChange={setShowRegistration} />
    </div>
  );
}