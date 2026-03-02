import React from 'react';
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, Mail } from "lucide-react";

export default function PendingApproval() {
  const handleSignOut = () => {
    appClient.logout(window.location.origin);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-3">
            Awaiting Approval
          </h1>
          
          <p className="text-gray-400 mb-6">
            Your account has been created, but an administrator needs to approve your access before you can use the application.
          </p>
          
          <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-gray-300">
              <Mail className="w-4 h-4" />
              <span className="text-sm">You'll receive an email when approved</span>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
