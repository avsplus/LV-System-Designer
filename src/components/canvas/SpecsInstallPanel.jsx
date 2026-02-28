import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export default function SpecsInstallPanel({ schema, specs, installation, onSpecsChange, onInstallationChange }) {
  const [expandedSection, setExpandedSection] = useState('specs');
  const [localSpecs, setLocalSpecs] = useState(specs || {});
  const [localInstallation, setLocalInstallation] = useState(installation || {});

  const renderFieldInput = (fieldKey, fieldConfig, value, onChange) => {
    const handleChange = (newValue) => {
      onChange(newValue);
    };

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
              onValueChange={(v) => {
                handleChange(v[0]);
              }}
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
            <select
              value={value || ''}
              onChange={(e) => {
                handleChange(e.target.value);
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select {fieldConfig.label}</option>
              {fieldConfig.options && fieldConfig.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );
      case 'text':
        return (
          <div key={fieldKey} className="space-y-2">
            <label className="text-sm text-gray-400">{fieldConfig.label}</label>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => {
                handleChange(e.target.value);
              }}
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
                  <input
                    type="text"
                    value={item || ''}
                    onChange={(e) => {
                      const newArr = [...(value || [])];
                      newArr[idx] = e.target.value;
                      handleChange(newArr);
                    }}
                    list={`${fieldKey}-options`}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder="Enter value"
                  />
                  {fieldConfig.options && (
                    <datalist id={`${fieldKey}-options`}>
                      {fieldConfig.options.map((opt) => (
                        <option key={opt} value={opt} />
                      ))}
                    </datalist>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      console.log(`[array] delete item ${idx}`);
                      const newArr = value.filter((_, i) => i !== idx);
                      handleChange(newArr);
                    }}
                    className="bg-red-900 hover:bg-red-800 border-red-700 h-10 w-10"
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
                    console.log(`[array] add new item`);
                    handleChange([...(value || []), '']);
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
           {Object.entries(schema.specs).map(([key, config]) => {
             const handleChange = (value) => {
               console.log(`[Specs] onChange for key=${key}, new value:`, value, 'localSpecs:', localSpecs);
               const updated = { ...localSpecs, [key]: value };
               console.log(`[Specs] Updated state:`, updated);
               setLocalSpecs(updated);
               onSpecsChange(updated);
             };
             return renderFieldInput(key, config, localSpecs[key], handleChange);
           })}
        </div>
        </Section>

        <Section
         title="Installation"
         isOpen={expandedSection === 'installation'}
         onToggle={() => setExpandedSection(expandedSection === 'installation' ? 'specs' : 'installation')}
        >
         <div className="space-y-4">
           {Object.entries(schema.installation).map(([key, config]) => {
             const handleChange = (value) => {
               console.log(`[Installation] onChange for key=${key}, new value:`, value, 'localInstallation:', localInstallation);
               const updated = { ...localInstallation, [key]: value };
               console.log(`[Installation] Updated state:`, updated);
               setLocalInstallation(updated);
               onInstallationChange(updated);
             };
             return renderFieldInput(key, config, localInstallation[key], handleChange);
           })}
         </div>
        </Section>
    </>
  );
}