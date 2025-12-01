import React, { useState, useEffect } from 'react';
import { Building2, Mail, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function NoOrganization({ pendingInvite }) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [inviteParams, setInviteParams] = useState(null);

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
        
        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}