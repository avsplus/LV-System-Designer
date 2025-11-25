import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, Mail, Calendar, LogOut, FolderOpen, Users, 
  Share2, ArrowLeft, Save, Crown, Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

export default function Account() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then((userData) => {
      setUser(userData);
      setFullName(userData.full_name || '');
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
      await base44.auth.updateMe({ full_name: fullName });
      setUser({ ...user, full_name: fullName });
      setIsEditing(false);
    } catch (error) {
      console.error('Profile update error:', error);
      alert('Failed to update profile');
    }
    setIsSaving(false);
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      base44.auth.logout();
    }
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
      <div className="max-w-4xl mx-auto p-6">
        <Link to={createPageUrl("AVCanvas")}>
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white mb-6 -ml-2"
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
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {(user.full_name || user.email || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 space-y-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Full Name</label>
                        <Input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
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
                            setFullName(user.full_name || '');
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
                        <h2 className="text-2xl font-bold text-white">
                          {user.full_name || 'No name set'}
                        </h2>
                        <div className="flex items-center gap-2 text-gray-400 mt-1">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Joined {new Date(user.created_date).toLocaleDateString()}
                        </div>
                        <Badge className={user.role === 'admin' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-300'}>
                          {user.role}
                        </Badge>
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