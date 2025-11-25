import React from 'react';
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function RoomSelectDialog({ rooms, onSelect, onCancel, productName }) {
  if (rooms.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
        <div 
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <Home className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Rooms Available</h3>
            <p className="text-sm text-gray-400 mb-6">
              You need to create a room before placing devices on the canvas.
            </p>
            <Button onClick={onCancel} className="bg-blue-600 hover:bg-blue-700">
              Got it
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onCancel} className="border-gray-700 text-gray-300">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}