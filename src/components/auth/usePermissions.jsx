import { useState, useEffect, useCallback } from 'react';
import { base44 } from "@/api/base44Client";
import { 
  hasPermission, 
  canPerformAction, 
  ROLES, 
  PERMISSIONS,
  canManageRole,
  getAssignableRoles 
} from './permissions';

export function usePermissions(project = null) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        // Default to OWNER if no role set (first user / app owner)
        // You can change this after setting up roles properly
        setUserRole(currentUser.organization_role || ROLES.OWNER);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const can = useCallback((permission) => {
    if (!user) return false;
    return canPerformAction(user, permission, project);
  }, [user, project]);

  const isRole = useCallback((role) => {
    return userRole === role;
  }, [userRole]);

  const isAtLeast = useCallback((role) => {
    const roleHierarchy = { owner: 4, administrator: 3, designer: 2, viewer: 1 };
    return (roleHierarchy[userRole] || 0) >= (roleHierarchy[role] || 0);
  }, [userRole]);

  const canManage = useCallback((targetRole) => {
    if (!userRole) return false;
    return canManageRole(userRole, targetRole);
  }, [userRole]);

  const assignableRoles = useCallback(() => {
    if (!userRole) return [];
    return getAssignableRoles(userRole);
  }, [userRole]);

  // Convenience methods
  const canEdit = can(PERMISSIONS.ADD_DEVICE);
  const canManageProject = can(PERMISSIONS.DELETE_PROJECT);
  const canManageUsers = can(PERMISSIONS.MANAGE_ROLES);
  const canViewOnly = !canEdit;
  const isProjectOwner = project && user && project.owner_email === user.email;

  return {
    user,
    loading,
    userRole,
    can,
    isRole,
    isAtLeast,
    canManage,
    assignableRoles,
    canEdit,
    canManageProject,
    canManageUsers,
    canViewOnly,
    isProjectOwner,
    PERMISSIONS,
    ROLES
  };
}

export default usePermissions;