import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Layout, Zap, Library, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function BottomTabs() {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { name: 'Canvas', icon: Layout, path: 'AVCanvas' },
    { name: 'Network', icon: Zap, path: 'NetworkMapping' },
    { name: 'Library', icon: Library, path: 'DeviceManager' },
    { name: 'Account', icon: User, path: 'Settings' },
  ];

  const isActive = (path) => currentPath.includes(path);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-40 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2 pb-2 sm:pb-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          
          return (
            <Link
              key={tab.path}
              to={createPageUrl(tab.path)}
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