import React, { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['orgSettings'],
    queryFn: async () => {
      const list = await base44.entities.OrganizationSettings.list();
      return list[0] || getDefaultSettings();
    },
    staleTime: 0, // Always refetch to get latest
    refetchOnWindowFocus: true
  });

  const refreshSettings = () => {
    queryClient.invalidateQueries({ queryKey: ['orgSettings'] });
  };

  const value = {
    settings: settings || getDefaultSettings(),
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