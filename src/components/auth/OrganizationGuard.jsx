import React from 'react';
import { useOrganization } from './useOrganization';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2 } from "lucide-react";
import NoOrganization from "../../pages/NoOrganization";
import SetupOrganization from "../../pages/SetupOrganization";

export default function OrganizationGuard({ children }) {
  const { isLoading, hasOrganization, user } = useOrganization();

  // Check if any organizations exist (for first-time setup)
  const { data: allOrgs, isLoading: orgsLoading } = useQuery({
    queryKey: ['allOrganizations'],
    queryFn: () => base44.entities.Organization.list('-created_date', 1),
    enabled: !!user && !hasOrganization,
    staleTime: 60 * 1000
  });

  if (isLoading || (user && !hasOrganization && orgsLoading)) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  // User exists but has no organization
  if (user && !hasOrganization) {
    // Check URL for invitation params first
    const urlParams = new URLSearchParams(window.location.search);
    const hasInvite = urlParams.get('org');
    
    // If no organizations exist at all, show setup flow
    if (!hasInvite && (!allOrgs || allOrgs.length === 0)) {
      return <SetupOrganization />;
    }
    
    // Otherwise show the no-org/invitation page
    return <NoOrganization />;
  }

  return children;
}