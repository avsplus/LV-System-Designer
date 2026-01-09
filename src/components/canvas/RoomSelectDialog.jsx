import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Plus, AlertCircle } from "lucide-react";

export default function RoomSelectDialog({ rooms, onSelect, onCancel, productName, onCreateRoom }) {
  const [showNewRoom, setShowNewRoom] = useState(rooms.length === 0);
  const [newRoomName, setNewRoomName] = useState('');
  const [error, setError] = useState('');
  const noRoomsExist = rooms.length === 0;

  const handleCreateRoom = () => {
    const trimmedName = newRoomName.trim();
    if (!trimmedName) {
      setError('Room name cannot be empty');
      return;
    }
    if (rooms.some(r => r.toLowerCase() === trimmedName.toLowerCase())) {
      setError('Room name already exists');
      return;
    }
    const roomId = onCreateRoom(trimmedName);
    onSelect(roomId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div 
        className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold text-white mb-2">Select Room</h3>
        <p className="text-sm text-gray-400 mb-4">
          Choose a room for <span className="text-white font-medium">{productName}</span>
        </p>

        {noRoomsExist && (
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-200">
              Create a room first before adding devices. All devices must be assigned to a room.
            </p>
          </div>
        )}

        {showNewRoom ? (
          <div className="space-y-3">
            <div>
              <Input
                placeholder="Enter new room name..."
                value={newRoomName}
                onChange={(e) => {
                  setNewRoomName(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') handleCreateRoom();
                }}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                autoFocus
              />
              {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            </div>
            <div className="flex gap-2">
              {rooms.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowNewRoom(false)}
                  className="flex-1 border-gray-700 text-gray-300"
                >
                  Back to List
                </Button>
              )}
              <Button
                onClick={handleCreateRoom}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create & Select
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {rooms.map((room) => (
                <button
                  key={room}
                  onClick={() => onSelect(room)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left"
                >
                  <Home className="w-5 h-5 text-gray-400" />
                  <span className="text-white font-medium">{room}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowNewRoom(true)}
              className="w-full flex items-center gap-3 px-4 py-3 mt-2 border border-dashed border-gray-700 hover:border-gray-600 rounded-lg transition-colors text-left"
            >
              <Plus className="w-5 h-5 text-blue-400" />
              <span className="text-blue-400 font-medium">Create New Room</span>
            </button>
          </>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onCancel} className="border-gray-700 text-gray-300">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}