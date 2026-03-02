// Role hierarchy: owner > administrator > designer > viewer
export const ROLES = {
  OWNER: 'owner',
  ADMINISTRATOR: 'administrator',
  DESIGNER: 'designer',
  VIEWER: 'viewer'
};

export const ROLE_HIERARCHY = {
  [ROLES.OWNER]: 4,
  [ROLES.ADMINISTRATOR]: 3,
  [ROLES.DESIGNER]: 2,
  [ROLES.VIEWER]: 1
};

export const ROLE_LABELS = {
  [ROLES.OWNER]: 'Owner',
  [ROLES.ADMINISTRATOR]: 'Administrator',
  [ROLES.DESIGNER]: 'Designer',
  [ROLES.VIEWER]: 'Viewer'
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.OWNER]: 'Full access to all features including billing and organization settings',
  [ROLES.ADMINISTRATOR]: 'Manage team, projects, and resources',
  [ROLES.DESIGNER]: 'Create and edit AV designs and documentation',
  [ROLES.VIEWER]: 'View projects and leave comments'
};

export const ROLE_COLORS = {
  [ROLES.OWNER]: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  [ROLES.ADMINISTRATOR]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [ROLES.DESIGNER]: 'bg-green-500/20 text-green-400 border-green-500/30',
  [ROLES.VIEWER]: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
};

// Permission definitions
export const PERMISSIONS = {
  // Project permissions
  CREATE_PROJECT: 'create_project',
  DELETE_PROJECT: 'delete_project',
  RENAME_PROJECT: 'rename_project',
  ARCHIVE_PROJECT: 'archive_project',
  TRANSFER_PROJECT: 'transfer_project',
  EXPORT_PROJECT: 'export_project',
  
  // Canvas permissions
  ADD_DEVICE: 'add_device',
  REMOVE_DEVICE: 'remove_device',
  MOVE_DEVICE: 'move_device',
  EDIT_DEVICE: 'edit_device',
  CREATE_CONNECTION: 'create_connection',
  DELETE_CONNECTION: 'delete_connection',
  EDIT_CONNECTION: 'edit_connection',
  
  // Room permissions
  ADD_ROOM: 'add_room',
  DELETE_ROOM: 'delete_room',
  EDIT_ROOM: 'edit_room',
  
  // User management
  INVITE_USERS: 'invite_users',
  REMOVE_USERS: 'remove_users',
  MANAGE_ROLES: 'manage_roles',
  
  // Organization
  MANAGE_BILLING: 'manage_billing',
  MANAGE_ORGANIZATION: 'manage_organization',
  MANAGE_DEVICE_LIBRARY: 'manage_device_library',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  
  // Comments
  ADD_COMMENT: 'add_comment',
  DELETE_OWN_COMMENT: 'delete_own_comment',
  DELETE_ANY_COMMENT: 'delete_any_comment',
  
  // View
  VIEW_PROJECT: 'view_project',
  VIEW_DOCUMENTATION: 'view_documentation'
};

// Role-permission mapping
const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: Object.values(PERMISSIONS), // All permissions
  
  [ROLES.ADMINISTRATOR]: [
    PERMISSIONS.CREATE_PROJECT,
    PERMISSIONS.DELETE_PROJECT,
    PERMISSIONS.RENAME_PROJECT,
    PERMISSIONS.ARCHIVE_PROJECT,
    PERMISSIONS.EXPORT_PROJECT,
    PERMISSIONS.ADD_DEVICE,
    PERMISSIONS.REMOVE_DEVICE,
    PERMISSIONS.MOVE_DEVICE,
    PERMISSIONS.EDIT_DEVICE,
    PERMISSIONS.CREATE_CONNECTION,
    PERMISSIONS.DELETE_CONNECTION,
    PERMISSIONS.EDIT_CONNECTION,
    PERMISSIONS.ADD_ROOM,
    PERMISSIONS.DELETE_ROOM,
    PERMISSIONS.EDIT_ROOM,
    PERMISSIONS.INVITE_USERS,
    PERMISSIONS.REMOVE_USERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.MANAGE_DEVICE_LIBRARY,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.ADD_COMMENT,
    PERMISSIONS.DELETE_OWN_COMMENT,
    PERMISSIONS.DELETE_ANY_COMMENT,
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.VIEW_DOCUMENTATION
  ],
  
  [ROLES.DESIGNER]: [
    PERMISSIONS.CREATE_PROJECT,
    PERMISSIONS.RENAME_PROJECT,
    PERMISSIONS.EXPORT_PROJECT,
    PERMISSIONS.ADD_DEVICE,
    PERMISSIONS.REMOVE_DEVICE,
    PERMISSIONS.MOVE_DEVICE,
    PERMISSIONS.EDIT_DEVICE,
    PERMISSIONS.CREATE_CONNECTION,
    PERMISSIONS.DELETE_CONNECTION,
    PERMISSIONS.EDIT_CONNECTION,
    PERMISSIONS.ADD_ROOM,
    PERMISSIONS.DELETE_ROOM,
    PERMISSIONS.EDIT_ROOM,
    PERMISSIONS.ADD_COMMENT,
    PERMISSIONS.DELETE_OWN_COMMENT,
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.VIEW_DOCUMENTATION
  ],
  
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.VIEW_DOCUMENTATION,
    PERMISSIONS.EXPORT_PROJECT,
    PERMISSIONS.ADD_COMMENT,
    PERMISSIONS.DELETE_OWN_COMMENT
  ]
};

// Check if a role has a specific permission
export function hasPermission(role, permission) {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

// Check if user can perform action (considering project-level overrides)
export function canPerformAction(user, permission, project = null) {
  if (!user) return false;
  
  const userRole = user.organization_role || ROLES.VIEWER;
  
  // Check organization-level permission
  if (hasPermission(userRole, permission)) {
    return true;
  }
  
  // Check project-level permission (if user is project owner)
  if (project && project.owner_email === user.email) {
    // Project owners can do most things within their project
    const projectOwnerPermissions = [
      PERMISSIONS.DELETE_PROJECT,
      PERMISSIONS.RENAME_PROJECT,
      PERMISSIONS.EXPORT_PROJECT,
      PERMISSIONS.ADD_DEVICE,
      PERMISSIONS.REMOVE_DEVICE,
      PERMISSIONS.MOVE_DEVICE,
      PERMISSIONS.EDIT_DEVICE,
      PERMISSIONS.CREATE_CONNECTION,
      PERMISSIONS.DELETE_CONNECTION,
      PERMISSIONS.EDIT_CONNECTION,
      PERMISSIONS.ADD_ROOM,
      PERMISSIONS.DELETE_ROOM,
      PERMISSIONS.EDIT_ROOM,
      PERMISSIONS.INVITE_USERS,
      PERMISSIONS.REMOVE_USERS,
      PERMISSIONS.ADD_COMMENT,
      PERMISSIONS.DELETE_ANY_COMMENT,
      PERMISSIONS.VIEW_PROJECT,
      PERMISSIONS.VIEW_DOCUMENTATION
    ];
    return projectOwnerPermissions.includes(permission);
  }
  
  return false;
}

// Get all permissions for a role
export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

// Check if one role can manage another
export function canManageRole(managerRole, targetRole) {
  const managerLevel = ROLE_HIERARCHY[managerRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
  return managerLevel > targetLevel;
}

// Get roles that a user can assign to others
export function getAssignableRoles(userRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level < userLevel)
    .map(([role]) => role);
}