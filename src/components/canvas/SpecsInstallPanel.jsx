import React, { useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export default function SpecsInstallPanel({ schema, specs, installation, onSpecsChange, onInstallationChange }) {
  const [expandedSection, setExpandedSection] = useState('specs');

  const renderFieldInput = (fieldKey, fieldConfig, value, onChange) => {
    switch (fieldConfig.type) {
      case 'number':
        return (
          <div key={fieldKey} className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm text-gray-400">{fieldConfig.label}</label>
              <span className="text-sm text-blue-400 font-medium">{value}</span>
            </div>
            <Slider
              value={[value || fieldConfig.min || 0]}
              onValueChange={(v) => onChange(v[0])}
              min={fieldConfig.min || 0}
              max={fieldConfig.max || 100}
              step={fieldConfig.step || 1}
              className="w-full"
            />
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
                side="bottom" 
                avoidCollisions={false}
                sideOffset={5}
                className="bg-gray-800 border-gray-700 z-50"
                portal={true}
              >
                {fieldConfig.options.map((opt) => (
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
                      side="bottom" 
                      avoidCollisions={true}
                      sideOffset={5}
                      className="bg-gray-800 border-gray-700"
                    >
                      {fieldConfig.options.map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-white focus:bg-gray-700">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newArr = value.filter((_, i) => i !== idx);
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
          {Object.entries(schema.specs).map(([key, config]) =>
            renderFieldInput(key, config, specs[key], (value) => {
              onSpecsChange({ ...specs, [key]: value });
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