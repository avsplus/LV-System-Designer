import React from 'react';
import { SettingsProvider } from "./components/settings/SettingsContext";
import { Toaster } from "sonner";

export default function Layout({ children }) {
  return (
    <SettingsProvider>
      <div className="min-h-screen">
        {children}
      </div>
      <Toaster position="bottom-right" richColors />
    </SettingsProvider>
  );
}