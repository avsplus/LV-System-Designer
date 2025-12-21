import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { createClient } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, QrCode, RefreshCw } from "lucide-react";
import { useOrganization } from "../auth/useOrganization";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function AgentRegistration({ open, onOpenChange }) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [regData, setRegData] = useState(null);
  const [waiting, setWaiting] = useState(false);

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

  // Listen for registration completion via Supabase Realtime + Polling fallback
  useEffect(() => {
    if (!supabase || !regData?.reg_token || !open) return;

    setWaiting(true);
    let pollInterval;
    
    // Polling fallback - check every 2 seconds
    const checkRegistration = async () => {
      try {
        const { data, error } = await supabase
          .from('registration_tokens')
          .select('status')
          .eq('token', regData.reg_token)
          .single();
        
        if (!error && data?.status === 'used') {
          toast.success('Agent registered successfully!');
          setWaiting(false);
          clearInterval(pollInterval);
          // Close dialog and notify
          setTimeout(() => {
            setRegData(null);
            onOpenChange(false);
            window.dispatchEvent(new CustomEvent('agent-registered'));
          }, 1000);
        }
      } catch (err) {
        console.error('Registration check error:', err);
      }
    };

    // Start polling every 2 seconds
    pollInterval = setInterval(checkRegistration, 2000);
    
    // Also subscribe to realtime updates as primary method
    const channel = supabase
      .channel('registration-token-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'registration_tokens',
          filter: `token=eq.${regData.reg_token}`
        },
        (payload) => {
          if (payload.new.status === 'used') {
            toast.success('Agent registered successfully!');
            setWaiting(false);
            clearInterval(pollInterval);
            setTimeout(() => {
              setRegData(null);
              onOpenChange(false);
              window.dispatchEvent(new CustomEvent('agent-registered'));
            }, 1000);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
      setWaiting(false);
    };
  }, [regData?.reg_token, open, onOpenChange]);

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

              <div className="text-xs text-center space-y-2">
                <div className="text-gray-500">
                  Expires: {new Date(regData.expires_at).toLocaleString()}
                </div>
                {waiting && (
                  <div className="flex items-center justify-center gap-2 text-cyan-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Waiting for agent to register...</span>
                  </div>
                )}
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