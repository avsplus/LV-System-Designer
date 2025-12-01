import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ChevronLeft, Building2, Palette, Globe, Layout, 
  Database, FileText, Upload, Save, Plus, X, Loader2, Check, Download
} from "lucide-react";

const exportDataSchema = {
  exportDataSchema: {
    version: "1.0",
    description: "All available data variables for PDF export",
    projectInfo: {
      projectName: "string - Name of the project",
      clientName: "string - Client/customer name (optional)",
      location: "string - Project location/address (optional)",
      generatedDate: "string - Date the PDF was generated"
    },
    organizationSettings: {
      organization_name: "string - Company name",
      logo_url: "string - URL to company logo",
      primary_color: "string - Hex color code (e.g., #3b82f6)",
      secondary_color: "string - Hex color code",
      export_template: {
        include_logo: "boolean - Include logo in export",
        include_pricing: "boolean - Include pricing information",
        include_network_info: "boolean - Include network details",
        header_text: "string - Custom header text",
        footer_text: "string - Custom footer text"
      }
    },
    statistics: {
      totalDevices: "number - Total count of devices on canvas",
      totalConnections: "number - Total count of connections",
      totalRooms: "number - Total count of rooms"
    },
    rooms: ["string - Room name (e.g., 'Living Room', 'Master Bedroom')"],
    canvasProducts: [{
      instanceId: "string - Unique identifier for this device instance",
      label: "string - Device label (e.g., 'Sony 1', 'Denon 2')",
      room: "string - Room assignment",
      position: { x: "number - X coordinate on canvas", y: "number - Y coordinate on canvas" },
      networkInfo: {
        sw: "string - Switch number",
        port: "string - Port number",
        ip: "string - IP address (e.g., '192.168.1.100')",
        mac: "string - MAC address (e.g., '00:1A:2B:3C:4D:5E')"
      },
      product: {
        id: "string - Product database ID",
        brand: "string - Manufacturer name",
        model: "string - Model name/number",
        category: "string - Device category (see categories list)",
        description: "string - Product description",
        price: "number - Product price (optional)",
        image_url: "string - Product image URL",
        specs: {
          power: "string - Power specifications",
          impedance: "string - Impedance rating",
          frequency_response: "string - Frequency range",
          connectivity: "string - Connectivity options",
          dimensions: "string - Physical dimensions",
          weight: "string - Product weight"
        },
        input_connections: [{ type: "string - Connection type", ports: ["string - Port names"] }],
        output_connections: [{ type: "string - Connection type", ports: ["string - Port names"] }],
        control: {
          ip: "boolean - Supports IP control",
          rs232: "boolean - Supports RS232 control",
          ir: "boolean - Supports IR control",
          trigger: "boolean - Supports trigger control",
          protocols: ["string - Supported protocols"]
        }
      }
    }],
    connections: [{
      wireId: "string - Wire identifier (e.g., 'V001', 'A002', 'N003')",
      type: "string - Connection type (see connectionTypes)",
      from: "string - Source device instanceId",
      to: "string - Destination device instanceId",
      fromPort: "string - Source port name",
      toPort: "string - Destination port name"
    }],
    enums: {
      categories: [
        "televisions", "projectors", "projector_screens", "video_distribution",
        "matrix_switchers", "audio_streamers", "media_streamers", "speakers",
        "soundbars", "subwoofers", "stereo_amps", "multizone_amps",
        "surround_processors", "av_receivers", "network_switches",
        "control_processors", "hdmi_extenders"
      ],
      connectionTypes: [
        "HDMI", "HDBaseT", "Component", "Composite", "VGA", "Optical", "TOSLINK",
        "RCA", "XLR", "Speaker Wire", "Coaxial", "Subwoofer", "3.5mm Jack",
        "Wireless", "Ethernet", "USB", "RS232", "IR", "Control", "Power"
      ],
      wireIdPrefixes: {
        V: "Video connections (HDMI, HDBaseT, Component, Composite, VGA)",
        A: "Audio connections (Optical, RCA, XLR, Speaker Wire, etc.)",
        N: "Network connections (Ethernet, USB)",
        C: "Control connections (RS232, Control)",
        P: "Power connections"
      }
    }
  }
};
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { usePermissions } from "../components/auth/usePermissions";
import { ROLES } from "../components/auth/permissions";
import { toast } from "sonner";
import { useSettings } from "../components/settings/SettingsContext";
import { useOrganization } from "../components/auth/useOrganization";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Toronto", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Dubai", "Australia/Sydney"
];

export default function Settings() {
  const { isAtLeast, userRole, loading: permLoading } = usePermissions();
  const queryClient = useQueryClient();
  const { refreshSettings } = useSettings();
  const { organization, organizationId, isLoading: orgLoading } = useOrganization();
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Use organization from useOrganization hook directly instead of re-fetching
  const settings = organization;

  const [form, setForm] = useState({
    name: '',
    logo_url: '',
    primary_color: '#3b82f6',
    secondary_color: '#1e40af',
    timezone: 'America/New_York',
    canvas_theme: 'dark',
    snap_to_grid: true,
    grid_size: 20,
    default_zoom: 1,
    auto_save: true,
    labor_rates: {
      equipment_installation_rate: 0,
      system_programming_rate: 0,
      design_engineering_rate: 0
    },
    device_custom_fields: [],
    project_metadata_fields: [],
    export_template: {
      include_logo: true,
      include_pricing: false,
      include_network_info: true,
      header_text: '',
      footer_text: ''
    }
  });

  useEffect(() => {
    if (settings) {
      setForm({
        ...form,
        ...settings,
        labor_rates: { ...form.labor_rates, ...settings.labor_rates },
        export_template: { ...form.export_template, ...settings.export_template }
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return base44.entities.Organization.update(settings.id, data);
      } else {
        // This shouldn't happen - org should exist
        return base44.entities.Organization.create(data);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orgSettings', organizationId] });
      await refreshSettings();
      setSaved(true);
      toast.success('Settings saved - changes applied immediately');
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => {
      toast.error('Failed to save settings');
    }
  });

  const handleLogoUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, logo_url: file_url }));
      toast.success('Logo uploaded');
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const addCustomField = (type) => {
    const fieldKey = type === 'device' ? 'device_custom_fields' : 'project_metadata_fields';
    setForm(prev => ({
      ...prev,
      [fieldKey]: [...prev[fieldKey], { name: '', type: 'text', options: [], required: false }]
    }));
  };

  const removeCustomField = (type, index) => {
    const fieldKey = type === 'device' ? 'device_custom_fields' : 'project_metadata_fields';
    setForm(prev => ({
      ...prev,
      [fieldKey]: prev[fieldKey].filter((_, i) => i !== index)
    }));
  };

  const updateCustomField = (type, index, updates) => {
    const fieldKey = type === 'device' ? 'device_custom_fields' : 'project_metadata_fields';
    setForm(prev => ({
      ...prev,
      [fieldKey]: prev[fieldKey].map((field, i) => i === index ? { ...field, ...updates } : field)
    }));
  };

  if (permLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Minimum role: Designer can view, Admin+ can edit
  const canEdit = isAtLeast(ROLES.ADMINISTRATOR);
  const canViewAdvanced = isAtLeast(ROLES.ADMINISTRATOR);
  const canEditBranding = isAtLeast(ROLES.OWNER);

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("AVCanvas")}>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-sm text-gray-400">Configure your organization and canvas preferences</p>
            </div>
          </div>
          {canEdit && (
            <Button 
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
              className={saved ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saved ? 'Saved!' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        <Tabs defaultValue="organization" className="space-y-6">
          <TabsList className="bg-gray-800 border border-gray-700">
            <TabsTrigger value="organization" className="data-[state=active]:bg-gray-700">
              <Building2 className="w-4 h-4 mr-2" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-gray-700">
              <Palette className="w-4 h-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="canvas" className="data-[state=active]:bg-gray-700">
              <Layout className="w-4 h-4 mr-2" />
              Canvas
            </TabsTrigger>
            {canViewAdvanced && (
              <>
                <TabsTrigger value="fields" className="data-[state=active]:bg-gray-700">
                  <Database className="w-4 h-4 mr-2" />
                  Custom Fields
                </TabsTrigger>
                <TabsTrigger value="export" className="data-[state=active]:bg-gray-700">
                  <FileText className="w-4 h-4 mr-2" />
                  Export
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Organization Tab */}
          <TabsContent value="organization" className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
              <h3 className="text-lg font-semibold text-white">Organization Details</h3>
              
              <div className="grid gap-6">
                <div>
                  <Label className="text-gray-300">Organization Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    disabled={!canEditBranding}
                    className="mt-2 bg-gray-800 border-gray-700 text-white"
                    placeholder="Your Company Name"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Logo</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {form.logo_url ? (
                      <div className="relative">
                        <img src={form.logo_url} alt="Logo" className="h-16 w-auto rounded-lg border border-gray-700" />
                        {canEditBranding && (
                          <button
                            onClick={() => setForm({ ...form, logo_url: '' })}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="h-16 w-32 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-500">
                        No logo
                      </div>
                    )}
                    {canEditBranding && (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleLogoUpload(e.target.files[0])}
                        />
                        <Button variant="outline" className="border-gray-700 text-gray-300" disabled={uploading} asChild>
                          <span>
                            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            Upload Logo
                          </span>
                        </Button>
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Timezone</Label>
                  <Select
                    value={form.timezone}
                    onValueChange={(value) => setForm({ ...form, timezone: value })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="mt-2 bg-gray-800 border-gray-700 text-white">
                      <Globe className="w-4 h-4 mr-2 text-gray-400" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
              <h3 className="text-lg font-semibold text-white">Brand Colors</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-gray-300">Primary Color</Label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                      disabled={!canEditBranding}
                      className="w-12 h-10 rounded border-0 cursor-pointer"
                    />
                    <Input
                      value={form.primary_color}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                      disabled={!canEditBranding}
                      className="bg-gray-800 border-gray-700 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Secondary Color</Label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="color"
                      value={form.secondary_color}
                      onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                      disabled={!canEditBranding}
                      className="w-12 h-10 rounded border-0 cursor-pointer"
                    />
                    <Input
                      value={form.secondary_color}
                      onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                      disabled={!canEditBranding}
                      className="bg-gray-800 border-gray-700 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <Label className="text-gray-300">Preview</Label>
                <div className="mt-3 p-4 bg-gray-800 rounded-lg flex items-center gap-4">
                  <div className="px-4 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: form.primary_color }}>
                    Primary Button
                  </div>
                  <div className="px-4 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: form.secondary_color }}>
                    Secondary Button
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Canvas Tab */}
          <TabsContent value="canvas" className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
              <h3 className="text-lg font-semibold text-white">Canvas Preferences</h3>
              
              <div className="space-y-6">
                <div>
                  <Label className="text-gray-300">Default Theme</Label>
                  <Select
                    value={form.canvas_theme}
                    onValueChange={(value) => setForm({ ...form, canvas_theme: value })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="mt-2 w-48 bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Snap to Grid</Label>
                    <p className="text-sm text-gray-500">Align devices to grid when moving</p>
                  </div>
                  <Switch
                    checked={form.snap_to_grid}
                    onCheckedChange={(checked) => setForm({ ...form, snap_to_grid: checked })}
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Grid Size: {form.grid_size}px</Label>
                  <Slider
                    value={[form.grid_size]}
                    onValueChange={([value]) => setForm({ ...form, grid_size: value })}
                    min={10}
                    max={50}
                    step={5}
                    disabled={!canEdit}
                    className="mt-3"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Default Zoom: {Math.round(form.default_zoom * 100)}%</Label>
                  <Slider
                    value={[form.default_zoom]}
                    onValueChange={([value]) => setForm({ ...form, default_zoom: value })}
                    min={0.5}
                    max={2}
                    step={0.1}
                    disabled={!canEdit}
                    className="mt-3"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Auto-save Projects</Label>
                    <p className="text-sm text-gray-500">Automatically save changes as you work</p>
                  </div>
                  <Switch
                    checked={form.auto_save}
                    onCheckedChange={(checked) => setForm({ ...form, auto_save: checked })}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Custom Fields Tab */}
          {canViewAdvanced && (
            <TabsContent value="fields" className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Device Custom Fields</h3>
                  {canEdit && (
                    <Button size="sm" onClick={() => addCustomField('device')} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-1" /> Add Field
                    </Button>
                  )}
                </div>
                
                <div className="space-y-3">
                  {form.device_custom_fields.length === 0 ? (
                    <p className="text-gray-500 text-sm">No custom fields defined</p>
                  ) : (
                    form.device_custom_fields.map((field, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                        <Input
                          value={field.name}
                          onChange={(e) => updateCustomField('device', i, { name: e.target.value })}
                          placeholder="Field name"
                          disabled={!canEdit}
                          className="flex-1 bg-gray-700 border-gray-600 text-white"
                        />
                        <Select
                          value={field.type}
                          onValueChange={(value) => updateCustomField('device', i, { type: value })}
                          disabled={!canEdit}
                        >
                          <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Yes/No</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                          </SelectContent>
                        </Select>
                        {canEdit && (
                          <Button size="icon" variant="ghost" onClick={() => removeCustomField('device', i)} className="text-red-400 hover:text-red-300">
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Project Metadata Fields</h3>
                  {canEdit && (
                    <Button size="sm" onClick={() => addCustomField('project')} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-1" /> Add Field
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-400">Add custom fields like client name, address, project manager, etc.</p>
                
                <div className="space-y-3">
                  {form.project_metadata_fields.length === 0 ? (
                    <p className="text-gray-500 text-sm">No custom fields defined</p>
                  ) : (
                    form.project_metadata_fields.map((field, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                        <Input
                          value={field.name}
                          onChange={(e) => updateCustomField('project', i, { name: e.target.value })}
                          placeholder="Field name"
                          disabled={!canEdit}
                          className="flex-1 bg-gray-700 border-gray-600 text-white"
                        />
                        <Select
                          value={field.type}
                          onValueChange={(value) => updateCustomField('project', i, { type: value })}
                          disabled={!canEdit}
                        >
                          <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-gray-400">Required</Label>
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => updateCustomField('project', i, { required: checked })}
                            disabled={!canEdit}
                          />
                        </div>
                        {canEdit && (
                          <Button size="icon" variant="ghost" onClick={() => removeCustomField('project', i)} className="text-red-400 hover:text-red-300">
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          )}

          {/* Export Tab */}
          {canViewAdvanced && (
            <TabsContent value="export" className="space-y-6">
              {/* Labor Rates Section */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white">Labor Rates</h3>
                <p className="text-sm text-gray-400">Configure flat labor rates for proposals. Set to 0 for "Included" or leave blank for "TBD".</p>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-300">System Design & Engineering</Label>
                    <div className="mt-2 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <Input
                        type="number"
                        value={form.labor_rates?.design_engineering_rate || ''}
                        onChange={(e) => setForm({
                          ...form,
                          labor_rates: { ...form.labor_rates, design_engineering_rate: parseFloat(e.target.value) || 0 }
                        })}
                        disabled={!canEdit}
                        placeholder="0 = Included"
                        className="pl-7 bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300">Equipment Installation</Label>
                    <div className="mt-2 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <Input
                        type="number"
                        value={form.labor_rates?.equipment_installation_rate || ''}
                        onChange={(e) => setForm({
                          ...form,
                          labor_rates: { ...form.labor_rates, equipment_installation_rate: parseFloat(e.target.value) || 0 }
                        })}
                        disabled={!canEdit}
                        placeholder="Flat rate"
                        className="pl-7 bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300">System Programming & Testing</Label>
                    <div className="mt-2 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <Input
                        type="number"
                        value={form.labor_rates?.system_programming_rate || ''}
                        onChange={(e) => setForm({
                          ...form,
                          labor_rates: { ...form.labor_rates, system_programming_rate: parseFloat(e.target.value) || 0 }
                        })}
                        disabled={!canEdit}
                        placeholder="Flat rate"
                        className="pl-7 bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Note: "Cable Runs & Termination" is calculated automatically from your Wire Pricing settings (labor per run × number of connections).
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white">PDF Export Template</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-gray-300">Include Logo</Label>
                      <p className="text-sm text-gray-500">Show organization logo on exports</p>
                    </div>
                    <Switch
                      checked={form.export_template.include_logo}
                      onCheckedChange={(checked) => setForm({
                        ...form,
                        export_template: { ...form.export_template, include_logo: checked }
                      })}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-gray-300">Include Pricing</Label>
                      <p className="text-sm text-gray-500">Show device prices in documentation</p>
                    </div>
                    <Switch
                      checked={form.export_template.include_pricing}
                      onCheckedChange={(checked) => setForm({
                        ...form,
                        export_template: { ...form.export_template, include_pricing: checked }
                      })}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-gray-300">Include Network Info</Label>
                      <p className="text-sm text-gray-500">Show IP/MAC addresses in exports</p>
                    </div>
                    <Switch
                      checked={form.export_template.include_network_info}
                      onCheckedChange={(checked) => setForm({
                        ...form,
                        export_template: { ...form.export_template, include_network_info: checked }
                      })}
                      disabled={!canEdit}
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Header Text</Label>
                    <Input
                      value={form.export_template.header_text}
                      onChange={(e) => setForm({
                        ...form,
                        export_template: { ...form.export_template, header_text: e.target.value }
                      })}
                      disabled={!canEdit}
                      placeholder="Custom header text for exports"
                      className="mt-2 bg-gray-800 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Footer Text</Label>
                    <Input
                      value={form.export_template.footer_text}
                      onChange={(e) => setForm({
                        ...form,
                        export_template: { ...form.export_template, footer_text: e.target.value }
                      })}
                      disabled={!canEdit}
                      placeholder="Custom footer text for exports"
                      className="mt-2 bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white">Export Data Schema</h3>
                <p className="text-sm text-gray-400">
                  Download the JSON schema documenting all available data variables for PDF export customization.
                </p>
                <Button
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(exportDataSchema, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'export-data-schema.json';
                    document.body.appendChild(a);
                    a.click();
                    URL.revokeObjectURL(url);
                    a.remove();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Schema (JSON)
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}