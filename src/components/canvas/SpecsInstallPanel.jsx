import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export default function SpecsInstallPanel({ schema, specs, installation, onSpecsChange, onInstallationChange, connectionTypeOptions = [], unavailableWireIds = [], lockedPortAssignments = {} }) {
  const [expandedSection, setExpandedSection] = useState('specs');
  const allWireIdOptions = Array.from(
    new Set(
      (connectionTypeOptions || [])
        .filter((v) => typeof v === 'string')
        .map((v) => v.trim())
        .filter((v) => /^[A-Za-z]\d{3,}$/.test(v))
    )
  );
  const reservedWireIds = new Set(
    (unavailableWireIds || [])
      .filter((v) => typeof v === 'string')
      .map((v) => v.trim())
      .filter((v) => /^[A-Za-z]\d{3,}$/.test(v))
  );
  const currentSymbolSelections = new Set(
    (specs?.portTypes || [])
      .filter((v) => typeof v === 'string')
      .map((v) => v.trim())
      .filter((v) => /^[A-Za-z]\d{3,}$/.test(v))
  );
  const wireIdOptions = allWireIdOptions.filter(
    (id) => !reservedWireIds.has(id) || currentSymbolSelections.has(id)
  );

  const isDataOutlet = schema?.label === 'Data Outlet';
  const portsCount = Math.max(1, Math.min(8, Number(specs?.ports || schema?.defaults?.specs?.ports || 2)));
  const lockedPortLabels = Object.keys(lockedPortAssignments || {}).filter((k) => /^Port\s+\d+$/i.test(k));
  const maxLockedPortIndex = lockedPortLabels.reduce((max, label) => {
    const m = label.match(/^Port\s+(\d+)$/i);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);

  const normalizePortTypes = (arr, targetCount) => {
    const source = Array.isArray(arr) ? arr.filter((v) => v !== undefined && v !== null) : [];
    const fallback = source.find(Boolean) || wireIdOptions[0] || 'Port';
    const next = [...source];
    while (next.length < targetCount) next.push(fallback);
    return next.slice(0, targetCount).map((v) => v || fallback);
  };
  const applyLockedPortAssignments = (arr, targetCount) => {
    const next = [...arr];
    Object.entries(lockedPortAssignments || {}).forEach(([portLabel, wireId]) => {
      const m = String(portLabel).match(/^Port\s+(\d+)$/i);
      if (!m) return;
      const idx = Number(m[1]) - 1;
      if (idx >= 0 && idx < targetCount && wireId) {
        next[idx] = wireId;
      }
    });
    return next;
  };

  const getPortGrid = (count, orientation) => {
    if (count <= 2 && orientation === 'vertical') {
      return { cols: 1, rows: count };
    }
    if (orientation === 'horizontal') {
      const rows = count <= 4 ? 2 : 2;
      return { rows, cols: Math.ceil(count / rows) };
    }
    return { cols: 2, rows: Math.ceil(count / 2) };
  };

  const DataFaceplatePreview = () => {
    const orientation = specs?.faceplateOrientation || 'vertical';
    const ports = Math.max(1, Math.min(8, Number(specs?.ports || 2)));
    const portTypes = applyLockedPortAssignments(normalizePortTypes(specs?.portTypes, ports), ports);
    const plateColor = specs?.color || 'white';
    const plateTone = {
      white: '#e5e7eb',
      gray: '#cbd5e1',
      black: '#9ca3af',
      stainless: '#d1d5db'
    }[plateColor] || '#e5e7eb';
    const { cols, rows } = getPortGrid(ports, orientation);

    const faceW = orientation === 'horizontal' ? 200 : 150;
    const faceH = orientation === 'horizontal' ? 130 : 230;
    const innerPad = 14;
    const gap = 8;
    const moduleW = Math.floor((faceW - innerPad * 2 - gap * Math.max(0, cols - 1)) / cols);
    const moduleH = Math.floor((faceH - innerPad * 2 - gap * Math.max(0, rows - 1)) / rows);

    return (
      <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-3 overflow-hidden">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-gray-400">Live Faceplate Preview</p>
          <p className="text-xs text-blue-300">{ports} ports | {orientation}</p>
        </div>
        <div className="mx-auto flex w-full justify-center rounded-lg bg-[#0f172a] p-2">
          <div
            className="rounded-2xl border-[5px] p-3"
            style={{
              width: `${faceW}px`,
              height: `${faceH}px`,
              borderColor: plateTone,
              background: 'linear-gradient(180deg, #4b5563 0%, #374151 100%)'
            }}
          >
            <div
              className="grid h-full w-full"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                gap: `${gap}px`
              }}
            >
              {Array.from({ length: ports }).map((_, i) => (
                <div key={`port-preview-${i}`} className="flex min-w-0 flex-col items-center justify-center">
                  <div className="mb-1 w-full truncate rounded bg-gray-200 px-1 py-0.5 text-center text-[10px] font-medium text-gray-900">
                    Port {i + 1}
                  </div>
                  <div
                    className="w-full rounded border-2 border-gray-100 bg-gray-700/40"
                    style={{ height: `${Math.max(16, moduleH - 22)}px` }}
                  />
                  <div className="mt-1 truncate text-[10px] text-gray-300">{portTypes[i] || wireIdOptions[0] || 'Port'}</div>
                </div>
              ))}
            </div> 
          </div>
        </div>
      </div>
    );
  };

  const renderFieldInput = (fieldKey, fieldConfig, value, onChange) => {
    const dynamicOptions = fieldKey === 'portTypes'
      ? Array.from(new Set([...wireIdOptions, ...Object.values(lockedPortAssignments || {}).filter(Boolean)]))
      : fieldConfig.options;

    switch (fieldConfig.type) {
      case 'number':
        return (
          <div key={fieldKey} className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm text-gray-400">{fieldConfig.label}</label>
              <span className="text-sm text-blue-400 font-medium">{value}</span>
            </div>
            <Slider
              value={[value || Math.max(fieldConfig.min || 0, maxLockedPortIndex) || 0]}
              onValueChange={(v) => onChange(v[0])}
              min={fieldKey === 'ports' ? Math.max(fieldConfig.min || 0, maxLockedPortIndex) : (fieldConfig.min || 0)}
              max={fieldConfig.max || 100}
              step={fieldConfig.step || 1}
              className="w-full"
            />
            {fieldKey === 'ports' && maxLockedPortIndex > 0 && (
              <p className="text-xs text-amber-400">
                Ports 1-{maxLockedPortIndex} are physically assigned and cannot be removed.
              </p>
            )}
          </div>
        );
      case 'select':
        return (
          <div key={fieldKey} className="space-y-2">
            <label className="text-sm text-gray-400">{fieldConfig.label}</label>
            <Select value={value || ''} onValueChange={onChange}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder={`Select ${fieldConfig.label}`} />
              </SelectTrigger>
              <SelectContent 
                data-ui-overlay="true"
                side="bottom" 
                avoidCollisions={false}
                sideOffset={5}
                className="bg-gray-800 border-gray-700 z-[9999]"
              >
                {dynamicOptions.map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-white focus:bg-gray-700">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'text':
        return (
          <div key={fieldKey} className="space-y-2">
            <label className="text-sm text-gray-400">{fieldConfig.label}</label>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              placeholder={fieldConfig.label}
            />
          </div>
        );
      case 'array':
        if (fieldConfig.lengthMatches) {
          const targetCount = Number(specs?.[fieldConfig.lengthMatches] || 0);
          const values = applyLockedPortAssignments(normalizePortTypes(value, targetCount), targetCount);
          return (
            <div key={fieldKey} className="space-y-2">
              <label className="text-sm text-gray-400">{fieldConfig.label}</label>
              <div className="space-y-2">
                {values.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <div className="w-16 rounded border border-gray-700 bg-gray-800 px-2 py-2 text-center text-xs text-gray-300">
                      Port {idx + 1}
                    </div>
                    <Select
                      value={item || ''}
                      disabled={Boolean(lockedPortAssignments?.[`Port ${idx + 1}`])}
                      onValueChange={(val) => {
                        const newArr = [...values];
                        newArr[idx] = val;
                        onChange(newArr);
                      }}
                    >
                      <SelectTrigger className="flex-1 bg-gray-800 border-gray-700 text-white text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent
                        data-ui-overlay="true"
                        side="bottom"
                        avoidCollisions={false}
                        sideOffset={5}
                        className="bg-gray-800 border-gray-700 z-[9999]"
                      >
                        {dynamicOptions.length === 0 && (
                          <SelectItem value="__no_wire_ids__" disabled className="text-gray-400">
                            No wire IDs available
                          </SelectItem>
                        )}
                        {dynamicOptions.map((opt) => (
                          <SelectItem key={opt} value={opt} className="text-white focus:bg-gray-700">
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {lockedPortAssignments?.[`Port ${idx + 1}`] && (
                      <div className="rounded border border-amber-600/40 bg-amber-500/10 px-2 py-2 text-[11px] text-amber-300 whitespace-nowrap">
                        Locked
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return (
          <div key={fieldKey} className="space-y-2">
            <label className="text-sm text-gray-400">{fieldConfig.label}</label>
            <div className="space-y-2">
              {(value || []).map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <Select
                    value={item || ''}
                    onValueChange={(val) => {
                      const newArr = [...(value || [])];
                      newArr[idx] = val;
                      onChange(newArr);
                    }}
                  >
                    <SelectTrigger className="flex-1 bg-gray-800 border-gray-700 text-white text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent 
                      data-ui-overlay="true"
                      side="bottom" 
                      avoidCollisions={false}
                      sideOffset={5}
                      className="bg-gray-800 border-gray-700 z-[9999]"
                    >
                      {dynamicOptions.length === 0 && (
                        <SelectItem value="__no_wire_ids__" disabled className="text-gray-400">
                          No wire IDs available
                        </SelectItem>
                      )}
                      {dynamicOptions.map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-white focus:bg-gray-700">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newArr = (value || []).filter((_, i) => i !== idx);
                      onChange(newArr);
                    }}
                    className="bg-red-900 hover:bg-red-800 border-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {(value || []).length < (fieldConfig.max || 8) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onChange([...(value || []), '']);
                  }}
                  className="w-full bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                >
                  + Add {fieldConfig.label}
                </Button>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const Section = ({ title, isOpen, onToggle, children }) => (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 transition"
      >
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-4 bg-gray-900 space-y-4 border-t border-gray-700">
          {children}
        </div>
      )}
    </div>
  );

  if (!schema) return null;

  return (
    <>
      <Section
        title="Specifications"
        isOpen={expandedSection === 'specs'}
        onToggle={() => setExpandedSection(expandedSection === 'specs' ? 'installation' : 'specs')}
      >
        <div className="space-y-4">
          {isDataOutlet && <DataFaceplatePreview />}
          {Object.entries(schema.specs).map(([key, config]) =>
            renderFieldInput(key, config, specs[key], (value) => {
              const nextSpecs = { ...specs, [key]: value };
              if (key === 'ports') {
                nextSpecs.portTypes = normalizePortTypes(nextSpecs.portTypes, Number(value || 0));
              }
              if (key === 'portTypes') {
                nextSpecs.portTypes = normalizePortTypes(value, portsCount);
              }
              onSpecsChange(nextSpecs);
            })
          )}
        </div>
      </Section>

      <Section
        title="Installation"
        isOpen={expandedSection === 'installation'}
        onToggle={() => setExpandedSection(expandedSection === 'installation' ? 'specs' : 'installation')}
      >
        <div className="space-y-4">
          {Object.entries(schema.installation).map(([key, config]) =>
            renderFieldInput(key, config, installation[key], (value) => {
              onInstallationChange({ ...installation, [key]: value });
            })
          )}
        </div>
      </Section>
    </>
  );
}

