import React, { useState } from 'react';
import { X, Trash2, FlipHorizontal, RotateCw, Copy, HelpCircle, CheckSquare, StickyNote, Check, Plus, ChevronDown } from 'lucide-react';
import { getSymbolSchema } from './symbolSchemas';

const ITEM_TYPES = [
  { key: 'question', label: 'Question', icon: HelpCircle, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  { key: 'task', label: 'Task', icon: CheckSquare, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
  { key: 'note', label: 'Note', icon: StickyNote, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
];
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useMediaQuery } from "@/components/mobile/useMediaQuery";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AnnotationDetailsPanel({ 
  annotation, 
  onClose, 
  onUpdate, 
  onDelete,
  onDuplicate,
  index 
}) {
  const [showDelete, setShowDelete] = useState(false);
  const [newItemType, setNewItemType] = useState('question');
  const [newItemText, setNewItemText] = useState('');
  const [activeTab, setActiveTab] = useState('properties');
  const [expandedSection, setExpandedSection] = useState('specs');
  const isMobile = !useMediaQuery('(min-width: 768px)');

  const items = annotation?.items || [];

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    const newItem = { id: Date.now().toString(), type: newItemType, text: newItemText.trim(), completed: false };
    onUpdate(index, { ...annotation, items: [...items, newItem] });
    setNewItemText('');
  };

  const handleToggleItem = (itemId) => {
    const updated = items.map(it => it.id === itemId ? { ...it, completed: !it.completed } : it);
    onUpdate(index, { ...annotation, items: updated });
  };

  const handleDeleteItem = (itemId) => {
    onUpdate(index, { ...annotation, items: items.filter(it => it.id !== itemId) });
  };

  const ItemsSection = () => (
    <div>
      <p className="text-sm text-gray-500 mb-2">Items</p>
      {items.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {items.map((item) => {
            const typeDef = ITEM_TYPES.find(t => t.key === item.type) || ITEM_TYPES[0];
            const Icon = typeDef.icon;
            return (
              <div key={item.id} className={`flex items-start gap-2 p-2 rounded-lg border ${typeDef.bg}`}>
                <button onClick={() => handleToggleItem(item.id)} className="mt-0.5 shrink-0">
                  {item.type === 'task' ? (
                    <div className={`w-4 h-4 rounded border-2 border-green-500 flex items-center justify-center ${item.completed ? 'bg-green-500' : ''}`}>
                      {item.completed && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  ) : (
                    <Icon className={`w-4 h-4 ${typeDef.color}`} />
                  )}
                </button>
                <span className={`text-xs flex-1 leading-relaxed ${item.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>{item.text}</span>
                <button onClick={() => handleDeleteItem(item.id)} className="shrink-0 text-gray-600 hover:text-red-400 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex gap-1.5 mb-1.5">
        {ITEM_TYPES.map(t => (
          <button
            key={t.key}
            onClick={() => setNewItemType(t.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded text-xs border transition-all ${newItemType === t.key ? t.bg + ' ' + t.color : 'border-gray-700 text-gray-500 hover:border-gray-600'}`}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
          placeholder={`Add a ${newItemType}...`}
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <Button size="sm" onClick={handleAddItem} className="h-7 px-2 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );

  if (!annotation) return null;

  const handleSpecsChange = (annotationIndex, updated) => {
    onUpdate(annotationIndex, updated, true);
  };

  const handleColorChange = (e) => {
    onUpdate(index, { ...annotation, color: e.target.value }, true);
  };

  const handleStrokeWidthChange = (value) => {
    onUpdate(index, { ...annotation, strokeWidth: value[0] }, true);
  };

  const handleFillChange = () => {
    onUpdate(index, { ...annotation, fill: !annotation.fill }, true);
  };

  const handleFontSizeChange = (value) => {
    onUpdate(index, { ...annotation, fontSize: value[0] }, true);
  };

  const handleTextChange = (e) => {
    onUpdate(index, { ...annotation, text: e.target.value });
  };

  const handleRadiusChange = (value) => {
    onUpdate(index, { ...annotation, radius: value[0] });
  };

  const handleWidthChange = (value) => {
    onUpdate(index, { ...annotation, width: value[0] });
  };

  const handleHeightChange = (value) => {
    onUpdate(index, { ...annotation, height: value[0] });
  };

  const handleScaleChange = (value) => {
    onUpdate(index, { ...annotation, scale: value[0] });
  };

  const handleFlipHorizontal = () => {
    onUpdate(index, { ...annotation, flipped: !annotation.flipped });
  };

  const handleRotate = () => {
    const currentRotation = annotation.rotation || 0;
    onUpdate(index, { ...annotation, rotation: (currentRotation + 90) % 360 });
  };

  const getAnnotationLabel = () => {
    if (annotation.type === 'text') return 'Text';
    if (annotation.type === 'rectangle') return 'Rectangle';
    if (annotation.type === 'circle') return 'Circle';
    if (annotation.type === 'line') return 'Line';
    if (annotation.type === 'symbol') return `Symbol - ${annotation.symbolId}`;
    return 'Annotation';
  };

  const schema = annotation.type === 'symbol' ? getSymbolSchema(annotation.symbolId) : null;
  
  // Initialize specs/installation from schema defaults if missing
  React.useEffect(() => {
    if (schema && annotation.type === 'symbol') {
      if (!annotation.specs && schema.defaults?.specs) {
        onUpdate(index, { ...annotation, specs: JSON.parse(JSON.stringify(schema.defaults.specs)) }, true);
      }
      if (!annotation.installation && schema.defaults?.installation) {
        onUpdate(index, { ...annotation, installation: JSON.parse(JSON.stringify(schema.defaults.installation)) }, true);
      }
    }
  }, [schema, annotation.type, annotation.symbolId]);

  const specs = annotation.specs || (schema?.defaults?.specs ? JSON.parse(JSON.stringify(schema.defaults.specs)) : {});
  const installation = annotation.installation || (schema?.defaults?.installation ? JSON.parse(JSON.stringify(schema.defaults.installation)) : {});

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
            <Select value={value || ''} onValueChange={onChange} modal={false}>>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder={`Select ${fieldConfig.label}`} />
              </SelectTrigger>
              <SelectContent side="bottom" avoidCollisions={false} className="bg-gray-800 border-gray-700" onCloseAutoFocus={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
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
                    modal={false}
                  >
                    <SelectTrigger className="flex-1 bg-gray-800 border-gray-700 text-white text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent side="bottom" avoidCollisions={false} className="bg-gray-800 border-gray-700" onCloseAutoFocus={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
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

  // Mobile drawer
  if (isMobile) {
    return (
      <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="bg-gray-900 border-t border-gray-800">
          <DrawerHeader className="border-b border-gray-800">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-lg font-semibold text-white">{getAnnotationLabel()}</DrawerTitle>
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DrawerHeader>
          <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
            {/* Mobile content (properties only for now) */}
            {annotation.type === 'symbol' && (
              <>
                <div>
                  <p className="text-sm text-gray-500 mb-2">Symbol</p>
                  <div className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">{annotation.symbolId}</div>
                </div>
                <ItemsSection />
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-500">Size</p>
                    <span className="text-sm text-blue-400 font-medium">{Math.round((annotation.scale || 1) * 100)}%</span>
                  </div>
                  <Slider value={[annotation.scale || 1]} onValueChange={handleScaleChange} min={0.25} max={3} step={0.25} className="w-full" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-500">Rotation</p>
                    <span className="text-sm text-blue-400 font-medium">{annotation.rotation || 0}°</span>
                  </div>
                  <Button onClick={handleRotate} variant="outline" className="w-full bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">
                    <RotateCw className="w-4 h-4 mr-2" />Rotate 90°
                  </Button>
                </div>
                <Button onClick={handleFlipHorizontal} variant="outline" className="w-full bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">
                  <FlipHorizontal className="w-4 h-4 mr-2" />{annotation.flipped ? 'Unflip' : 'Flip'} Horizontal
                </Button>
              </>
            )}
            {annotation.type === 'text' && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Text</p>
                <input type="text" value={annotation.text || ''} onChange={handleTextChange} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" placeholder="Enter text..." />
              </div>
            )}
            {(annotation.type === 'symbol' || annotation.type === 'text' || annotation.type === 'rectangle' || annotation.type === 'circle' || annotation.type === 'line') && (
              <div>
                <p className="text-sm text-gray-500 mb-2">{annotation.type === 'symbol' ? 'Icon Color Overlay' : 'Color'}</p>
                <div className="flex gap-3 items-center">
                  <input type="color" value={annotation.color || '#3b82f6'} onChange={handleColorChange} className="w-12 h-10 rounded cursor-pointer border border-gray-700" />
                  <span className="text-sm text-gray-400">{annotation.color}</span>
                </div>
              </div>
            )}
            {annotation.type !== 'text' && annotation.type !== 'symbol' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-gray-500">Stroke Width</p>
                  <span className="text-sm text-blue-400 font-medium">{annotation.strokeWidth}px</span>
                </div>
                <Slider value={[annotation.strokeWidth || 2]} onValueChange={handleStrokeWidthChange} min={1} max={10} step={0.5} className="w-full" />
              </div>
            )}
            {annotation.type === 'text' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-gray-500">Font Size</p>
                  <span className="text-sm text-blue-400 font-medium">{annotation.fontSize}px</span>
                </div>
                <Slider value={[annotation.fontSize || 16]} onValueChange={handleFontSizeChange} min={8} max={72} step={1} className="w-full" />
              </div>
            )}
            {annotation.type !== 'symbol' && <ItemsSection />}
          </div>
          <div className="border-t border-gray-800 p-4 space-y-2 pb-8">
            <Button onClick={onDuplicate} variant="outline" className="w-full bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white h-12 text-base">
              <Copy className="w-5 h-5 mr-2" />
              Duplicate
            </Button>
            <Button onClick={() => setShowDelete(true)} className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-base">
              <Trash2 className="w-5 h-5 mr-2" />
              Delete Annotation
            </Button>
          </div>
          {showDelete && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mx-4 max-w-sm">
                <p className="text-white mb-4 text-base">Delete this annotation?</p>
                <div className="flex gap-3">
                  <Button onClick={() => setShowDelete(false)} variant="outline" className="flex-1 bg-gray-700 hover:bg-gray-600 text-white border-gray-600 h-11">
                    Cancel
                  </Button>
                  <Button onClick={() => { onDelete(index); onClose(); }} className="flex-1 bg-red-600 hover:bg-red-700 h-11">
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop sidebar with tabs
  return (
    <div className="fixed right-0 top-[87px] bottom-0 w-80 bg-gray-900 border-l border-gray-800 z-40 flex flex-col overflow-hidden">
      {/* Header with Tabs */}
      <div className="border-b border-gray-800">
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">{getAnnotationLabel()}</h2>
          <Button size="icon" variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-gray-700">
            <X className="w-4 h-4" />
          </Button>
        </div>
        {annotation.type === 'symbol' && (
          <div className="flex gap-0 px-4">
            <button
              onClick={() => setActiveTab('properties')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'properties'
                  ? 'text-blue-400 border-blue-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              Properties
            </button>
            <button
              onClick={() => setActiveTab('specs')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'specs'
                  ? 'text-blue-400 border-blue-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              Specs & Install
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <>
            {annotation.type === 'symbol' && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Symbol</p>
                <div className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">{annotation.symbolId}</div>
              </div>
            )}

            {annotation.type === 'symbol' && <ItemsSection />}

            {annotation.type === 'symbol' && (
              <>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-500">Size</p>
                    <span className="text-sm text-blue-400 font-medium">{Math.round((annotation.scale || 1) * 100)}%</span>
                  </div>
                  <Slider value={[annotation.scale || 1]} onValueChange={handleScaleChange} min={0.25} max={3} step={0.25} className="w-full" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-500">Rotation</p>
                    <span className="text-sm text-blue-400 font-medium">{annotation.rotation || 0}°</span>
                  </div>
                  <Button onClick={handleRotate} variant="outline" className="w-full bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">
                    <RotateCw className="w-4 h-4 mr-2" />Rotate 90°
                  </Button>
                </div>
                <Button onClick={handleFlipHorizontal} variant="outline" className="w-full bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">
                  <FlipHorizontal className="w-4 h-4 mr-2" />{annotation.flipped ? 'Unflip' : 'Flip'} Horizontal
                </Button>
              </>
            )}

            {annotation.type === 'text' && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Text</p>
                <input type="text" value={annotation.text || ''} onChange={handleTextChange} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" placeholder="Enter text..." />
              </div>
            )}

            {(annotation.type === 'symbol' || annotation.type === 'text' || annotation.type === 'rectangle' || annotation.type === 'circle' || annotation.type === 'line') && (
              <div>
                <p className="text-sm text-gray-500 mb-2">{annotation.type === 'symbol' ? 'Icon Color Overlay' : 'Color'}</p>
                <div className="flex gap-3 items-center">
                  <input type="color" value={annotation.color || '#3b82f6'} onChange={handleColorChange} className="w-12 h-10 rounded cursor-pointer border border-gray-700" />
                  <span className="text-sm text-gray-400">{annotation.color}</span>
                </div>
              </div>
            )}

            {annotation.type !== 'text' && annotation.type !== 'symbol' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-gray-500">Stroke Width</p>
                  <span className="text-sm text-blue-400 font-medium">{annotation.strokeWidth}px</span>
                </div>
                <Slider value={[annotation.strokeWidth || 2]} onValueChange={handleStrokeWidthChange} min={1} max={10} step={0.5} className="w-full" />
              </div>
            )}

            {annotation.type !== 'text' && annotation.type !== 'line' && annotation.type !== 'symbol' && (
              <div className="flex items-center gap-3 py-2">
                <input type="checkbox" id="fill" checked={annotation.fill || false} onChange={handleFillChange} className="w-4 h-4 rounded border-gray-600 cursor-pointer accent-blue-500" />
                <label htmlFor="fill" className="text-sm text-gray-300 cursor-pointer">Fill Shape</label>
              </div>
            )}

            {annotation.type === 'text' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-gray-500">Font Size</p>
                  <span className="text-sm text-blue-400 font-medium">{annotation.fontSize}px</span>
                </div>
                <Slider value={[annotation.fontSize || 16]} onValueChange={handleFontSizeChange} min={8} max={72} step={1} className="w-full" />
              </div>
            )}

            {annotation.type === 'circle' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-gray-500">Radius</p>
                  <span className="text-sm text-blue-400 font-medium">{Math.round(annotation.radius || 0)}px</span>
                </div>
                <Slider value={[annotation.radius || 0]} onValueChange={handleRadiusChange} min={5} max={500} step={1} className="w-full" />
              </div>
            )}

            {annotation.type === 'rectangle' && (
              <>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-500">Width</p>
                    <span className="text-sm text-blue-400 font-medium">{Math.round(annotation.width || 0)}px</span>
                  </div>
                  <Slider value={[annotation.width || 0]} onValueChange={handleWidthChange} min={10} max={500} step={1} className="w-full" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-500">Height</p>
                    <span className="text-sm text-blue-400 font-medium">{Math.round(annotation.height || 0)}px</span>
                  </div>
                  <Slider value={[annotation.height || 0]} onValueChange={handleHeightChange} min={10} max={500} step={1} className="w-full" />
                </div>
              </>
            )}

            {annotation.type !== 'symbol' && <ItemsSection />}
          </>
        )}

        {/* Specs & Install Tab */}
        {activeTab === 'specs' && schema && (
          <>
            <Section
              title="Specifications"
              isOpen={expandedSection === 'specs'}
              onToggle={() => setExpandedSection(expandedSection === 'specs' ? 'installation' : 'specs')}
            >
              <div className="space-y-4">
                {Object.entries(schema.specs).map(([key, config]) =>
                  renderFieldInput(key, config, specs[key], (value) => {
                    const updated = { ...annotation, specs: { ...specs, [key]: value } };
                    handleSpecsChange(index, updated);
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
                    const updated = { ...annotation, installation: { ...installation, [key]: value } };
                    handleSpecsChange(index, updated);
                  })
                )}
              </div>
            </Section>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="border-t border-gray-800 p-4 space-y-2">
        <Button onClick={onDuplicate} variant="outline" className="w-full bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">
          <Copy className="w-4 h-4 mr-2" />
          Duplicate
        </Button>
        <Button onClick={() => setShowDelete(true)} className="w-full bg-red-600 hover:bg-red-700 text-white">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Annotation
        </Button>
      </div>

      {/* Delete Confirmation */}
      {showDelete && (
        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-white mb-4 text-sm">Delete this annotation?</p>
            <div className="flex gap-2">
              <Button onClick={() => setShowDelete(false)} variant="outline" className="flex-1 bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
                Cancel
              </Button>
              <Button onClick={() => { onDelete(index); onClose(); }} className="flex-1 bg-red-600 hover:bg-red-700">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}