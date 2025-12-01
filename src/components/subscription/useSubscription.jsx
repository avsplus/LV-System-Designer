import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOrganization } from "../auth/useOrganization";

// Plan limits configuration
export const PLAN_LIMITS = {
  free: {
    maxProjects: 3,
    maxDevicesPerProject: 20,
    maxUsersInOrg: 2,
    features: {
      customBranding: false,
      advancedExports: false,
      apiAccess: false,
      prioritySupport: false,
      unlimitedProjects: false,
      fullDeviceLibrary: false
    }
  },
  pro: {
    maxProjects: Infinity,
    maxDevicesPerProject: Infinity,
    maxUsersInOrg: 10,
    features: {
      customBranding: true,
      advancedExports: true,
      apiAccess: true,
      prioritySupport: true,
      unlimitedProjects: true,
      fullDeviceLibrary: true
    }
  },
  enterprise: {
    maxProjects: Infinity,
    maxDevicesPerProject: Infinity,
    maxUsersInOrg: Infinity,
    features: {
      customBranding: true,
      advancedExports: true,
      apiAccess: true,
      prioritySupport: true,
      unlimitedProjects: true,
      fullDeviceLibrary: true,
      sso: true,
      dedicatedSupport: true,
      customIntegrations: true,
      slaGuarantee: true
    }
  }
};

export function useSubscription() {
  const { organizationId, isLoading: orgLoading } = useOrganization();

  const { data: subscription, isLoading: subLoading, refetch } = useQuery({
    queryKey: ['subscription', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const subs = await base44.entities.Subscription.filter({ organization_id: organizationId });
      return subs[0] || null;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const currentPlan = subscription?.plan || 'free';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing' || !subscription;
  const limits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.free;

  // Helper functions
  const canCreateProject = (currentProjectCount) => {
    return currentProjectCount < limits.maxProjects;
  };

  const canAddDevice = (currentDeviceCount) => {
    return currentDeviceCount < limits.maxDevicesPerProject;
  };

  const canAddUser = (currentUserCount) => {
    return currentUserCount < limits.maxUsersInOrg;
  };

  const hasFeature = (featureName) => {
    return limits.features[featureName] || false;
  };

  const isPro = currentPlan === 'pro' || currentPlan === 'enterprise';
  const isEnterprise = currentPlan === 'enterprise';
  const isFree = currentPlan === 'free';

  return {
    subscription,
    currentPlan,
    isActive,
    limits,
    isLoading: orgLoading || subLoading,
    refetch,
    // Helper functions
    canCreateProject,
    canAddDevice,
    canAddUser,
    hasFeature,
    canAccessFeature: hasFeature, // alias for backward compatibility
    // Quick checks
    isPro,
    isEnterprise,
    isFree
  };
}