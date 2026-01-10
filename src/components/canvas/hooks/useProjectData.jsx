import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from "@/api/base44Client";
import { trackActivity, ActivityActions } from "../../activity/activityTracker";

// Category abbreviations for device labels
const CATEGORY_ABBREVIATIONS = {
  televisions: 'TV',
  projectors: 'PJ',
  projector_screens: 'SCR',
  video_distribution: 'VD',
  matrix_switchers: 'MX',
  audio_streamers: 'AS',
  media_streamers: 'MS',
  speakers: 'SPK',
  soundbars: 'SB',
  subwoofers: 'SUB',
  stereo_amps: 'AMP',
  multizone_amps: 'MZA',
  surround_processors: 'SP',
  av_receivers: 'AVR',
  network_switches: 'SW',
  control_processors: 'CP',
  hdmi_extenders: 'EXT'
};

// Helper to ensure networkInfo is always defined
export const ensureNetworkInfo = (product) => ({
  ...product,
  networkInfo: product.networkInfo || { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' }
});

export default function useProjectData(currentProject, currentUserEmail, markLocalChange, floorplans) {
  const [rooms, setRooms] = useState([]);
  const [canvasProducts, setCanvasProducts] = useState([]);
  const [connections, setConnections] = useState([]);
  
  const lastSavedRef = useRef({ products: null, connections: null, rooms: null, floorplans: null });
  const isSavingRef = useRef(false);

  // Clear state on mount
  useEffect(() => {
    localStorage.removeItem('av_canvas_temp_project_id');
    localStorage.removeItem('av_canvas_temp_products');
    localStorage.removeItem('av_canvas_temp_connections');
    localStorage.removeItem('av_canvas_temp_rooms');
    setCanvasProducts([]);
    setConnections([]);
    setRooms([]);
  }, []);

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

  // Track if project has been loaded to prevent saving empty state
  const projectLoadedRef = useRef(false);

  // Auto-save to database instantly (with 100ms debounce for batching)
  useEffect(() => {
    if (!currentProject?.id || !currentUserEmail) return;

    // Don't save if the project hasn't been loaded yet (prevents saving empty state)
    if (!projectLoadedRef.current) return;

    const isOwner = currentProject.owner_email === currentUserEmail;
    const isCollaborator = currentProject.shared_with?.includes(currentUserEmail);
    if (!isOwner && !isCollaborator) return;

    const productsJson = JSON.stringify(canvasProducts);
    const connectionsJson = JSON.stringify(connections);
    const roomsJson = JSON.stringify(rooms);
    const floorplansJson = JSON.stringify(floorplans || []);

    if (lastSavedRef.current.products === productsJson && 
        lastSavedRef.current.connections === connectionsJson &&
        lastSavedRef.current.rooms === roomsJson &&
        lastSavedRef.current.floorplans === floorplansJson) {
      return;
    }

    if (isSavingRef.current) return;

    const saveTimer = setTimeout(() => {
      const saveProject = async () => {
        isSavingRef.current = true;
        try {
          await base44.entities.AVProject.update(currentProject.id, {
            canvas_products: canvasProducts,
            connections: connections,
            rooms: rooms,
            floorplans: floorplans || []
          });
          lastSavedRef.current = { products: productsJson, connections: connectionsJson, rooms: roomsJson, floorplans: floorplansJson };
          console.log('Auto-saved project');
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          isSavingRef.current = false;
        }
      };

      saveProject();
    }, 100);

    return () => clearTimeout(saveTimer);
  }, [canvasProducts, connections, rooms, floorplans, currentProject?.id, currentUserEmail, currentProject?.owner_email, currentProject?.shared_with, markLocalChange]);

  // Load project data
  const loadProject = useCallback((project, setFloorplansCallback) => {
    if (project) {
      setCanvasProducts(project.canvas_products || []);
      setConnections(project.connections || []);
      
      // Migrate old string-based rooms to new object format
      const loadedRooms = (project.rooms || []).map(room => {
        if (typeof room === 'string') {
          // Old format: convert string to object
          return {
            id: `${Date.now()}_${Math.random()}`,
            name: room,
            floorplanId: null
          };
        }
        // New format: already an object
        return room;
      });
      
      setRooms(loadedRooms);
      
      // Load floorplans if callback provided
      if (setFloorplansCallback && project.floorplans) {
        setFloorplansCallback(project.floorplans);
      }
      
      localStorage.setItem('av_canvas_temp_project_id', project.id);
      lastSavedRef.current = {
        products: JSON.stringify(project.canvas_products || []),
        connections: JSON.stringify(project.connections || []),
        rooms: JSON.stringify(loadedRooms),
        floorplans: JSON.stringify(project.floorplans || [])
      };
      // Mark that project has been loaded, safe to auto-save now
      projectLoadedRef.current = true;
    } else {
      projectLoadedRef.current = false;
      setCanvasProducts([]);
      setConnections([]);
      setRooms([]);
      if (setFloorplansCallback) {
        setFloorplansCallback([]);
      }
      localStorage.removeItem('av_canvas_temp_project_id');
      lastSavedRef.current = { products: null, connections: null, rooms: null, floorplans: null };
    }
  }, []);

  // Handle sync updates from collaborators
  const handleProjectUpdatedFromSync = useCallback((updatedProject, setFloorplansCallback) => {
    setCanvasProducts(updatedProject.canvas_products || []);
    setConnections(updatedProject.connections || []);
    setRooms(updatedProject.rooms || []);
    if (setFloorplansCallback) {
      setFloorplansCallback(updatedProject.floorplans || []);
    }
    lastSavedRef.current = {
      products: JSON.stringify(updatedProject.canvas_products || []),
      connections: JSON.stringify(updatedProject.connections || []),
      rooms: JSON.stringify(updatedProject.rooms || []),
      floorplans: JSON.stringify(updatedProject.floorplans || [])
    };
  }, []);

  // Room operations
  const handleAddRoom = useCallback((roomName, floorplanId) => {
    const newRoom = {
      id: `${Date.now()}_${Math.random()}`,
      name: roomName,
      floorplanId: floorplanId
    };
    setRooms(prev => [...prev, newRoom]);
    if (currentProject?.id) {
      trackActivity(ActivityActions.ADDED_ROOM, currentProject.id, currentProject.name, { room_name: roomName });
    }
    return newRoom;
  }, [currentProject]);

  const handleDeleteRoom = useCallback((roomId) => {
    const room = rooms.find(r => r.id === roomId);
    setRooms(prev => prev.filter(r => r.id !== roomId));
    if (room) {
      setCanvasProducts(prev => prev.filter(cp => cp.room !== roomId));
      setConnections(prev => prev.filter(conn => {
        const fromDevice = canvasProducts.find(cp => cp.instanceId === conn.from);
        const toDevice = canvasProducts.find(cp => cp.instanceId === conn.to);
        return fromDevice?.room !== roomId && toDevice?.room !== roomId;
      }));
    }
    if (currentProject?.id && room) {
      trackActivity(ActivityActions.REMOVED_ROOM, currentProject.id, currentProject.name, { room_name: room.name });
    }
  }, [currentProject, canvasProducts, rooms]);

  // Product operations
  const addProductToCanvas = useCallback((product, position, roomId) => {
    const instanceId = `${product.id}_${Date.now()}_${Math.random()}`;
    const catAbbr = CATEGORY_ABBREVIATIONS[product.category] || 'DEV';
    const room = rooms.find(r => r.id === roomId);
    const roomInitial = room?.name ? room.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'UN';
    const roomDevices = canvasProducts.filter(cp => cp.room === roomId);
    const catCount = roomDevices.filter(cp => cp.product.category === product.category).length + 1;
    const deviceLabel = `${catAbbr}-${roomInitial}-${catCount}`;

    setCanvasProducts(prev => [...prev, {
      instanceId,
      product,
      position,
      label: deviceLabel,
      room: roomId,
      networkInfo: { sw: '', port: '', ip: '000.000.000.000', mac: '00:00:00:00:00:00' }
    }]);

    if (currentProject?.id) {
      trackActivity(ActivityActions.ADDED_DEVICE, currentProject.id, currentProject.name, {
        device_name: `${product.brand} ${product.model}`
      });
    }
  }, [currentProject, canvasProducts, rooms]);

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
    return removedProduct;
  }, [currentProject, canvasProducts]);

  // Connection operations
  const handleRemoveConnection = useCallback((index) => {
    const removedConnection = connections[index];
    setConnections(prev => prev.filter((_, i) => i !== index));
    
    if (currentProject?.id && removedConnection) {
      trackActivity(ActivityActions.REMOVED_CONNECTION, currentProject.id, currentProject.name, {
        connection_type: removedConnection.type
      });
    }
  }, [currentProject, connections]);

  const clearCanvas = useCallback(() => {
    setCanvasProducts([]);
    setConnections([]);
    setRooms([]);
    localStorage.removeItem('av_canvas_temp_products');
    localStorage.removeItem('av_canvas_temp_connections');
    localStorage.removeItem('av_canvas_temp_rooms');
    localStorage.removeItem('av_canvas_temp_project_id');
  }, []);

  return {
    rooms,
    setRooms,
    canvasProducts,
    setCanvasProducts,
    connections,
    setConnections,
    loadProject,
    handleProjectUpdatedFromSync,
    handleAddRoom,
    handleDeleteRoom,
    addProductToCanvas,
    handlePositionChange,
    handleNetworkInfoChange,
    handleRemoveProduct,
    handleRemoveConnection,
    clearCanvas,
    lastSavedRef
  };
}