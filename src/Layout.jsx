import React, { useState, useEffect } from 'react';
import { SettingsProvider } from "./components/settings/SettingsContext";
import { Toaster } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import OrganizationGuard from "./components/auth/OrganizationGuard";
import BottomTabs from "./components/mobile/BottomTabs";
import { useLocation } from "react-router-dom";
import { useMediaQuery } from "./components/mobile/useMediaQuery";
import { useAuth } from "@/lib/AuthContext";

export default function Layout({ children }) {
  const location = useLocation();
  const isMobile = !useMediaQuery('(min-width: 768px)');
  const [prevPath, setPrevPath] = useState(location.pathname);
  const { isAuthenticated } = useAuth();

  // Detect direction of navigation for animation
  const isForward = location.pathname.includes(prevPath) ? true : false;
  
  useEffect(() => {
    setPrevPath(location.pathname);
  }, [location.pathname]);

  const isHomePage = location.pathname === '/' || location.pathname === '/Home';
  // Hide bottom tabs on landing/unauthenticated state
  const showBottomTabs = isMobile && isAuthenticated === true && !isHomePage;

  return (
    <SettingsProvider>
      <style>{`
        :root {
          --safe-area-inset-top: env(safe-area-inset-top, 0px);
          --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
          --safe-area-inset-left: env(safe-area-inset-left, 0px);
          --safe-area-inset-right: env(safe-area-inset-right, 0px);
        }
      `}</style>
      <OrganizationGuard>
        <div className="min-h-screen bg-gray-950">
          {/* Page transitions with framer-motion */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: isForward ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isForward ? -20 : 20 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className={showBottomTabs ? "pb-16 safe-area-bottom" : ""}
            >
              {children}
            </motion.div>
          </AnimatePresence>

          {/* Mobile Bottom Navigation - only for authenticated users */}
          {showBottomTabs && <BottomTabs />}
        </div>
      </OrganizationGuard>
      <Toaster position="bottom-right" richColors />
    </SettingsProvider>
  );
}
