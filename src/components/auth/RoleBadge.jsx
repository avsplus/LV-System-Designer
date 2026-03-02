import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Crown, Shield, Pencil, Eye } from "lucide-react";
import { ROLES, ROLE_LABELS, ROLE_COLORS } from './permissions';

const ROLE_ICONS = {
  [ROLES.OWNER]: Crown,
  [ROLES.ADMINISTRATOR]: Shield,
  [ROLES.DESIGNER]: Pencil,
  [ROLES.VIEWER]: Eye
};

export default function RoleBadge({ role, size = 'default', showIcon = true }) {
  const Icon = ROLE_ICONS[role] || Eye;
  const label = ROLE_LABELS[role] || 'Unknown';
  const colorClass = ROLE_COLORS[role] || ROLE_COLORS[ROLES.VIEWER];
  
  const sizeClasses = {
    small: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-1',
    large: 'text-base px-3 py-1.5'
  };
  
  const iconSizes = {
    small: 'w-3 h-3',
    default: 'w-3.5 h-3.5',
    large: 'w-4 h-4'
  };

  return (
    <Badge className={`${colorClass} ${sizeClasses[size]} border font-medium`}>
      {showIcon && <Icon className={`${iconSizes[size]} mr-1.5`} />}
      {label}
    </Badge>
  );
}