import React, { useState } from 'react';
import { Building2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SetupOrganization({ onComplete }) {
  const [orgName, setOrgName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!orgName.trim()) {
      toast.error('Please enter an organization name');
      return;
    }

    setIsCreating(true);
    try {
      // Create the organization
      const org = await base44.entities.Organization.create({
        name: orgName.trim()
      });

      // Get current user and assign them as owner
      const user = await base44.auth.me();
      await base44.entities.User.update(user.id, {
        organization_id: org.id,
        organization_role: 'owner'
      });

      toast.success('Organization created successfully!');
      
      // Reload to get fresh user data with org assignment
      window.location.reload();
    } catch (error) {
      toast.error(error.message || 'Failed to create organization');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-3">
            Welcome! Let's Get Started
          </h1>
          
          <p className="text-gray-400">
            Create your organization to start designing AV systems.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Organization Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g., ABC Integrators"
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
            </div>

            <Button 
              onClick={handleCreate}
              disabled={isCreating || !orgName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Organization'
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            You'll be set as the owner and can invite team members later.
          </p>
        </div>
      </div>
    </div>
  );
}