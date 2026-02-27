import React, { useState } from 'react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ChevronDown, X } from 'lucide-react';
import { getSymbolSchema } from './symbolSchemas';

export default function SpecsPanel({ annotation, onSpecsChange, onClose }) {
  const schema = getSymbolSchema(annotation.symbolId);
  const [expandedSection, setExpandedSection] = useState('specs');

  if (!schema) return null;

  const specs = annotation.specs || {};
  const installation = annotation.installation || {};

  const handleSpecChange = (key, value) => {
    const updated = {
      ...annotation,
      specs: { ...specs, [key]: value }
    };
    onSpecsChange(annotation.id || 0, updated);
  };

  const handleInstallationChange = (key, value) => {
    const updated = {
      ...annotation,
      installation: { ...installation, [key]: value }
    };
    onSpecsChange(annotation.id || 0, updated);
  };

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
            <select
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select {fieldConfig.label}</option>
              {fieldConfig.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
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
                  <select
                    value={item || ''}
                    onChange={(e) => {
                      const newArr = [...(value || [])];
                      newArr[idx] = e.target.value;
                      onChange(newArr);
                    }}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    {fieldConfig.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
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
                  onClick={() => onChange([...(value || []), ''])}
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

  return (
    <div className="fixed right-0 top-[87px] bottom-0 w-96 bg-gray-900 border-l border-gray-800 z-40 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {schema.label} Specs
        </h2>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="text-gray-400 hover:text-white hover:bg-gray-700"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Specifications Section */}
        <Section
          title="Specifications"
          isOpen={expandedSection === 'specs'}
          onToggle={() => setExpandedSection(expandedSection === 'specs' ? 'installation' : 'specs')}
        >
          <div className="space-y-4">
            {Object.entries(schema.specs).map(([key, config]) =>
              renderFieldInput(key, config, specs[key], (value) => handleSpecChange(key, value))
            )}
          </div>
        </Section>

        {/* Installation Section */}
        <Section
          title="Installation"
          isOpen={expandedSection === 'installation'}
          onToggle={() =>
            setExpandedSection(expandedSection === 'installation' ? 'specs' : 'installation')
          }
        >
          <div className="space-y-4">
            {Object.entries(schema.installation).map(([key, config]) =>
              renderFieldInput(key, config, installation[key], (value) =>
                handleInstallationChange(key, value)
              )
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}