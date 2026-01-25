import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Wifi, X } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function ScanProgress({ progress, devicesFound, isScanning, onStop }) {
  if (!isScanning) return null;

  // Safe fallbacks for flexible result handling
  const safeProgress = progress ?? 0;
  const safeDevicesFound = devicesFound ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="bg-gray-900 border border-cyan-500/30 rounded-xl p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <Wifi className="w-16 h-16 text-cyan-400" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0"
            >
              <Loader2 className="w-16 h-16 text-cyan-500" />
            </motion.div>
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-white text-center mb-2">Scanning Network</h3>
        <p className="text-gray-400 text-center mb-6">Discovering devices on your network...</p>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Progress</span>
              <span>{safeProgress}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${safeProgress}%` }}
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          
          <div className="text-center">
            <span className="text-3xl font-bold text-cyan-400">{safeDevicesFound}</span>
            <span className="text-gray-400 ml-2">devices found</span>
          </div>
          
          {onStop && (
            <div className="mt-6 flex justify-center">
              <Button
                onClick={onStop}
                variant="outline"
                className="border-red-500 text-red-400 hover:bg-red-500/10"
              >
                <X className="w-4 h-4 mr-2" />
                Stop Scan
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}