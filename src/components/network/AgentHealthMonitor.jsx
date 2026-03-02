import React from 'react';
import { Badge } from "@/components/ui/badge";
import { 
  Activity, AlertTriangle, CheckCircle, XCircle, 
  Cpu, HardDrive, Clock, Zap
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function AgentHealthMonitor({ agent, compact = false }) {
  const getHealthStatus = () => {
    if (agent.status === 'error') return 'error';
    if (agent.status === 'offline') {
      const lastSeen = new Date(agent.last_seen);
      const minutesOffline = (Date.now() - lastSeen) / 1000 / 60;
      if (minutesOffline > 30) return 'critical';
      if (minutesOffline > 10) return 'warning';
    }
    
    const health = agent.health || {};
    if (health.cpu_percent > 90 || health.memory_percent > 90) return 'warning';
    if (agent.status === 'online' || agent.status === 'scanning' || agent.status === 'registered') return 'healthy';
    return 'unknown';
  };

  const healthStatus = getHealthStatus();

  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-500/20',
      border: 'border-green-500/30',
      label: 'Healthy'
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/30',
      label: 'Warning'
    },
    critical: {
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/20',
      border: 'border-red-500/30',
      label: 'Critical'
    },
    error: {
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/20',
      border: 'border-red-500/30',
      label: 'Error'
    },
    unknown: {
      icon: Activity,
      color: 'text-gray-400',
      bg: 'bg-gray-500/20',
      border: 'border-gray-500/30',
      label: 'Unknown'
    }
  };

  const config = statusConfig[healthStatus];
  const Icon = config.icon;
  const health = agent.health || {};

  const formatUptime = (seconds) => {
    if (!seconds) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getOfflineTime = () => {
    if (!agent.last_seen || agent.status === 'online') return null;
    const lastSeen = new Date(agent.last_seen);
    const minutesOffline = Math.floor((Date.now() - lastSeen) / 1000 / 60);
    
    if (minutesOffline < 60) return `${minutesOffline}m ago`;
    const hoursOffline = Math.floor(minutesOffline / 60);
    if (hoursOffline < 24) return `${hoursOffline}h ago`;
    const daysOffline = Math.floor(hoursOffline / 24);
    return `${daysOffline}d ago`;
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bg} ${config.border}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>
    );
  }

  const offlineTime = getOfflineTime();

  return (
    <div className="space-y-4">
      {/* Overall Health Status */}
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${config.bg} ${config.border}`}>
        <Icon className={`w-6 h-6 ${config.color}`} />
        <div className="flex-1">
          <p className={`font-semibold ${config.color}`}>{config.label}</p>
          {agent.status === 'error' && health.error_message && (
            <p className="text-sm text-red-300 mt-1">{health.error_message}</p>
          )}
          {offlineTime && (
            <p className="text-sm text-gray-400 mt-1">Last seen: {offlineTime}</p>
          )}
        </div>
        <Badge className={`${config.bg} ${config.color} ${config.border}`}>
          {agent.status}
        </Badge>
      </div>

      {/* Resource Usage */}
      {(health.cpu_percent !== undefined || health.memory_percent !== undefined) && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Resource Usage
          </h4>
          
          {health.cpu_percent !== undefined && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">CPU</span>
                </div>
                <span className={`font-medium ${
                  health.cpu_percent > 90 ? 'text-red-400' :
                  health.cpu_percent > 70 ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {health.cpu_percent.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={health.cpu_percent} 
                className="h-2 bg-gray-800"
                indicatorClassName={
                  health.cpu_percent > 90 ? 'bg-red-500' :
                  health.cpu_percent > 70 ? 'bg-yellow-500' :
                  'bg-green-500'
                }
              />
            </div>
          )}

          {health.memory_percent !== undefined && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Memory</span>
                </div>
                <span className={`font-medium ${
                  health.memory_percent > 90 ? 'text-red-400' :
                  health.memory_percent > 70 ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {health.memory_percent.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={health.memory_percent} 
                className="h-2 bg-gray-800"
                indicatorClassName={
                  health.memory_percent > 90 ? 'bg-red-500' :
                  health.memory_percent > 70 ? 'bg-yellow-500' :
                  'bg-green-500'
                }
              />
            </div>
          )}

          {health.disk_percent !== undefined && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Disk</span>
                </div>
                <span className={`font-medium ${
                  health.disk_percent > 90 ? 'text-red-400' :
                  health.disk_percent > 70 ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {health.disk_percent.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={health.disk_percent} 
                className="h-2 bg-gray-800"
                indicatorClassName={
                  health.disk_percent > 90 ? 'bg-red-500' :
                  health.disk_percent > 70 ? 'bg-yellow-500' :
                  'bg-green-500'
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Uptime */}
      {health.uptime_seconds !== undefined && (
        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Uptime</span>
          </div>
          <span className="text-white font-medium">{formatUptime(health.uptime_seconds)}</span>
        </div>
      )}
    </div>
  );
}