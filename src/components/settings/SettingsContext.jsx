import React, { createContext, useContext, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ['orgSettings'],
    queryFn: async () => {
      const list = await base44.entities.OrganizationSettings.list();
      return list[0] || getDefaultSettings();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  const currentSettings = settings || getDefaultSettings();

  // Apply CSS variables for brand colors whenever settings change
  useEffect(() => {
    if (currentSettings) {
      document.documentElement.style.setProperty('--primary-color', currentSettings.primary_color);
      document.documentElement.style.setProperty('--secondary-color', currentSettings.secondary_color);
      
      // Apply theme class to body
      document.body.classList.remove('theme-dark', 'theme-light', 'theme-grid');
      document.body.classList.add(`theme-${currentSettings.canvas_theme || 'dark'}`);
    }
  }, [currentSettings.primary_color, currentSettings.secondary_color, currentSettings.canvas_theme]);

  const refreshSettings = async () => {
    await queryClient.invalidateQueries({ queryKey: ['orgSettings'] });
    await refetch();
  };

  const value = {
    settings: currentSettings,
    isLoading,
    refreshSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    // Return defaults if used outside provider
    return { settings: getDefaultSettings(), isLoading: false, refreshSettings: () => {} };
  }
  return context;
}

function getDefaultSettings() {
  return {
    organization_name: '',
    logo_url: '',
    primary_color: '#3b82f6',
    secondary_color: '#1e40af',
    timezone: 'America/New_York',
    canvas_theme: 'dark',
    snap_to_grid: true,
    grid_size: 20,
    default_zoom: 1,
    auto_save: true,
    device_custom_fields: [],
    project_metadata_fields: [],
    export_template: {
      include_logo: true,
      include_pricing: false,
      include_network_info: true,
      header_text: '',
      footer_text: ''
    }
  };
}