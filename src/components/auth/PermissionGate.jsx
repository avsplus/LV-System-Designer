import React from 'react';
import { usePermissions } from './usePermissions';
import { Lock } from 'lucide-react';

// Component that conditionally renders children based on permissions
export default function PermissionGate({ 
  permission, 
  project = null, 
  children, 
  fallback = null,
  showLocked = false 
}) {
  const { can, loading } = usePermissions(project);

  if (loading) {
    return null;
  }

  if (can(permission)) {
    return <>{children}</>;
  }

  if (showLocked) {
    return (
      <div className="opacity-50 cursor-not-allowed relative">
        <div className="pointer-events-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded">
          <Lock className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    );
  }

  return fallback;
}

// HOC version for wrapping components
export function withPermission(Component, permission) {
  return function PermissionWrappedComponent(props) {
    return (
      <PermissionGate permission={permission} project={props.project}>
        <Component {...props} />
      </PermissionGate>
    );
  };
}