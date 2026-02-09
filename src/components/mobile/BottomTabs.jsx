import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Layout, Zap, Library, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function BottomTabs() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [tabStates, setTabStates] = useState(() => {
    const savedStates = localStorage.getItem('bottomTabsStates');
    return savedStates ? JSON.parse(savedStates) : {
      AVCanvas: '/',
      NetworkMapping: '/',
      DeviceManager: '/',
      Settings: '/'
    };
  });

  const tabs = [
    { name: 'Canvas', icon: Layout, path: 'AVCanvas' },
    { name: 'Network', icon: Zap, path: 'NetworkMapping' },
    { name: 'Library', icon: Library, path: 'DeviceManager' },
    { name: 'Account', icon: User, path: 'account' },
  ];

  // Store tab state when navigating
  useEffect(() => {
    const currentTab = tabs.find(tab => currentPath.includes(tab.path));
    if (currentTab) {
      const newStates = { ...tabStates, [currentTab.path]: currentPath };
      setTabStates(newStates);
      localStorage.setItem('bottomTabsStates', JSON.stringify(newStates));
    }
  }, [currentPath]);

  const isActive = (path) => {
    // More precise matching to avoid false positives
    const pageName = currentPath.split('/').pop() || currentPath;
    return pageName === path || currentPath.includes(`/${path}`);
  };
  
  // Always navigate to the base page path
  const getTabPath = (path) => {
    return createPageUrl(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-40 safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16 px-2 pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          
          return (
            <Link
              key={tab.path}
              to={getTabPath(tab.path)}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-lg transition-colors user-select-none ${
                active 
                  ? 'text-blue-400 bg-blue-500/10' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}