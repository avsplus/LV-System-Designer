import React from 'react';
import { Activity, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

export default function NetworkStats({ devices }) {
  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    warning: devices.filter(d => d.status === 'warning').length,
    maintenance: devices.filter(d => d.status === 'maintenance').length
  };

  return (
    <div className="flex gap-4 bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-lg px-4 py-3">
      <StatItem icon={Activity} label="Total" value={stats.total} color="text-cyan-400" />
      <StatItem icon={CheckCircle} label="Online" value={stats.online} color="text-green-400" />
      <StatItem icon={XCircle} label="Offline" value={stats.offline} color="text-gray-400" />
      <StatItem icon={AlertCircle} label="Warning" value={stats.warning} color="text-yellow-400" />
      <StatItem icon={Clock} label="Maintenance" value={stats.maintenance} color="text-blue-400" />
    </div>
  );
}

function StatItem({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${color}`} />
      <div>
        <span className="text-xs text-gray-400">{label}</span>
        <span className={`ml-2 text-lg font-bold ${color}`}>{value}</span>
      </div>
    </div>
  );
}