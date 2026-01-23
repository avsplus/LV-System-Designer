import React, { useState, useEffect } from 'react';
import { useOrganization } from './useOrganization';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2 } from "lucide-react";
import NoOrganization from "../../pages/NoOrganization";
import SetupOrganization from "../../pages/SetupOrganization";
import PendingApproval from "../../pages/PendingApproval";
import Landing from "../../pages/Landing";

export default function OrganizationGuard({ children }) {
  // Allow Home page (landing) to bypass the guard completely
  const isHomePage = window.location.pathname === '/' || window.location.pathname === '/Home';
  if (isHomePage) {
    return children;
  }

  const [isAuthenticated, setIsAuthenticated] = useState(null);

  // Check authentication status
  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated).catch(() => setIsAuthenticated(false));
  }, []);

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

  // Show landing page for non-authenticated users
  if (isAuthenticated === false) {
    return <Landing />;
  }

  // Show loading while checking auth or fetching user data
  if (isAuthenticated === null || isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  // User has organization but is pending approval
  if (hasOrganization && user.status === 'pending') {
    return <PendingApproval />;
  }

  // User exists but has no organization - BLOCK access
  if (!hasOrganization) {
    // Check if user explicitly wants to create organization (check early, before loading)
    const isCreatingOrg = localStorage.getItem('creatingOrganization') === 'true';
    if (isCreatingOrg) {
      return <SetupOrganization />;
    }

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