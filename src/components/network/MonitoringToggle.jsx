import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Monitor } from "lucide-react";

export default function MonitoringToggle({ agent, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleToggle = async (newState) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const { data } = await base44.functions.invoke('toggleAgentMonitoring', {
        agent_id: agent.agent_id,
        enabled: newState
      });

      if (data.success) {
        if (newState) {
          toast.success(`Monitoring enabled - ${data.devices_updated || 0} devices pinged`);
        } else {
          toast.success('Monitoring disabled');
        }
        onSuccess?.();
      } else {
        throw new Error('Failed to toggle monitoring');
      }
    } catch (error) {
      console.error('Failed to toggle monitoring:', error);
      toast.error('Failed to toggle monitoring');
    } finally {
      setIsLoading(false);
    }
  };

  const isEnabled = agent.monitoring_enabled || false;

  return (
    <Button
      onClick={() => handleToggle(!isEnabled)}
      disabled={isLoading}
      className={`flex items-center gap-2 px-3 py-2 h-auto rounded-lg transition-all ${
        isEnabled
          ? 'bg-blue-500 hover:bg-blue-600 text-white'
          : 'bg-gray-600 hover:bg-gray-700 text-white'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Monitor className="w-4 h-4" />
      <span className="text-sm font-medium">{isLoading ? 'Updating...' : isEnabled ? 'Monitoring' : 'Monitor'}</span>
    </Button>
  );
}