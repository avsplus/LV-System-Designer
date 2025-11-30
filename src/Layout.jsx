import React from 'react';
import { SettingsProvider } from "./components/settings/SettingsContext";
import { Toaster } from "sonner";

export default function Layout({ children }) {
  return (
    <SettingsProvider>
      <style>{`
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.5);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.7);
        }
        ::-webkit-scrollbar-corner {
          background: transparent;
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(75, 85, 99, 0.5) transparent;
        }
      `}</style>
      <div className="min-h-screen">
        {children}
      </div>
      <Toaster position="bottom-right" richColors />
    </SettingsProvider>
  );
}