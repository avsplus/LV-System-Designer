import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, Mail, Calendar, LogOut, FolderOpen, Users, 
  Share2, ArrowLeft, Save, Crown, Clock, Activity,
  Download, Trash2, AlertTriangle, Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { ConfirmProvider, useConfirm } from "../components/ui/ConfirmDialog";
import ActivityFeed from "../components/activity/ActivityFeed";
import RoleBadge from "../components/auth/RoleBadge";
import { ROLES } from "../components/auth/permissions";

function AccountContent() {
  const confirmDialog = useConfirm();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    base44.auth.me().then((userData) => {
      setUser(userData);
      setDisplayName(userData.display_name || userData.full_name || '');
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const { data: ownProjects = [] } = useQuery({
    queryKey: ['avProjects', 'own', user?.email],
    queryFn: () => base44.entities.AVProject.filter({ owner_email: user?.email }, '-updated_date'),
    enabled: !!user?.email,
  });

  const { data: sharedProjects = [] } = useQuery({
    queryKey: ['avProjects', 'shared', user?.email],
    queryFn: async () => {
      const allProjects = await base44.entities.AVProject.list('-updated_date');
      return allProjects.filter(p => 
        p.shared_with?.includes(user?.email) && p.owner_email !== user?.email
      );
    },
    enabled: !!user?.email,
  });

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({ display_name: displayName });
      setUser({ ...user, display_name: displayName });
      setIsEditing(false);
    } catch (error) {
      console.error('Profile update error:', error);
      alert('Failed to update profile');
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    const proceed = await confirmDialog('Are you sure you want to sign out?', {
      title: 'Sign Out',
      type: 'warning',
      confirmText: 'Sign Out',
      cancelText: 'Cancel'
    });
    if (proceed) {
      base44.auth.logout();
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await base44.functions.invoke('exportUserData', {});
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `av-system-design-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      alert('Failed to export data: ' + error.message);
    }
    setIsExporting(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteEmail.toLowerCase() !== user.email.toLowerCase()) {
      alert('Email does not match. Please type your email exactly.');
      return;
    }
    
    setIsDeleting(true);
    try {
      const response = await base44.functions.invoke('deleteUserAccount', { confirmEmail: deleteEmail });
      if (response.data.success) {
        alert('Your account data has been deleted. You will now be signed out.');
        base44.auth.logout();
      } else {
        alert(response.data.error || 'Failed to delete account');
      }
    } catch (error) {
      alert('Failed to delete account: ' + error.message);
    }
    setIsDeleting(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  const totalSharedByMe = ownProjects.reduce((sum, p) => sum + (p.shared_with?.length || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-4xl mx-auto p-3 sm:p-6">
        <Link to={createPageUrl("AVCanvas")}>
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white mb-4 sm:mb-6 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Canvas
          </Button>
        </Link>

        <div className="grid gap-6">
          {/* Profile Card */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl sm:text-2xl font-bold">
                  {(user.display_name || user.full_name || user.email || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 w-full space-y-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Display Name</label>
                        <Input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white max-w-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveProfile}
                          disabled={isSaving}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            setDisplayName(user.display_name || user.full_name || '');
                          }}
                          className="border-gray-700 text-gray-300"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                   <>
                     <div>
                       <h2 className="text-xl sm:text-2xl font-bold text-white">
                         {user.display_name || user.full_name || 'No name set'}
                       </h2>
                       <div className="flex items-center gap-2 text-gray-400 mt-1 text-sm sm:text-base">
                         <Mail className="w-4 h-4" />
                         <span className="truncate">{user.email}</span>
                       </div>
                     </div>
                     <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Joined {new Date(user.created_date).toLocaleDateString()}
                        </div>
                        <RoleBadge role={user.organization_role || (user.role === 'admin' ? ROLES.OWNER : ROLES.VIEWER)} />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                        className="border-gray-700 text-gray-300 hover:text-white"
                      >
                        Edit Profile
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{ownProjects.length}</p>
                    <p className="text-sm text-gray-400">My Projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{sharedProjects.length}</p>
                    <p className="text-sm text-gray-400">Shared With Me</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Share2 className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{totalSharedByMe}</p>
                    <p className="text-sm text-gray-400">Collaborators</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Projects */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                My Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ownProjects.length === 0 ? (
                <p className="text-gray-500 text-sm">No projects yet</p>
              ) : (
                <div className="space-y-3">
                  {ownProjects.slice(0, 5).map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                    >
                      <div>
                        <h4 className="font-medium text-white">{project.name}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span>{project.canvas_products?.length || 0} devices</span>
                          <span>{project.connections?.length || 0} connections</span>
                          {project.shared_with?.length > 0 && (
                            <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {project.shared_with.length}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {new Date(project.updated_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shared With Me */}
          {sharedProjects.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Shared With Me
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sharedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                    >
                      <div>
                        <h4 className="font-medium text-white">{project.name}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span>by {project.owner_email}</span>
                          <span>{project.canvas_products?.length || 0} devices</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {new Date(project.updated_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Feed */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed userEmail={user.email} limit={15} />
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                Data & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex-1">
                  <h4 className="text-white font-medium text-sm sm:text-base">Export Your Data</h4>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    Download a copy of all your data including projects, devices, and activity history.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 flex-shrink-0 w-full sm:w-auto"
                  size="sm"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {isExporting ? 'Exporting...' : 'Export Data'}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-3 sm:justify-between p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                <div className="flex-1">
                  <h4 className="text-red-400 font-medium flex items-center gap-2 text-sm sm:text-base">
                    <AlertTriangle className="w-4 h-4" />
                    Delete Account
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    Permanently delete your account and all associated data. This cannot be undone.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 flex-shrink-0 w-full sm:w-auto"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <Card className="bg-gray-900 border-red-500/30 max-w-md w-full">
                <CardHeader>
                  <CardTitle className="text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Delete Your Account?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300 text-sm">
                    This will permanently delete:
                  </p>
                  <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                    <li>All your projects and designs</li>
                    <li>Your activity history</li>
                    <li>Your export records</li>
                    <li>Your organization membership</li>
                  </ul>
                  <p className="text-yellow-400 text-sm font-medium">
                    This action cannot be undone.
                  </p>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">
                      Type your email to confirm: <span className="text-white">{user.email}</span>
                    </label>
                    <Input
                      value={deleteEmail}
                      onChange={(e) => setDeleteEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteEmail('');
                      }}
                      className="flex-1 border-gray-700 text-gray-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting || deleteEmail.toLowerCase() !== user.email.toLowerCase()}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      {isDeleting ? 'Deleting...' : 'Delete Forever'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sign Out */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function Account() {
  return (
    <ConfirmProvider>
      <AccountContent />
    </ConfirmProvider>
  );
}