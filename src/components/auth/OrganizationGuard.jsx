import React from 'react';
import { useOrganization } from './useOrganization';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { Loader2 } from "lucide-react";
import NoOrganization from "../../pages/NoOrganization";
import SetupOrganization from "../../pages/SetupOrganization";
import PendingApproval from "../../pages/PendingApproval";
import { useAuth } from '@/lib/AuthContext';

export default function OrganizationGuard({ children }) {
  // Allow Home page (landing) to bypass the guard completely
  const isHomePage = window.location.pathname === '/' || window.location.pathname === '/Home';
  if (isHomePage) {
    return children;
  }

  const { isAuthenticated, isLoadingAuth } = useAuth();

  const { isLoading, hasOrganization, user } = useOrganization();

  const { data: bootstrapData, isLoading: bootstrapLoading } = useQuery({
    queryKey: ['bootstrap', user?.email],
    queryFn: () => appClient.getBootstrap(),
    enabled: !!user && !hasOrganization,
    staleTime: 60 * 1000
  });

  const pendingInvite = bootstrapData?.pending_invite || null;

  if (isAuthenticated === false) {
    const currentUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    appClient.redirectToLogin(currentUrl, 'signin', { reason: 'auth_required' });
    return null;
  }

  // Show loading while checking auth or fetching user data
  if (isLoadingAuth || isLoading || !user) {
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
    if (bootstrapLoading) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      );
    }

    // Show the no-org/invitation page first for all no-org users.
    // Setup flow is entered only when user explicitly chooses to create an organization.
    return <NoOrganization pendingInvite={pendingInvite} />;
  }

  return children;
}
