import React, { useState, useEffect } from 'react';
import { Building2, Mail, Loader2, CheckCircle, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

export default function NoOrganization({ pendingInvite }) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [inviteParams, setInviteParams] = useState(null);
  const [showChoice, setShowChoice] = useState(false);

  useEffect(() => {
    // Check URL for invitation params
    const urlParams = new URLSearchParams(window.location.search);
    const org = urlParams.get('org');
    const role = urlParams.get('role');
    
    if (org) {
      setInviteParams({ organization_id: org, role: role || 'viewer' });
    } else if (pendingInvite) {
      // Use pending invite from database
      setInviteParams({ 
        organization_id: pendingInvite.organization_id, 
        role: pendingInvite.organization_role || 'viewer' 
      });
    }
  }, [pendingInvite]);

  const handleAcceptInvitation = async () => {
    if (!inviteParams) return;
    
    setIsAccepting(true);
    try {
      const response = await base44.functions.invoke('acceptInvitation', {
        organization_id: inviteParams.organization_id,
        role: inviteParams.role
      });
      
      if (response.data.success) {
        toast.success('Successfully joined organization!');
        // Clear URL params and reload to get fresh user data
        window.history.replaceState({}, '', window.location.pathname);
        window.location.reload();
      } else {
        toast.error(response.data.error || 'Failed to join organization');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Show invitation acceptance UI if params present
  if (inviteParams) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-3">
            You've Been Invited!
          </h1>
          
          <p className="text-gray-400 mb-6">
            Click below to accept the invitation and join the organization.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={handleAcceptInvitation}
              disabled={isAccepting}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show choice screen if not showing choice yet
  if (!showChoice) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-8 h-8 text-blue-400" />
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-3">
              Welcome to AV System Design
            </h1>
            
            <p className="text-gray-400">
              Let's get you set up. Which best describes you?
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Existing User/Employee */}
            <button
              onClick={() => setShowChoice(true)}
              className="bg-gray-900 border-2 border-gray-800 rounded-xl p-6 text-left hover:border-blue-500 transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2">
                I'm joining an existing organization
              </h3>
              
              <p className="text-sm text-gray-400 mb-4">
                My company already uses AV System Design and I need to be added to their organization.
              </p>

              <div className="flex items-center gap-2 text-xs text-purple-400">
                <Mail className="w-4 h-4" />
                Wait for invitation from admin
              </div>
            </button>

            {/* New Organization */}
            <Link to={createPageUrl("SetupOrganization")}>
              <button className="w-full bg-gray-900 border-2 border-gray-800 rounded-xl p-6 text-left hover:border-green-500 transition-all group">
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4 group-hover:bg-green-500/30 transition-colors">
                  <Plus className="w-6 h-6 text-green-400" />
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-2">
                  I'm creating a new organization
                </h3>
                
                <p className="text-sm text-gray-400 mb-4">
                  I'm setting up AV System Design for my company or team for the first time.
                </p>

                <div className="flex items-center gap-2 text-xs text-green-400">
                  <Building2 className="w-4 h-4" />
                  Create organization now
                </div>
              </button>
            </Link>
          </div>

          <div className="text-center mt-6">
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-300"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
          <Building2 className="w-8 h-8 text-blue-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-3">
          No Organization Found
        </h1>
        
        <p className="text-gray-400 mb-6">
          Your account is not associated with any organization. 
          Please contact your administrator to be invited to an organization.
        </p>
        
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 text-left">
            <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-white">Need access?</p>
              <p className="text-xs text-gray-500">
                Ask your organization admin to invite you using your email address.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => setShowChoice(false)}
            variant="outline"
            className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Back
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full text-gray-500 hover:text-gray-300"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}