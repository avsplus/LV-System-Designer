import React from 'react';
import { useOrganization } from './useOrganization';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2 } from "lucide-react";
import NoOrganization from "../../pages/NoOrganization";
import SetupOrganization from "../../pages/SetupOrganization";
import PendingApproval from "../../pages/PendingApproval";

export default function OrganizationGuard({ children }) {
  const { isLoading, hasOrganization, user } = useOrganization();

  // Check if any organizations exist (for first-time setup)
  const { data: allOrgs, isLoading: orgsLoading } = useQuery({
    queryKey: ['allOrganizations'],
    queryFn: () => base44.entities.Organization.list('-created_date', 1),
    enabled: !!user && !hasOrganization,
    staleTime: 60 * 1000
  });

  // Check if user has pending invites (by their email)
  const { data: pendingInvites, isLoading: invitesLoading } = useQuery({
    queryKey: ['pendingInvites', user?.email],
    queryFn: async () => {
      // Try lowercase first, then original email
      const invites = await base44.entities.PendingInvite.filter({ 
        email: user.email.toLowerCase(), 
        status: 'pending' 
      });
      if (invites && invites.length > 0) return invites;
      
      // Try with original case
      return base44.entities.PendingInvite.filter({ 
        email: user.email, 
        status: 'pending' 
      });
    },
    enabled: !!user && !hasOrganization,
    staleTime: 30 * 1000
  });

  // Show loading while fetching user or org data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  // User has organization but is pending approval
  if (user && hasOrganization && user.status === 'pending') {
    return <PendingApproval />;
  }

  // User exists but has no organization - BLOCK access
  if (user && !hasOrganization) {
    // Still loading org/invite data
    if (orgsLoading || invitesLoading) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      );
    }

    // Check URL for invitation params first
    const urlParams = new URLSearchParams(window.location.search);
    const hasInviteUrl = urlParams.get('org');
    
    // Check if user has pending invites in the database
    const hasPendingInvite = pendingInvites && pendingInvites.length > 0;
    
    // If no organizations exist at all and no pending invites, show setup flow (first user)
    if (!hasInviteUrl && !hasPendingInvite && (!allOrgs || allOrgs.length === 0)) {
      return <SetupOrganization />;
    }
    
    // Otherwise show the no-org/invitation page (pass pending invite info)
    return <NoOrganization pendingInvite={hasPendingInvite ? pendingInvites[0] : null} />;
  }

  return children;
}