import React from 'react';
import { useOrganization } from './useOrganization';
import { Loader2 } from "lucide-react";
import NoOrganization from "../../pages/NoOrganization";

export default function OrganizationGuard({ children }) {
  const { isLoading, hasOrganization, user } = useOrganization();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  // User exists but has no organization
  if (user && !hasOrganization) {
    return <NoOrganization />;
  }

  return children;
}