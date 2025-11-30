import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Save, FolderOpen, Trash2, Plus, Share2, Users, Crown, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trackActivity, ActivityActions } from "../activity/activityTracker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProjectManager({ 
  currentProject, 
  canvasProducts, 
  connections,
  rooms = [],
  onProjectLoad,
  onClose 
}) {
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [showShareForm, setShowShareForm] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [projectName, setProjectName] = useState(currentProject?.name || '');
  const [projectDescription, setProjectDescription] = useState(currentProject?.description || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [alertDialog, setAlertDialog] = useState({ open: false, title: '', message: '', onConfirm: null, type: 'alert', confirmText: 'Continue', isDanger: false });

  const showAlert = (message, title = 'Notice') => {
    setAlertDialog({ open: true, title, message, type: 'alert', onConfirm: null });
  };

  const showConfirm = (message, title, onConfirm, options = {}) => {
    setAlertDialog({ 
      open: true, 
      title, 
      message, 
      type: 'confirm', 
      onConfirm,
      confirmText: options.confirmText || 'Continue',
      isDanger: options.isDanger || false
    });
  };
  
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch user's own projects
  const { data: ownProjects = [], isLoading: loadingOwn } = useQuery({
    queryKey: ['avProjects', 'own', currentUser?.email],
    queryFn: () => base44.entities.AVProject.filter({ owner_email: currentUser?.email }, '-updated_date'),
    enabled: !!currentUser?.email,
  });

  // Fetch projects shared with user
  const { data: sharedProjects = [], isLoading: loadingShared } = useQuery({
    queryKey: ['avProjects', 'shared', currentUser?.email],
    queryFn: async () => {
      const allProjects = await base44.entities.AVProject.list('-updated_date');
      return allProjects.filter(p => 
        p.shared_with?.includes(currentUser?.email) && p.owner_email !== currentUser?.email
      );
    },
    enabled: !!currentUser?.email,
  });

  const isLoading = loadingOwn || loadingShared;

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (currentProject && currentProject.id) {
        const updated = await base44.entities.AVProject.update(currentProject.id, data);
        await trackActivity(ActivityActions.UPDATED_PROJECT, currentProject.id, data.name);
        return updated;
      }
      const created = await base44.entities.AVProject.create({
        ...data,
        owner_email: currentUser?.email,
        shared_with: []
      });
      await trackActivity(ActivityActions.CREATED_PROJECT, created.id, data.name);
      return created;
    },
    onSuccess: (savedProject) => {
      queryClient.invalidateQueries({ queryKey: ['avProjects'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setShowSaveForm(false);
      onProjectLoad(savedProject);
    },
  });

  const shareMutation = useMutation({
    mutationFn: async ({ projectId, sharedWith, addedEmail, removedEmail, projectName }) => {
      const result = await base44.entities.AVProject.update(projectId, { shared_with: sharedWith });
      if (addedEmail) {
        await trackActivity(ActivityActions.SHARED_PROJECT, projectId, projectName, { shared_with: addedEmail });
      }
      if (removedEmail) {
        await trackActivity(ActivityActions.UNSHARED_PROJECT, projectId, projectName, { shared_with: removedEmail });
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avProjects'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setShowShareForm(null);
      setShareEmail('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AVProject.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avProjects'] });
    },
  });

  const handleSave = () => {
    if (!projectName.trim()) {
      showAlert('Please enter a project name', 'Missing Name');
      return;
    }

    saveMutation.mutate({
      name: projectName,
      description: projectDescription,
      canvas_products: canvasProducts,
      connections: connections,
      rooms: rooms
    });
  };

  const handleLoad = (project) => {
    if (canvasProducts.length > 0 || connections.length > 0) {
      showConfirm(
        'Loading this project will replace your current canvas. Continue?',
        'Load Project',
        () => {
          onProjectLoad(project);
          onClose();
        }
      );
      return;
    }
    onProjectLoad(project);
    onClose();
  };

  const handleDelete = (project) => {
    if (project.owner_email !== currentUser?.email) {
      showAlert('You can only delete projects you own.', 'Permission Denied');
      return;
    }
    showConfirm(
      `Are you sure you want to delete "${project.name}"? This will permanently remove the project and all its devices, connections, and rooms. This action cannot be undone.`,
      'Delete Project',
      () => {
        deleteMutation.mutate(project.id);
        if (currentProject?.id === project.id) {
          onProjectLoad(null);
        }
      },
      { confirmText: 'Delete Project', isDanger: true }
    );
  };

  const handleShare = (project) => {
    if (project.owner_email !== currentUser?.email) {
      showAlert('Only the project owner can manage sharing.', 'Permission Denied');
      return;
    }
    setShowShareForm(project);
  };

  const handleAddShare = () => {
    if (!shareEmail.trim() || !showShareForm) return;
    const email = shareEmail.trim().toLowerCase();
    
    if (email === currentUser?.email) {
      showAlert('You cannot share a project with yourself.', 'Invalid Email');
      return;
    }
    
    const currentShared = showShareForm.shared_with || [];
    if (currentShared.includes(email)) {
      showAlert('This user already has access.', 'Already Shared');
      return;
    }
    
    shareMutation.mutate({
      projectId: showShareForm.id,
      sharedWith: [...currentShared, email],
      addedEmail: email,
      projectName: showShareForm.name
    });
  };

  const handleRemoveShare = (email) => {
    if (!showShareForm) return;
    const currentShared = showShareForm.shared_with || [];
    shareMutation.mutate({
      projectId: showShareForm.id,
      sharedWith: currentShared.filter(e => e !== email),
      removedEmail: email,
      projectName: showShareForm.name
    });
  };

  const handleCreateProject = () => {
    setProjectName('');
    setProjectDescription('');
    setShowSaveForm(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Project Manager</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {currentProject && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">Current Project</h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setProjectName(currentProject.name);
                    setProjectDescription(currentProject.description || '');
                    setShowSaveForm(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save Changes
                </Button>
              </div>
              <p className="text-blue-400">{currentProject.name}</p>
              {currentProject.description && (
                <p className="text-sm text-gray-400 mt-1">{currentProject.description}</p>
              )}
            </div>
          )}

          {showSaveForm ? (
            <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
              <h3 className="font-semibold text-white mb-3">
                {currentProject && projectName === currentProject.name ? 'Update Project' : 'Create New Project'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Project Name</label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g., Home Theater Setup"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Description (optional)</label>
                  <Textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Brief description of this project..."
                    className="bg-gray-900 border-gray-700 text-white"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowSaveForm(false)}
                    className="border-gray-700 text-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? 'Saving...' : 'Save Project'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 mb-4">
              {currentProject && (
                <Button
                  onClick={() => {
                    setProjectName('');
                    setProjectDescription('');
                    setShowSaveForm(true);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save As New Project
                </Button>
              )}
              {!currentProject && (
                <Button
                  onClick={() => {
                    setProjectName('');
                    setProjectDescription('');
                    setShowSaveForm(true);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Project
                </Button>
              )}
            </div>
          )}

          {/* Share Modal */}
          {showShareForm && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-purple-500/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-purple-400" />
                  Share "{showShareForm.name}"
                </h3>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowShareForm(null)}
                  className="h-6 w-6 text-gray-400"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              
              <div className="flex gap-2 mb-3">
                <Input
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Enter user's email address"
                  className="bg-gray-900 border-gray-700 text-white flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddShare()}
                />
                <Button
                  onClick={handleAddShare}
                  disabled={shareMutation.isPending || !shareEmail.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Users className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              
              {showShareForm.shared_with?.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 mb-2">Shared with:</p>
                  {showShareForm.shared_with.map((email) => (
                    <div key={email} className="flex items-center justify-between bg-gray-900 rounded px-3 py-2">
                      <span className="text-sm text-gray-300">{email}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveShare(email)}
                        className="h-6 w-6 text-gray-400 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No users have access yet</p>
              )}
            </div>
          )}

          {/* My Projects */}
          <div className="border-t border-gray-800 pt-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              My Projects
            </h3>
            {isLoading ? (
              <p className="text-gray-400 text-sm">Loading projects...</p>
            ) : ownProjects.length === 0 ? (
              <p className="text-gray-400 text-sm">No saved projects yet</p>
            ) : (
              <div className="space-y-2">
                {ownProjects.map((project) => (
                  <div
                    key={project.id}
                    className={`bg-gray-800 rounded-lg p-3 border transition-all ${
                      currentProject?.id === project.id 
                        ? 'border-blue-500' 
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-white">{project.name}</h4>
                          {project.shared_with?.length > 0 && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {project.shared_with.length}
                            </Badge>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-sm text-gray-400 mt-1">{project.description}</p>
                        )}
                        <div className="flex gap-3 text-xs text-gray-500 mt-2">
                          <span>{project.rooms?.length || 0} rooms</span>
                          <span>{project.canvas_products?.length || 0} devices</span>
                          <span>{project.connections?.length || 0} connections</span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleShare(project)}
                          className="h-8 w-8 text-purple-400 hover:text-purple-300"
                          title="Share project"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleLoad(project)}
                          className="h-8 w-8 text-blue-400 hover:text-blue-300"
                          title="Load project"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(project)}
                          className="h-8 w-8 text-gray-400 hover:text-red-400"
                          title="Delete project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shared With Me */}
          {sharedProjects.length > 0 && (
            <div className="border-t border-gray-800 pt-4 mt-4">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Shared With Me
              </h3>
              <div className="space-y-2">
                {sharedProjects.map((project) => (
                  <div
                    key={project.id}
                    className={`bg-gray-800 rounded-lg p-3 border transition-all ${
                      currentProject?.id === project.id 
                        ? 'border-purple-500' 
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-white">{project.name}</h4>
                          <Badge className="bg-gray-700 text-gray-300 text-xs">
                            by {project.owner_email}
                          </Badge>
                        </div>
                        {project.description && (
                          <p className="text-sm text-gray-400 mt-1">{project.description}</p>
                        )}
                        <div className="flex gap-3 text-xs text-gray-500 mt-2">
                          <span>{project.rooms?.length || 0} rooms</span>
                          <span>{project.canvas_products?.length || 0} devices</span>
                          <span>{project.connections?.length || 0} connections</span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleLoad(project)}
                          className="h-8 w-8 text-purple-400 hover:text-purple-300"
                          title="Load project"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Styled Alert/Confirm Dialog */}
      <AlertDialog open={alertDialog.open} onOpenChange={(open) => setAlertDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              {alertDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {alertDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {alertDialog.type === 'confirm' ? (
              <>
                <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => alertDialog.onConfirm?.()}
                  className={alertDialog.isDanger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
                >
                  {alertDialog.confirmText || 'Continue'}
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction className="bg-blue-600 hover:bg-blue-700">
                OK
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}