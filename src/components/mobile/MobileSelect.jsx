import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/**
 * MobileSelect: Uses bottom-sheet drawer on mobile, standard select on desktop
 * Seamlessly handles the transition based on screen size
 */
export default function MobileSelect({
  value,
  onValueChange,
  placeholder,
  children,
  label,
  className = ''
}) {
  const isMobile = !useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useState(false);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    );
  }

  // Mobile: Use bottom sheet
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-full text-left px-3 py-2 rounded-md border border-gray-700 bg-gray-800 text-white text-sm ${className}`}
      >
        {value ? (
          <span className="text-white">{value}</span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-gray-900 border-gray-800">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-white">{label}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {React.Children.map(children, (child) => (
                <button
                  key={child.props.value}
                  onClick={() => {
                    onValueChange(child.props.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors user-select-none ${
                    value === child.props.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {child.props.children}
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}