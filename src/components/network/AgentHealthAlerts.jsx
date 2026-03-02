import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, XCircle, Activity } from 'lucide-react';

export default function AgentHealthAlerts({ agents }) {
  useEffect(() => {
    agents.forEach(agent => {
      const lastSeen = new Date(agent.last_seen);
      const minutesOffline = (Date.now() - lastSeen) / 1000 / 60;
      
      // Critical: Agent offline for more than 30 minutes
      if (agent.status === 'offline' && minutesOffline > 30) {
        const hours = Math.floor(minutesOffline / 60);
        const toastId = `agent-critical-${agent.id}`;
        
        if (!sessionStorage.getItem(toastId)) {
          toast.error(
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <p className="font-semibold">Agent Offline</p>
                <p className="text-sm text-gray-400">
                  {agent.name} has been offline for {hours > 0 ? `${hours} hours` : `${Math.floor(minutesOffline)} minutes`}
                </p>
              </div>
            </div>,
            {
              duration: Infinity,
              id: toastId
            }
          );
          sessionStorage.setItem(toastId, 'shown');
        }
      }

      // Warning: Agent offline for more than 10 minutes
      if (agent.status === 'offline' && minutesOffline > 10 && minutesOffline <= 30) {
        const toastId = `agent-warning-${agent.id}`;
        
        if (!sessionStorage.getItem(toastId)) {
          toast.warning(
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <p className="font-semibold">Agent Connection Lost</p>
                <p className="text-sm text-gray-400">
                  {agent.name} went offline {Math.floor(minutesOffline)} minutes ago
                </p>
              </div>
            </div>,
            {
              duration: 10000,
              id: toastId
            }
          );
          sessionStorage.setItem(toastId, 'shown');
        }
      }

      // Error state
      if (agent.status === 'error') {
        const toastId = `agent-error-${agent.id}`;
        
        if (!sessionStorage.getItem(toastId)) {
          toast.error(
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <p className="font-semibold">Agent Error</p>
                <p className="text-sm text-gray-400">
                  {agent.name}: {agent.health?.error_message || 'Unknown error'}
                </p>
              </div>
            </div>,
            {
              duration: Infinity,
              id: toastId
            }
          );
          sessionStorage.setItem(toastId, 'shown');
        }
      }

      // High resource usage warning
      const health = agent.health || {};
      if (health.cpu_percent > 90 || health.memory_percent > 90) {
        const toastId = `agent-resource-${agent.id}`;
        
        if (!sessionStorage.getItem(toastId)) {
          const resourceType = health.cpu_percent > 90 ? 'CPU' : 'Memory';
          const value = health.cpu_percent > 90 ? health.cpu_percent : health.memory_percent;
          
          toast.warning(
            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <p className="font-semibold">High Resource Usage</p>
                <p className="text-sm text-gray-400">
                  {agent.name} {resourceType} usage at {value.toFixed(1)}%
                </p>
              </div>
            </div>,
            {
              duration: 10000,
              id: toastId
            }
          );
          sessionStorage.setItem(toastId, 'shown');
        }
      }

      // Clear toast storage when agent comes back online
      if (agent.status === 'online') {
        sessionStorage.removeItem(`agent-critical-${agent.id}`);
        sessionStorage.removeItem(`agent-warning-${agent.id}`);
        sessionStorage.removeItem(`agent-error-${agent.id}`);
        sessionStorage.removeItem(`agent-resource-${agent.id}`);
      }
    });
  }, [agents]);

  return null;
}