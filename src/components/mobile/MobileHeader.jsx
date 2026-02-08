import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Menu } from 'lucide-react';

export default function MobileHeader({ title, showBackButton = false, onMenuClick = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Auto-show back button for sub-pages
  const isSubPage = location.pathname.includes('/') && 
                    !['AVCanvas', 'NetworkMapping', 'DeviceManager', 'Settings'].some(p => location.pathname.includes(p));

  return (
    <div className="fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 z-30 safe-area-top">
      <div className="flex items-center justify-between h-14 px-3 sm:px-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {(showBackButton || isSubPage) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white h-10 w-10 flex-shrink-0 user-select-none"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="text-base sm:text-lg font-bold text-white truncate">
            {title}
          </h1>
        </div>
        
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="text-gray-400 hover:text-white h-10 w-10 flex-shrink-0 user-select-none"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}