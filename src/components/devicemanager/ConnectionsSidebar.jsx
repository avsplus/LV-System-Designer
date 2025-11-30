import React from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Grip } from 'lucide-react';

const connectionTypes = [
  { type: "HDMI", color: "#E74C3C", category: "video" },
  { type: "HDBaseT", color: "#E91E63", category: "video" },
  { type: "Component", color: "#E74C3C", category: "video" },
  { type: "Composite", color: "#E74C3C", category: "video" },
  { type: "VGA", color: "#E74C3C", category: "video" },
  { type: "Optical", color: "#2A7FDB", category: "audio" },
  { type: "Coaxial", color: "#2A7FDB", category: "audio" },
  { type: "RCA", color: "#FFB300", category: "audio" },
  { type: "XLR", color: "#1ABC9C", category: "audio" },
  { type: "Speaker Wire", color: "#8E5C2C", category: "audio" },
  { type: "Subwoofer", color: "#8E5C2C", category: "audio" },
  { type: "3.5mm Jack", color: "#F4D03F", category: "audio" },
  { type: "Ethernet", color: "#27AE60", category: "network" },
  { type: "USB", color: "#2A7FDB", category: "network" },
  { type: "RS232", color: "#7F8C8D", category: "control" },
  { type: "IR", color: "#7F8C8D", category: "control" },
  { type: "Control", color: "#7F8C8D", category: "control" },
  { type: "Power", color: "#FFA500", category: "power" }
];

const categories = [
  { id: "video", label: "Video", color: "#E74C3C" },
  { id: "audio", label: "Audio", color: "#2A7FDB" },
  { id: "network", label: "Network", color: "#27AE60" },
  { id: "control", label: "Control", color: "#7F8C8D" },
  { id: "power", label: "Power", color: "#FFA500" }
];

export default function ConnectionsSidebar() {
  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Connection Types</h2>
        <p className="text-xs text-gray-400 mt-1">Drag to add inputs/outputs</p>
      </div>

      <Droppable droppableId="connections-sidebar" isDropDisabled={true}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto p-3 space-y-4"
          >
            {categories.map((category) => {
              const categoryConnections = connectionTypes.filter(c => c.category === category.id);
              
              return (
                <div key={category.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {category.label}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {categoryConnections.map((conn, index) => {
                      const globalIndex = connectionTypes.findIndex(c => c.type === conn.type);
                      return (
                        <Draggable
                          key={conn.type}
                          draggableId={`connection-${conn.type}`}
                          index={globalIndex}
                        >
                          {(provided, snapshot) => (
                            <>
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab transition-all ${
                                  snapshot.isDragging 
                                    ? 'bg-gray-700 shadow-lg ring-2 ring-blue-500' 
                                    : 'bg-gray-800 hover:bg-gray-750'
                                }`}
                              >
                                <Grip className="w-3 h-3 text-gray-500" />
                                <div 
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: conn.color }}
                                />
                                <span className="text-sm text-white">{conn.type}</span>
                              </div>
                              {snapshot.isDragging && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 opacity-50">
                                  <Grip className="w-3 h-3 text-gray-500" />
                                  <div 
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: conn.color }}
                                  />
                                  <span className="text-sm text-white">{conn.type}</span>
                                </div>
                              )}
                            </>
                          )}
                        </Draggable>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

const getConnectionColor = (type) => {
  const conn = connectionTypes.find(c => c.type === type);
  return conn?.color || "#6b7280";
};

export { connectionTypes, getConnectionColor };