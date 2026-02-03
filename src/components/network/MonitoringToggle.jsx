import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

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
          toast.success(`Monitoring enabled - ${data.devices_pinged || 0} devices pinged`);
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

  return (
    <Switch
      checked={agent.monitoring_enabled || false}
      onCheckedChange={handleToggle}
      disabled={isLoading}
      className={agent.monitoring_enabled ? '[&_span]:bg-blue-500' : '[&_span]:bg-gray-600'}
    />
  );
}