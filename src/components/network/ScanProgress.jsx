import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, X, CheckCircle, Loader2, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function ScanProgress({ progress, devicesFound, isScanning, onStop, scanState = 'sent' }) {
  if (!isScanning) return null;

  const safeDevicesFound = devicesFound ?? 0;

  // Determine scan state based on progress
  let currentState = scanState;
  if (progress === 100) {
    currentState = 'finished';
  } else if (progress > 0) {
    currentState = 'scanning';
  }

  const states = [
    { id: 'sent', label: 'Sent', icon: Send, color: 'text-gray-400' },
    { id: 'scanning', label: 'Scanning', icon: Loader2, color: 'text-cyan-400' },
    { id: 'finished', label: 'Finished', icon: CheckCircle, color: 'text-green-400' }
  ];

  const currentStateIndex = states.findIndex(s => s.id === currentState);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="bg-gray-900 border border-cyan-500/30 rounded-xl p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-center mb-6">
          <Wifi className="w-16 h-16 text-cyan-400" />
        </div>
        
        <h3 className="text-xl font-bold text-white text-center mb-6">Scanning Network</h3>
        
        {/* Animated States */}
        <div className="flex items-center justify-between mb-8 px-4">
          {states.map((state, index) => {
            const Icon = state.icon;
            const isActive = index <= currentStateIndex;
            const isCurrent = index === currentStateIndex;
            
            return (
              <React.Fragment key={state.id}>
                <div className="flex flex-col items-center gap-2">
                  <motion.div
                    animate={{
                      scale: isCurrent ? [1, 1.1, 1] : 1,
                      opacity: isActive ? 1 : 0.3
                    }}
                    transition={{
                      scale: { duration: 1, repeat: isCurrent ? Infinity : 0 }
                    }}
                    className={`w-12 h-12 rounded-full border-2 ${
                      isActive ? 'border-cyan-500 bg-cyan-500/20' : 'border-gray-700 bg-gray-800'
                    } flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 ${isActive ? state.color : 'text-gray-600'} ${
                      state.id === 'scanning' && isCurrent ? 'animate-spin' : ''
                    }`} />
                  </motion.div>
                  <span className={`text-xs font-medium ${
                    isActive ? 'text-white' : 'text-gray-600'
                  }`}>
                    {state.label}
                  </span>
                </div>
                
                {index < states.length - 1 && (
                  <div className="flex-1 h-0.5 bg-gray-800 mx-2 relative overflow-hidden">
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: isActive ? '100%' : '0%' }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-cyan-500"
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        
        <div className="text-center mb-6">
          <span className="text-4xl font-bold text-cyan-400">{safeDevicesFound}</span>
          <span className="text-gray-400 ml-2">devices found</span>
        </div>
        
        {onStop && currentState !== 'finished' && (
          <div className="flex justify-center">
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
    </motion.div>
  );
}