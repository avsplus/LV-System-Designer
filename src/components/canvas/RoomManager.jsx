import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Home, ChevronDown, ChevronRight, Trash2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const categoryTextColors = {
  televisions: "text-blue-400",
  projectors: "text-purple-400",
  projector_screens: "text-fuchsia-400",
  video_distribution: "text-cyan-400",
  matrix_switchers: "text-teal-400",
  audio_streamers: "text-pink-400",
  media_streamers: "text-rose-400",
  speakers: "text-green-400",
  soundbars: "text-lime-400",
  subwoofers: "text-red-400",
  stereo_amps: "text-orange-400",
  multizone_amps: "text-amber-400",
  surround_processors: "text-yellow-400",
  av_receivers: "text-emerald-400"
};

export default function RoomManager({ 
  rooms, 
  onAddRoom, 
  onDeleteRoom, 
  canvasProducts, 
  onClose,
  onDeviceClick,
  selectedRoom,
  onSelectRoom,
  onDeviceRoomChange,
  onReorderDevices,
  keepOpen = false
}) {
  const [newRoomName, setNewRoomName] = useState('');
  const [expandedRooms, setExpandedRooms] = useState({});
  const [error, setError] = useState('');
  const [draggedDevice, setDraggedDevice] = useState(null);
  const [dragOverRoom, setDragOverRoom] = useState(null);
  const [dragOverDeviceId, setDragOverDeviceId] = useState(null);

  const handleAddRoom = () => {
    const trimmedName = newRoomName.trim();
    if (!trimmedName) {
      setError('Room name cannot be empty');
      return;
    }
    if (rooms.some(r => r.toLowerCase() === trimmedName.toLowerCase())) {
      setError('Room name already exists');
      return;
    }
    onAddRoom(trimmedName);
    setNewRoomName('');
    setError('');
  };

  const toggleRoom = (room) => {
    setExpandedRooms(prev => ({
      ...prev,
      [room]: !prev[room]
    }));
  };

  const getDevicesInRoom = (room) => {
    return canvasProducts.filter(cp => cp.room === room);
  };

  return (
    <div className="fixed right-0 top-[81px] bottom-0 w-80 bg-gray-900 border-l border-gray-800 z-40 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Rooms</h2>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
            <div className="flex gap-2">
              <Input
                placeholder="New room name..."
                value={newRoomName}
                onChange={(e) => {
                  setNewRoomName(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') handleAddRoom();
                }}
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
              />
              <Button
                size="icon"
                onClick={handleAddRoom}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </div>

          <div className="space-y-2">
        {rooms.length === 0 ? (
          <div className="text-center py-8">
            <Home className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No rooms created yet</p>
            <p className="text-gray-600 text-xs mt-1">Add a room to start placing devices</p>
          </div>
        ) : (
          rooms.map((room) => {
            const devices = getDevicesInRoom(room);
            const isExpanded = expandedRooms[room];
            const isSelected = selectedRoom === room;

            return (
              <div key={room} className="space-y-1">
                <div
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    dragOverRoom === room 
                      ? 'bg-green-600/30 border border-green-500/50' 
                      : isSelected 
                        ? 'bg-blue-600/20 border border-blue-500/50' 
                        : 'bg-gray-800/50 hover:bg-gray-800 border border-transparent'
                  }`}
                  onClick={() => onSelectRoom(isSelected ? null : room)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedDevice && draggedDevice.room !== room) {
                      setDragOverRoom(room);
                    }
                  }}
                  onDragLeave={() => setDragOverRoom(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedDevice && draggedDevice.room !== room && onDeviceRoomChange) {
                      onDeviceRoomChange(draggedDevice.instanceId, room);
                    }
                    setDraggedDevice(null);
                    setDragOverRoom(null);
                  }}
                >
                  <div className="flex items-center gap-2 flex-1" onClick={(e) => { e.stopPropagation(); toggleRoom(room); }}>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    <Home className="w-4 h-4 text-gray-300" />
                    <span className="text-white text-sm font-medium">{room}</span>
                    <Badge className="bg-gray-700 text-gray-300 text-xs">
                      {devices.length}
                    </Badge>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (devices.length > 0) {
                        if (confirm(`Delete "${room}" and remove ${devices.length} device(s) from canvas?`)) {
                          onDeleteRoom(room);
                        }
                      } else {
                        onDeleteRoom(room);
                      }
                    }}
                    className="h-6 w-6 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                {isExpanded && devices.length > 0 && (
                  <div className="pl-6 space-y-1">
                    {devices.map((device, deviceIndex) => (
                      <div
                        key={device.instanceId}
                        draggable
                        onDragStart={(e) => {
                          setDraggedDevice(device);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggedDevice(null);
                          setDragOverRoom(null);
                          setDragOverDeviceId(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (draggedDevice && draggedDevice.instanceId !== device.instanceId && draggedDevice.room === device.room) {
                            setDragOverDeviceId(device.instanceId);
                          }
                        }}
                        onDragLeave={(e) => {
                          e.stopPropagation();
                          setDragOverDeviceId(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (draggedDevice && draggedDevice.room === device.room && draggedDevice.instanceId !== device.instanceId && onReorderDevices) {
                            onReorderDevices(draggedDevice.instanceId, device.instanceId, room);
                          }
                          setDraggedDevice(null);
                          setDragOverRoom(null);
                          setDragOverDeviceId(null);
                        }}
                        onClick={() => onDeviceClick(device)}
                        className={`px-3 py-2 bg-gray-800/30 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors flex items-start gap-2 ${
                          draggedDevice?.instanceId === device.instanceId ? 'opacity-50' : ''
                        } ${dragOverDeviceId === device.instanceId ? 'border-t-2 border-blue-500' : ''}`}
                      >
                        <GripVertical className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0 cursor-grab" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs capitalize ${categoryTextColors[device.product.category] || 'text-gray-400'}`}>
                            {device.product.category?.replace(/_/g, ' ')}
                          </p>
                          <p className="text-sm font-medium text-white">
                            {device.label} <span className="text-gray-400 font-normal">— {device.product.model}</span>
                          </p>
                          {device.product.description && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {device.product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && devices.length === 0 && (
                  <div className="pl-6">
                    <p className="text-xs text-gray-600 px-3 py-2">No devices in this room</p>
                  </div>
                )}
              </div>
            );
          })
        )}
          </div>
        </div>
      </div>
    </div>
  );
}