import { useQuery } from "@tanstack/react-query";
import { appClient } from "@/api/appClient";
import { useOrganization } from "../auth/useOrganization";

// Plan limits configuration
export const PLAN_LIMITS = {
  free: {
    maxProjects: 3,
    maxDevicesPerCategory: 5,
    maxPdfExportsPerDay: 12,
    features: {
      customBranding: false,
      fullDeviceLibrary: false,
      standardSupport: false,
      liveSupport: false,
      slaGuarantee: false,
      unlimitedPdfExports: false
    }
  },
  pro: {
    maxProjects: 25,
    maxDevicesPerCategory: Infinity,
    maxPdfExportsPerDay: 48,
    features: {
      customBranding: true,
      fullDeviceLibrary: true,
      standardSupport: true,
      liveSupport: false,
      slaGuarantee: false,
      unlimitedPdfExports: false
    }
  },
  enterprise: {
    maxProjects: Infinity,
    maxDevicesPerCategory: Infinity,
    maxPdfExportsPerDay: Infinity,
    features: {
      customBranding: true,
      fullDeviceLibrary: true,
      standardSupport: true,
      liveSupport: true,
      slaGuarantee: true,
      unlimitedPdfExports: true
    }
  }
};

export function useSubscription() {
  const { organizationId, isLoading: orgLoading } = useOrganization();

  const { data: subscription, isLoading: subLoading, refetch } = useQuery({
    queryKey: ['subscription', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const result = await appClient.getBillingSubscription();
      return result?.subscription || null;
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

  const canAddDeviceInCategory = (currentDeviceCountInCategory) => {
    return currentDeviceCountInCategory < limits.maxDevicesPerCategory;
  };

  const canExportPdf = (todayExportCount) => {
    return todayExportCount < limits.maxPdfExportsPerDay;
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
    canAddDeviceInCategory,
    canExportPdf,
    hasFeature,
    canAccessFeature: hasFeature, // alias for backward compatibility
    // Quick checks
    isPro,
    isEnterprise,
    isFree
  };
}
