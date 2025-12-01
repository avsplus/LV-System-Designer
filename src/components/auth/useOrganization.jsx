import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useOrganization() {
  // First get the current user to find their organization_id
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false
  });

  // Then fetch the organization
  const { data: organization, isLoading: orgLoading, refetch: refetchOrg } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null;
      const orgs = await base44.entities.Organization.filter({ id: user.organization_id });
      return orgs[0] || null;
    },
    enabled: !!user?.organization_id,
    staleTime: 5 * 60 * 1000
  });

  // isLoading should be true while user is loading, or while org is loading (if user has org)
  const isLoading = userLoading || (!!user?.organization_id && orgLoading);

  return {
    user,
    organization,
    organizationId: user?.organization_id,
    isLoading,
    refetchOrganization: refetchOrg,
    hasOrganization: !!user?.organization_id
  };
}

// Helper to get org filter for queries
export function useOrgFilter() {
  const { organizationId, isLoading, hasOrganization } = useOrganization();
  
  return {
    orgFilter: organizationId ? { organization_id: organizationId } : {},
    organizationId,
    isLoading,
    hasOrganization
  };
}