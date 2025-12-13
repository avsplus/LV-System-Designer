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
                  This token expires in 30 minutes. Do not share it publicly or store it permanently.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">Registration Token</label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyToken}
                    className="h-8 text-cyan-400 hover:text-cyan-300"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 font-mono text-xs text-gray-300 break-all">
                  {regData.reg_token}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Full Configuration (JSON)</label>
                <div className="relative">
                  <pre className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto max-h-64">
                    {JSON.stringify(regData, null, 2)}
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyToClipboard}
                    className="absolute top-2 right-2 h-8 text-cyan-400 hover:text-cyan-300"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy All
                  </Button>
                </div>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-white">Instructions:</p>
                <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Copy the JSON configuration above</li>
                  <li>Open the Fusion LVS Agent GUI on your Windows machine</li>
                  <li>Click "Register Agent" and paste the configuration</li>
                  <li>The agent will connect and appear in your agent list</li>
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