import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, Settings, Shield, Search, Mail, 
  Crown, Pencil, Eye, ChevronLeft, MoreVertical,
  UserPlus, Trash2, Activity, Building2, Database, Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { usePermissions } from "../components/auth/usePermissions";
import { useOrganization } from "../components/auth/useOrganization";
import RoleBadge from "../components/auth/RoleBadge";
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_COLORS } from "../components/auth/permissions";
import ActivityFeed from "../components/activity/ActivityFeed";
import { toast } from "sonner";

export default function Admin() {
  const { user, userRole, canManage, assignableRoles, isAtLeast, loading: permLoading } = usePermissions();
  const { organization, organizationId, refetchOrganization } = useOrganization();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(ROLES.VIEWER);
  const queryClient = useQueryClient();

  // Fetch users in this organization
  const { data: users = [], isLoading, error: usersError } = useQuery({
    queryKey: ['users', organizationId],
    queryFn: async () => {
      try {
        const userList = await base44.entities.User.filter({ organization_id: organizationId });
        return userList;
      } catch (error) {
        console.error('Failed to fetch users:', error);
        if (user) return [user];
        return [];
      }
    },
    enabled: isAtLeast(ROLES.ADMINISTRATOR) && !permLoading && !!organizationId,
    retry: 0
  });

  // Fetch projects in this organization
  const { data: projects = [] } = useQuery({
    queryKey: ['allProjects', organizationId],
    queryFn: () => base44.entities.AVProject.filter({ organization_id: organizationId }),
    enabled: isAtLeast(ROLES.ADMINISTRATOR) && !!organizationId
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }) => {
      await base44.entities.User.update(userId, { organization_role: newRole });
      return { userId, newRole };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const updateOrgMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Organization.update(organizationId, data);
    },
    onSuccess: () => {
      refetchOrganization();
      toast.success('Organization updated');
    }
  });

  // Check access
  if (permLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAtLeast(ROLES.ADMINISTRATOR)) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">You need Administrator or Owner privileges to access this page.</p>
          <Link to={createPageUrl("AVCanvas")}>
            <Button>Back to Canvas</Button>
          </Link>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchTerm || 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const effectiveRole = u.organization_role || (u.role === 'admin' ? ROLES.OWNER : ROLES.VIEWER);
    const matchesRole = roleFilter === 'all' || effectiveRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (userId, newRole) => {
    updateRoleMutation.mutate({ userId, newRole });
  };

  // Compute effective role (considering Base44's built-in admin role)
  const getEffectiveRole = (u) => {
    if (u.organization_role) return u.organization_role;
    if (u.role === 'admin') return ROLES.OWNER;
    return ROLES.VIEWER;
  };

  const stats = {
    totalUsers: users.length,
    owners: users.filter(u => getEffectiveRole(u) === ROLES.OWNER).length,
    admins: users.filter(u => getEffectiveRole(u) === ROLES.ADMINISTRATOR).length,
    designers: users.filter(u => getEffectiveRole(u) === ROLES.DESIGNER).length,
    viewers: users.filter(u => getEffectiveRole(u) === ROLES.VIEWER).length,
    totalProjects: projects.length
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("AVCanvas")}>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm text-gray-400">Manage users, roles, and settings</p>
            </div>
          </div>
          <RoleBadge role={userRole} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Total Users" value={stats.totalUsers} icon={Users} />
          <StatCard label="Owners" value={stats.owners} icon={Crown} color="purple" />
          <StatCard label="Admins" value={stats.admins} icon={Shield} color="blue" />
          <StatCard label="Designers" value={stats.designers} icon={Pencil} color="green" />
          <StatCard label="Viewers" value={stats.viewers} icon={Eye} color="gray" />
          <StatCard label="Projects" value={stats.totalProjects} icon={Activity} color="cyan" />
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-gray-800 border border-gray-700">
            <TabsTrigger value="users" className="data-[state=active]:bg-gray-700">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="roles" className="data-[state=active]:bg-gray-700">
              <Shield className="w-4 h-4 mr-2" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-gray-700">
              <Activity className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
            {isAtLeast(ROLES.OWNER) && (
              <TabsTrigger value="settings" className="data-[state=active]:bg-gray-700">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            )}
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* Invite User Form */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Invite User
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Email address"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 bg-gray-800 border-gray-700 text-white"
                />
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {assignableRoles().map((role) => (
                      <SelectItem key={role} value={role}>
                        <RoleBadge role={role} size="small" />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={async () => {
                    if (!inviteEmail) {
                      toast.error('Please enter an email address');
                      return;
                    }
                    try {
                      // Send invitation email
                      await base44.integrations.Core.SendEmail({
                        to: inviteEmail,
                        subject: `You've been invited to join ${organization?.name || 'an organization'}`,
                        body: `
                          <h2>You've been invited!</h2>
                          <p>You've been invited to join <strong>${organization?.name || 'an organization'}</strong> on our AV Design platform.</p>
                          <p>Role: <strong>${ROLE_LABELS[inviteRole]}</strong></p>
                          <p>Click the link below to accept the invitation and create your account:</p>
                          <p><a href="${window.location.origin}?org=${organizationId}&role=${inviteRole}">Accept Invitation</a></p>
                        `
                      });
                      toast.success(`Invitation sent to ${inviteEmail}`);
                      setInviteEmail('');
                    } catch (error) {
                      toast.error('Failed to send invitation');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invite
                </Button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All Roles</SelectItem>
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <SelectItem key={role} value={role}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Users List */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-800/50 text-sm font-medium text-gray-400 border-b border-gray-800">
                <div className="col-span-4">User</div>
                <div className="col-span-3">Role</div>
                <div className="col-span-3">Projects</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              
              {isLoading ? (
                <div className="p-8 text-center text-gray-400">Loading users...</div>
              ) : usersError ? (
                <div className="p-8 text-center">
                  <p className="text-yellow-400 mb-2">Limited access to user data</p>
                  <p className="text-gray-500 text-sm">Only platform owners can view all users. Contact your organization owner for full access.</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No users found</div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {filteredUsers.map((u) => {
                    const userProjects = projects.filter(p => 
                      p.owner_email === u.email || p.shared_with?.includes(u.email)
                    );
                    const currentUserRole = getEffectiveRole(u);
                    const canEditThisUser = canManage(currentUserRole) && u.email !== user?.email;
                    
                    return (
                      <div key={u.id} className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-gray-800/30">
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-medium">
                            {u.full_name?.charAt(0) || u.email?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-white font-medium">{u.full_name || 'Unknown'}</p>
                            <p className="text-sm text-gray-400">{u.email}</p>
                          </div>
                          {u.email === user?.email && (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">You</Badge>
                          )}
                        </div>
                        <div className="col-span-3">
                          {canEditThisUser ? (
                            <Select 
                              value={currentUserRole} 
                              onValueChange={(newRole) => handleRoleChange(u.id, newRole)}
                            >
                              <SelectTrigger className="w-40 bg-gray-800 border-gray-700">
                                <RoleBadge role={currentUserRole} size="small" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 border-gray-700">
                                {assignableRoles().map((role) => (
                                  <SelectItem key={role} value={role}>
                                    <RoleBadge role={role} size="small" />
                                  </SelectItem>
                                ))}
                                <SelectItem value={currentUserRole}>
                                  <RoleBadge role={currentUserRole} size="small" />
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <RoleBadge role={currentUserRole} size="small" />
                          )}
                        </div>
                        <div className="col-span-3">
                          <span className="text-gray-400">{userProjects.length} project{userProjects.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="col-span-2 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-gray-800 border-gray-700">
                              <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                                <Mail className="w-4 h-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                              {canEditThisUser && (
                                <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove User
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <div key={role} className={`p-6 rounded-xl border ${ROLE_COLORS[role]} bg-gray-900`}>
                  <div className="flex items-center gap-3 mb-4">
                    <RoleBadge role={role} size="large" />
                    <span className="text-gray-400 text-sm">
                      {users.filter(u => (u.organization_role || ROLES.VIEWER) === role).length} users
                    </span>
                  </div>
                  <p className="text-gray-300 mb-4">{ROLE_DESCRIPTIONS[role]}</p>
                  <RolePermissionsList role={role} />
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
              <ActivityFeed limit={20} />
            </div>
          </TabsContent>

          {/* Settings Tab (Owner only) */}
          {isAtLeast(ROLES.OWNER) && (
            <TabsContent value="settings" className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Building2 className="w-6 h-6 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Organization Details</h3>
                </div>
                
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Organization Name</label>
                    <Input
                      defaultValue={organization?.name || ''}
                      onBlur={(e) => {
                        if (e.target.value !== organization?.name) {
                          updateOrgMutation.mutate({ name: e.target.value });
                        }
                      }}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Organization ID</label>
                    <Input
                      value={organizationId || ''}
                      disabled
                      className="bg-gray-800/50 border-gray-700 text-gray-500"
                    />
                  </div>
                  
                  <div className="pt-4 border-t border-gray-800">
                    <h4 className="text-white font-medium mb-2">Organization Stats</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-400">Members</p>
                        <p className="text-xl font-bold text-white">{users.length}</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-400">Projects</p>
                        <p className="text-xl font-bold text-white">{projects.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Data Migration */}
                  <MigrateDataSection organizationId={organizationId} />
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    gray: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
  };

  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <Icon className="w-5 h-5 mb-2" />
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}

function RolePermissionsList({ role }) {
  const permissionsByRole = {
    [ROLES.OWNER]: ['Full access to everything', 'Billing & subscriptions', 'Organization settings', 'Transfer ownership'],
    [ROLES.ADMINISTRATOR]: ['Manage projects & users', 'Assign roles', 'Device library management', 'View audit logs'],
    [ROLES.DESIGNER]: ['Create & edit designs', 'Add/remove devices', 'Manage connections', 'Export documentation'],
    [ROLES.VIEWER]: ['View projects', 'View documentation', 'Add comments', 'Export PDFs']
  };

  return (
    <ul className="space-y-1 text-sm text-gray-400">
      {permissionsByRole[role]?.map((perm, i) => (
        <li key={i} className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-current" />
          {perm}
        </li>
      ))}
    </ul>
  );
}

function MigrateDataSection({ organizationId }) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);

  const handleMigrate = async () => {
    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const response = await base44.functions.invoke('migrateToOrganization', {});
      setMigrationResult(response.data);
      if (response.data.success) {
        toast.success('Data migration completed!');
      } else {
        toast.error(response.data.error || 'Migration failed');
      }
    } catch (error) {
      toast.error(error.message || 'Migration failed');
      setMigrationResult({ error: error.message });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="pt-4 border-t border-gray-800">
      <h4 className="text-white font-medium mb-2 flex items-center gap-2">
        <Database className="w-4 h-4" />
        Data Migration
      </h4>
      <p className="text-sm text-gray-400 mb-3">
        Migrate existing data (users, projects, devices, etc.) without an organization to this organization.
      </p>
      <Button
        onClick={handleMigrate}
        disabled={isMigrating}
        variant="outline"
        className="border-gray-700 text-gray-300 hover:bg-gray-800"
      >
        {isMigrating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Migrating...
          </>
        ) : (
          <>
            <Database className="w-4 h-4 mr-2" />
            Migrate Existing Data
          </>
        )}
      </Button>
      
      {migrationResult?.success && (
        <div className="mt-3 bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm">
          <p className="text-green-400 font-medium mb-2">Migration Complete!</p>
          <div className="text-gray-300 space-y-1">
            <p>Users migrated: {migrationResult.stats.users}</p>
            <p>Projects migrated: {migrationResult.stats.projects}</p>
            <p>Products migrated: {migrationResult.stats.products}</p>
            <p>Wire pricing migrated: {migrationResult.stats.wirePricing}</p>
            <p>Activities migrated: {migrationResult.stats.activities}</p>
          </div>
        </div>
      )}
      
      {migrationResult?.error && (
        <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
          Error: {migrationResult.error}
        </div>
      )}
    </div>
  );
}