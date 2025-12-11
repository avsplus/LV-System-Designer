import React from 'react';
import { motion } from 'framer-motion';
import { Server, Wifi, Printer, HardDrive, Shield, Network, Laptop, Box } from 'lucide-react';

const DEVICE_ICONS = {
  router: Network,
  switch: Network,
  server: Server,
  firewall: Shield,
  access_point: Wifi,
  workstation: Laptop,
  printer: Printer,
  nas: HardDrive,
  iot: Box,
  other: Box
};

const STATUS_COLORS = {
  online: 'border-green-500 bg-green-500/10',
  offline: 'border-gray-600 bg-gray-800/50',
  warning: 'border-yellow-500 bg-yellow-500/10',
  maintenance: 'border-blue-500 bg-blue-500/10'
};

const STATUS_RING = {
  online: 'ring-2 ring-green-500/50',
  offline: '',
  warning: 'ring-2 ring-yellow-500/50',
  maintenance: 'ring-2 ring-blue-500/50'
};

export default function DeviceNode({ device, onDragStart, onDrag, onDragEnd, onClick, isSelected }) {
  const Icon = DEVICE_ICONS[device.type] || Box;
  
  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={onDragStart}
      onDrag={(e, info) => onDrag(device.id, info)}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(device);
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`absolute cursor-move`}
      style={{ left: device.position_x, top: device.position_y }}
    >
      <div className={`
        w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center
        ${STATUS_COLORS[device.status]} ${STATUS_RING[device.status]}
        transition-all duration-200
        ${isSelected ? 'ring-4 ring-cyan-500 scale-110' : 'hover:scale-105'}
      `}>
        <Icon className={`w-8 h-8 mb-1 ${device.status === 'online' ? 'text-green-400' : 'text-gray-400'}`} />
        <span className="text-xs text-gray-300 font-medium truncate max-w-[4rem] px-1">
          {device.name}
        </span>
      </div>
      {device.status === 'online' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
      )}
    </motion.div>
  );
}