import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, FolderOpen, Trash2, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function ProjectManager({ 
  currentProject, 
  canvasProducts, 
  connections,
  onProjectLoad,
  onClose 
}) {
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [projectName, setProjectName] = useState(currentProject?.name || '');
  const [projectDescription, setProjectDescription] = useState(currentProject?.description || '');
  
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['avProjects'],
    queryFn: () => base44.entities.AVProject.list('-updated_date'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (currentProject) {
        return base44.entities.AVProject.update(currentProject.id, data);
      }
      return base44.entities.AVProject.create(data);
    },
    onSuccess: (savedProject) => {
      queryClient.invalidateQueries({ queryKey: ['avProjects'] });
      setShowSaveForm(false);
      onProjectLoad(savedProject);
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
      alert('Please enter a project name');
      return;
    }

    saveMutation.mutate({
      name: projectName,
      description: projectDescription,
      canvas_products: canvasProducts,
      connections: connections
    });
  };

  const handleLoad = (project) => {
    if (canvasProducts.length > 0 || connections.length > 0) {
      if (!confirm('Loading this project will replace your current canvas. Continue?')) {
        return;
      }
    }
    onProjectLoad(project);
    onClose();
  };

  const handleDelete = (project) => {
    if (confirm(`Delete project "${project.name}"?`)) {
      deleteMutation.mutate(project.id);
      if (currentProject?.id === project.id) {
        onProjectLoad(null);
      }
    }
  };

  const handleNewProject = () => {
    if (canvasProducts.length > 0 || connections.length > 0) {
      if (!confirm('Creating a new project will clear your current canvas. Continue?')) {
        return;
      }
    }
    onProjectLoad(null);
    onClose();
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
                {currentProject ? 'Update Project' : 'Save New Project'}
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
              <Button
                onClick={() => setShowSaveForm(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {currentProject ? 'Save As New' : 'Save Current Canvas'}
              </Button>
              <Button
                onClick={handleNewProject}
                variant="outline"
                className="border-gray-700 text-gray-300"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>
          )}

          <div className="border-t border-gray-800 pt-4">
            <h3 className="font-semibold text-white mb-3">Saved Projects</h3>
            {isLoading ? (
              <p className="text-gray-400 text-sm">Loading projects...</p>
            ) : projects.length === 0 ? (
              <p className="text-gray-400 text-sm">No saved projects yet</p>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
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
                        <h4 className="font-medium text-white">{project.name}</h4>
                        {project.description && (
                          <p className="text-sm text-gray-400 mt-1">{project.description}</p>
                        )}
                        <div className="flex gap-3 text-xs text-gray-500 mt-2">
                          <span>{project.canvas_products?.length || 0} devices</span>
                          <span>{project.connections?.length || 0} connections</span>
                          <span>{new Date(project.updated_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
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
        </div>
      </div>
    </div>
  );
}