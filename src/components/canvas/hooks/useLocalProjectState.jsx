import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from "@/api/base44Client";
import { trackActivity, ActivityActions } from "../../activity/activityTracker";
import { CATEGORY_ABBREVIATIONS } from '../constants';

// Helper to ensure networkInfo is always defined
const ensureNetworkInfo = (product) => ({
  ...product,
  networkInfo: product.networkInfo || { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' }
});

export default function useLocalProjectState(currentProject, currentUserEmail, markLocalChange) {
  const [rooms, setRooms] = useState(() => {
    const saved = localStorage.getItem('av_canvas_temp_rooms');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [canvasProducts, setCanvasProducts] = useState(() => {
    const saved = localStorage.getItem('av_canvas_temp_products');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [connections, setConnections] = useState(() => {
    const saved = localStorage.getItem('av_canvas_temp_connections');
    return saved ? JSON.parse(saved) : [];
  });

  const lastSavedRef = useRef({ products: null, connections: null, rooms: null });
  const isSavingRef = useRef(false);
  const saveTimeoutRef = useRef(null);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem('av_canvas_temp_products', JSON.stringify(canvasProducts));
  }, [canvasProducts]);

  useEffect(() => {
    localStorage.setItem('av_canvas_temp_connections', JSON.stringify(connections));
  }, [connections]);

  useEffect(() => {
    localStorage.setItem('av_canvas_temp_rooms', JSON.stringify(rooms));
  }, [rooms]);

  // Debounced auto-save to database (800ms delay)
  useEffect(() => {
    if (!currentProject?.id || !currentUserEmail) return;

    const isOwner = currentProject.owner_email === currentUserEmail;
    const isCollaborator = currentProject.shared_with?.includes(currentUserEmail);
    if (!isOwner && !isCollaborator) return;

    const productsJson = JSON.stringify(canvasProducts);
    const connectionsJson = JSON.stringify(connections);
    const roomsJson = JSON.stringify(rooms);

    if (lastSavedRef.current.products === productsJson && 
        lastSavedRef.current.connections === connectionsJson &&
        lastSavedRef.current.rooms === roomsJson) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 800ms
    saveTimeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;
      
      isSavingRef.current = true;
      try {
        markLocalChange?.();
        await base44.entities.AVProject.update(currentProject.id, {
          canvas_products: canvasProducts,
          connections: connections,
          rooms: rooms
        });
        lastSavedRef.current = { products: productsJson, connections: connectionsJson, rooms: roomsJson };
        console.log('Auto-saved project');
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        isSavingRef.current = false;
      }
    }, 800);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [canvasProducts, connections, rooms, currentProject?.id, currentUserEmail, currentProject?.owner_email, currentProject?.shared_with, markLocalChange]);

  const handleAddRoom = useCallback((roomName) => {
    setRooms(prev => [...prev, roomName]);
    if (currentProject?.id) {
      trackActivity(ActivityActions.ADDED_ROOM, currentProject.id, currentProject.name, { room_name: roomName });
    }
  }, [currentProject?.id, currentProject?.name]);

  const handleDeleteRoom = useCallback((roomName) => {
    setRooms(prev => prev.filter(r => r !== roomName));
    setCanvasProducts(prev => prev.filter(cp => cp.room !== roomName));
    setConnections(prev => prev.filter(conn => {
      const fromDevice = canvasProducts.find(cp => cp.instanceId === conn.from);
      const toDevice = canvasProducts.find(cp => cp.instanceId === conn.to);
      return fromDevice?.room !== roomName && toDevice?.room !== roomName;
    }));
    if (currentProject?.id) {
      trackActivity(ActivityActions.REMOVED_ROOM, currentProject.id, currentProject.name, { room_name: roomName });
    }
  }, [canvasProducts, currentProject?.id, currentProject?.name]);

  const addProductToCanvas = useCallback((product, position, room) => {
    const instanceId = `${product.id}_${Date.now()}_${Math.random()}`;
    const catAbbr = CATEGORY_ABBREVIATIONS[product.category] || 'DEV';
    const roomInitial = room ? room.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'UN';
    const roomDevices = canvasProducts.filter(cp => cp.room === room);
    const catCount = roomDevices.filter(cp => cp.product.category === product.category).length + 1;
    const deviceLabel = `${catAbbr}-${roomInitial}-${catCount}`;

    setCanvasProducts(prev => [...prev, {
      instanceId,
      product,
      position,
      label: deviceLabel,
      room: room,
      networkInfo: { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' }
    }]);

    if (currentProject?.id) {
      trackActivity(ActivityActions.ADDED_DEVICE, currentProject.id, currentProject.name, {
        device_name: `${product.brand} ${product.model}`
      });
    }
  }, [canvasProducts, currentProject?.id, currentProject?.name]);

  const handlePositionChange = useCallback((instanceId, newPosition) => {
    setCanvasProducts(prev => prev.map(cp => 
      cp.instanceId === instanceId 
        ? ensureNetworkInfo({ ...cp, position: newPosition })
        : ensureNetworkInfo(cp)
    ));
  }, []);

  const handleNetworkInfoChange = useCallback((instanceId, networkInfo) => {
    setCanvasProducts(prev => prev.map(cp => 
      cp.instanceId === instanceId 
        ? ensureNetworkInfo({ ...cp, networkInfo: networkInfo || { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' } })
        : ensureNetworkInfo(cp)
    ));
  }, []);

  const handleRemoveProduct = useCallback((instanceId) => {
    const removedProduct = canvasProducts.find(cp => cp.instanceId === instanceId);
    setCanvasProducts(prev => prev.filter(cp => cp.instanceId !== instanceId));
    setConnections(prev => prev.filter(c => c.from !== instanceId && c.to !== instanceId));
    
    if (currentProject?.id && removedProduct) {
      trackActivity(ActivityActions.REMOVED_DEVICE, currentProject.id, currentProject.name, {
        device_name: `${removedProduct.product.brand} ${removedProduct.product.model}`
      });
    }
  }, [canvasProducts, currentProject?.id, currentProject?.name]);

  const handleRemoveConnection = useCallback((index) => {
    const removedConnection = connections[index];
    setConnections(prev => prev.filter((_, i) => i !== index));
    
    if (currentProject?.id && removedConnection) {
      trackActivity(ActivityActions.REMOVED_CONNECTION, currentProject.id, currentProject.name, {
        connection_type: removedConnection.type
      });
    }
  }, [connections, currentProject?.id, currentProject?.name]);

  const clearCanvas = useCallback(() => {
    setCanvasProducts([]);
    setConnections([]);
    setRooms([]);
    localStorage.removeItem('av_canvas_temp_products');
    localStorage.removeItem('av_canvas_temp_connections');
    localStorage.removeItem('av_canvas_temp_rooms');
    localStorage.removeItem('av_canvas_temp_project_id');
  }, []);

  const loadProject = useCallback((project) => {
    if (project) {
      setCanvasProducts(project.canvas_products || []);
      setConnections(project.connections || []);
      setRooms(project.rooms || []);
      localStorage.setItem('av_canvas_temp_project_id', project.id);
      lastSavedRef.current = {
        products: JSON.stringify(project.canvas_products || []),
        connections: JSON.stringify(project.connections || []),
        rooms: JSON.stringify(project.rooms || [])
      };
    } else {
      clearCanvas();
    }
  }, [clearCanvas]);

  const handleProjectUpdatedFromSync = useCallback((updatedProject) => {
    setCanvasProducts(updatedProject.canvas_products || []);
    setConnections(updatedProject.connections || []);
    setRooms(updatedProject.rooms || []);
    lastSavedRef.current = {
      products: JSON.stringify(updatedProject.canvas_products || []),
      connections: JSON.stringify(updatedProject.connections || []),
      rooms: JSON.stringify(updatedProject.rooms || [])
    };
  }, []);

  return {
    rooms,
    setRooms,
    canvasProducts,
    setCanvasProducts,
    connections,
    setConnections,
    handleAddRoom,
    handleDeleteRoom,
    addProductToCanvas,
    handlePositionChange,
    handleNetworkInfoChange,
    handleRemoveProduct,
    handleRemoveConnection,
    clearCanvas,
    loadProject,
    handleProjectUpdatedFromSync,
    ensureNetworkInfo
  };
}