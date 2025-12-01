import React from 'react';
import { Building2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function NoOrganization() {
  const handleLogout = () => {
    base44.auth.logout();
  };

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