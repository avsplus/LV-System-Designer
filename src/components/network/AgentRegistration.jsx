import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, QrCode, RefreshCw } from "lucide-react";

export default function AgentRegistration({ open, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [regData, setRegData] = useState(null);

  const generateToken = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('createRegistrationToken', {});
      setRegData(data);
      toast.success('Registration token created');
    } catch (error) {
      toast.error(error.message || 'Failed to create registration token');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    const configJson = JSON.stringify(regData, null, 2);
    await navigator.clipboard.writeText(configJson);
    toast.success('Configuration copied to clipboard');
  };

  const copyToken = async () => {
    await navigator.clipboard.writeText(regData.reg_token);
    toast.success('Token copied');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Register New Agent</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!regData ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">
                Generate a registration token to connect a new Windows agent to your organization.
              </p>
              <Button
                onClick={generateToken}
                disabled={loading}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Registration Token'
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-400 text-sm font-medium mb-1">⚠️ Security Notice</p>
                <p className="text-yellow-300/80 text-xs">
                  This code expires in 30 minutes. Do not share it publicly.
                </p>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/30 rounded-xl p-8">
                <p className="text-sm text-gray-400 text-center mb-3">Registration Code</p>
                <div className="bg-gray-900 rounded-lg p-6 mb-4">
                  <p className="text-4xl font-bold text-center text-cyan-400 tracking-wider font-mono">
                    {regData.reg_token}
                  </p>
                </div>
                <Button
                  onClick={copyToken}
                  className="w-full bg-cyan-600 hover:bg-cyan-700"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </Button>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-white">Instructions:</p>
                <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                  <li>Copy the registration code above</li>
                  <li>Open the Fusion Network Agent on your Windows machine</li>
                  <li>Enter the code and click "Register"</li>
                  <li>The agent will automatically configure and connect</li>
                </ol>
              </div>

              <div className="text-xs text-gray-500 text-center">
                Expires: {new Date(regData.expires_at).toLocaleString()}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setRegData(null);
              onOpenChange(false);
            }}
            className="border-gray-700"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}