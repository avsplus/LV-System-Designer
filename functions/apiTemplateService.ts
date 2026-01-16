import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const API_KEY = Deno.env.get('APITEMPLATE_API_KEY');

// Helper to get cable color by type
function getCableColor(type) {
  const colors = {
    'HDMI': [231, 76, 60],
    'HDBaseT': [233, 30, 99],
    'Optical': [42, 127, 219],
    'Optical/TOSLINK': [42, 127, 219],
    'RCA': [255, 179, 0],
    'XLR': [26, 188, 156],
    'Speaker Wire': [142, 92, 44],
    'Ethernet': [39, 174, 96],
    'USB': [42, 127, 219],
    'Coaxial': [42, 127, 219],
    'Component': [231, 76, 60],
    'Composite': [231, 76, 60],
    'VGA': [231, 76, 60],
    'RS232': [127, 140, 141],
    'Control': [127, 140, 141],
    'IR': [127, 140, 141],
    'Subwoofer': [142, 92, 44],
    '3.5mm Jack': [255, 179, 0],
    'Power': [255, 165, 0]
  };
  return colors[type] || [107, 114, 128];
}

// Helper to validate image URLs via HEAD request
async function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) return false;
    const type = res.headers.get("content-type");
    return !!type && type.startsWith("image/");
  } catch {
    return false;
  }
}

// Symbol icon mapping to PNG URLs
      const SYMBOL_ICONS = {
        'ELEC-1G': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/227d623c7_1GangOutlet.png',
        'ELEC-2G': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/f2f62ac3e_2GangOutlet.png',
        'ELEC-4G': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/906dd9057_4GangOutlet.png',
        'AV-AVO': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/9517c489b_AVOutlet_1.png',
        'NET-DP': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/99333e95d_PhoneData.png',
        'NET-DO': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/4de12c8e1_DataOutlet.png',
        'NET-PO': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/fb6f727f5_PhoneOutlet.png',
        'AV-SPK': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/9e3a38c86_Speaker.png',
        'NET-WAP': 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/04cee7fda_WirelessAP.png'
      };

// Helper to make API requests to APITemplate.io
      async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'X-API-KEY': API_KEY,
    'Content-Type': 'application/json'
  };

  const options = { method, headers };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const url = `https://rest.apitemplate.io${endpoint}`;
  console.log('APITemplate request:', url, method);
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('APITemplate error response:', errorText);
    throw new Error(`APITemplate error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  console.log('=== APITEMPLATE SERVICE CALLED ===');
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!API_KEY) {
      return Response.json({ error: 'APITemplate API key not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { action, ...params } = body;
    console.log('ACTION:', action, 'EXPORT_TYPE:', params.exportType);

    switch (action) {
      case 'listTemplates': {
        const result = await apiRequest('/v2/list-templates');
        return Response.json(result);
      }

      case 'getAccountInfo': {
        const result = await apiRequest('/v2/account-info');
        return Response.json(result);
      }

      case 'generateInstallationPackage': {
        const { canvasProducts = [], connections = [], rooms = [], floorplans = [], arrows = [], annotations = [], projectName, clientName, location, orgSettings, exportType = 'installer' } = params;
        const TEMPLATE_ID = 'c0377b23582ce40c';
        
        // Export type flags
        const isInstaller = exportType === 'installer' || exportType === 'documentation';
        const isClient = exportType === 'client' || exportType === 'documentation';
        const showWireSchedule = isInstaller;
        const showPricing = isClient;
        const showLabor = isClient;
        
        console.log('FLAGS: isInstaller=' + isInstaller + ', isClient=' + isClient);

        // Fetch wire pricing for cable labor calculation
        let wirePricingData = [];
        try {
          wirePricingData = await base44.asServiceRole.entities.WirePricing.list();
        } catch (e) {
          console.log('Could not fetch wire pricing:', e.message);
        }

        // Build template data
        const uniqueRooms = [...new Set(canvasProducts.map(cp => cp.room).filter(Boolean))];
        if (uniqueRooms.length === 0) uniqueRooms.push('Unassigned');

        const exportTypeTitle = exportType === 'client' ? 'Client Proposal' : exportType === 'documentation' ? 'Full Documentation' : 'Installation Package';
        
        // Calculate totals
        const totalDevicePrice = canvasProducts.reduce((sum, cp) => sum + (cp.product?.price || 0), 0);
        const totalInstallLabor = canvasProducts.reduce((sum, cp) => sum + (cp.product?.installation_labor || 0), 0);
        const totalConfigLabor = canvasProducts.reduce((sum, cp) => sum + (cp.product?.configuration_labor || 0), 0);
        
        let cableLaborTotal = 0;
        let terminationTotal = 0;
        connections.forEach(conn => {
          const wireType = conn.type || '';
          const pricing = wirePricingData.find(wp => wp.wire_type?.toLowerCase() === wireType.toLowerCase());
          if (pricing?.labor_price_per_run) cableLaborTotal += pricing.labor_price_per_run;
          if ((wireType.toLowerCase() === 'ethernet' || wireType.toLowerCase() === 'hdbaset') && pricing?.termination_price) {
            terminationTotal += pricing.termination_price * 2;
          }
        });
        
        const laborRates = orgSettings?.labor_rates || {};
        const designEngineeringRate = laborRates.design_engineering_rate || 0;
        const equipmentInstallationTotal = totalInstallLabor;
        const cableTerminationTotal = cableLaborTotal + terminationTotal;
        const systemProgrammingTotal = totalConfigLabor;
        const laborSubtotal = designEngineeringRate + equipmentInstallationTotal + cableTerminationTotal + systemProgrammingTotal;
        const grandTotal = totalDevicePrice + laborSubtotal;

        const networkedCount = canvasProducts.filter(cp => cp.networkInfo?.ip && cp.networkInfo.ip !== '000.000.000.000').length;

        // Build HTML parts
        let bodyHtml = '';

        // Build table of contents based on export type
        let tocItems = ['Project Overview'];
        if (floorplans && floorplans.filter(f => f.visible).length > 0) {
          tocItems.push('Floorplans');
        }
        if (isClient) {
          tocItems.push('How Your System Works', 'Scope of Work', 'Equipment by Room', 'Bill of Materials');
        }
        if (isInstaller) {
          tocItems.push('Device Documentation', 'Wire Schedule');
        }
        tocItems.push(isClient ? 'Proposal Acceptance' : 'Installation Sign-off');

        const tocHtml = tocItems.map((item, i) => `<li>${i + 1}. ${item}</li>`).join('');

        // Part 1: Project Overview (always)
        bodyHtml += `
        <section class="keep-together">
        <h1>Project Overview</h1>
        <div class="highlight">
        <h3>Project Details</h3>
        <p><strong>Client:</strong> ${clientName || 'N/A'}</p>
        <p><strong>Location:</strong> ${location || 'N/A'}</p>
        <p><strong>Prepared by:</strong> ${user.full_name || user.email}</p>
        <p><strong>Document Type:</strong> ${exportTypeTitle}</p>
        </div>
        <div class="info-box">
        <div class="info-box-title">System Summary</div>
        <p><strong>${canvasProducts.length}</strong> Devices · <strong>${connections.length}</strong> Connections · <strong>${uniqueRooms.length}</strong> Rooms</p>
        </div>
        </section>
        <div class="page-break"></div>
        <section>
        <h1>Table of Contents</h1>
        <ol style="margin-left:20px; font-size:14px; line-height:2;">${tocHtml}</ol>
        </section>
        <div class="page-break"></div>`;

        // Floorplans section (if available)
        if (floorplans && floorplans.length > 0) {
          const visibleFloorplans = floorplans.filter(f => f.visible);
          if (visibleFloorplans.length > 0) {
            bodyHtml += `<section><h1>Floorplans</h1><div class="info-box"><div class="info-box-title">Site Layout</div><p>The following pages show device and wiring locations on the actual floor plans.</p></div></section><div class="page-break"></div>`;
            
            for (const fp of visibleFloorplans) {
              // Calculate overlay positions for devices and connections
              const fpPos = fp.position || { x: 0, y: 0 };
              const fpScale = fp.scale || 1;
              console.log('Floorplan:', fp.name, 'fpScale:', fpScale, 'fpPos:', fpPos, 'imageSize:', fp.imageWidth, 'x', fp.imageHeight);
              console.log('Canvas dimensions on screen:', fp.imageWidth * fpScale, 'x', fp.imageHeight * fpScale);
              
              // Direct coordinate mapping: positions are already in the same space as the floorplan
              // No scale transformation needed - positions map 1:1 to image
              const DEVICE_CARD_WIDTH = 320;
              const DEVICE_CARD_HEIGHT = 280;
              
              // Build device overlay HTML
              let devicesOverlay = '';
              console.log('DEVICE MAPPING - fpPos:', fpPos, 'fpScale:', fpScale);
              console.log('Total devices in project:', canvasProducts.length);
              console.log('Floorplan world bounds:', { 
                minX: fpPos.x, 
                maxX: fpPos.x + (fp.imageWidth * fpScale), 
                minY: fpPos.y, 
                maxY: fpPos.y + (fp.imageHeight * fpScale) 
              });
              canvasProducts.forEach(cp => {
                const deviceCenterX = cp.position.x + DEVICE_CARD_WIDTH / 2;
                const deviceCenterY = cp.position.y + DEVICE_CARD_HEIGHT / 2;
                console.log('Device:', cp.label, 'rawPos:', cp.position, 'centerPos:', deviceCenterX, deviceCenterY);
                // Convert canvas world coordinates to floorplan image pixels
                const imgPixelX = (deviceCenterX - fpPos.x) / fpScale;
                const imgPixelY = (deviceCenterY - fpPos.y) / fpScale;
                const percentX = (imgPixelX / fp.imageWidth) * 100;
                const percentY = (imgPixelY / fp.imageHeight) * 100;
                console.log('  -> imgPixel:', imgPixelX, imgPixelY, 'percent:', percentX.toFixed(2) + '%', percentY.toFixed(2) + '%', 'inBounds:', imgPixelX >= 0 && imgPixelY >= 0 && imgPixelX <= fp.imageWidth && imgPixelY <= fp.imageHeight);
                
                if (imgPixelX < 0 || imgPixelY < 0 || imgPixelX > fp.imageWidth || imgPixelY > fp.imageHeight) return;
                
                const percentX = (imgPixelX / fp.imageWidth) * 100;
                const percentY = (imgPixelY / fp.imageHeight) * 100;
                
                // Format category name
                const category = cp.product?.category ? cp.product.category.replace(/_/g, ' ').toUpperCase() : 'DEVICE';
                const brand = cp.product?.brand || '';
                const model = cp.product?.model || '';
                
                // Find all wire IDs connected to this device with their colors
                const connectedWireData = connections
                  .filter(conn => conn.from === cp.instanceId || conn.to === cp.instanceId)
                  .map(conn => {
                    const cableColor = getCableColor(conn.type);
                    const colorHex = '#' + cableColor.map(c => c.toString(16).padStart(2, '0')).join('');
                    return { wireId: conn.wireId, color: colorHex };
                  })
                  .filter(item => item.wireId);

                const wireLabelsHtml = connectedWireData.map(wire => 
                  `<span style="color:${wire.color};">${wire.wireId}</span>`
                ).join(', ');

                // Build device image HTML if available
                const deviceImageHtml = cp.product?.image_url 
                  ? `<img src="${cp.product.image_url}" style="width:6px; height:6px; object-fit:cover; border-radius:1px; margin-right:1px;" />`
                  : '';

                devicesOverlay += `<div style="position:absolute; left:${percentX}%; top:${percentY}%; transform:translate(-50%,-50%); z-index:10;">
                  <div style="background:white; padding:1px 3px; border:1px solid #d1d5db; border-radius:2px; white-space:nowrap; box-shadow:0 1px 2px rgba(0,0,0,0.2); text-align:center; line-height:1.1; display:flex; align-items:center; gap:1px;">
                    ${deviceImageHtml}
                    <div>
                      <div style="color:#3b82f6; font-size:2px; font-weight:300;">${category}</div>
                      <div style="color:#000000; font-size:3px; font-weight:500; margin-top:0.5px;">${brand}</div>
                      <div style="color:#000000; font-size:3px; font-weight:500; margin-top:0.5px;">${model}</div>
                      ${wireLabelsHtml ? `<div style="font-size:3px; font-weight:700; margin-top:0.5px;">${wireLabelsHtml}</div>` : ''}
                    </div>
                  </div>
                </div>`;
              });
              
              // Connection lines removed per user request
              let connectionsOverlay = '';

              // Build arrow overlays
              let arrowsOverlay = '';
              arrows.forEach(arrow => {
                const startImgX = (arrow.start.x - fpPos.x) / fpScale;
                const startImgY = (arrow.start.y - fpPos.y) / fpScale;
                const endImgX = (arrow.end.x - fpPos.x) / fpScale;
                const endImgY = (arrow.end.y - fpPos.y) / fpScale;

                if ((startImgX < 0 && endImgX < 0) || (startImgX > fp.imageWidth && endImgX > fp.imageWidth) ||
                    (startImgY < 0 && endImgY < 0) || (startImgY > fp.imageHeight && endImgY > fp.imageHeight)) {
                  return; // Arrow completely outside floorplan
                }

                // Clamp coordinates to floorplan bounds
                const clampedStartX = Math.max(0, Math.min(fp.imageWidth, startImgX));
                const clampedStartY = Math.max(0, Math.min(fp.imageHeight, startImgY));
                const clampedEndX = Math.max(0, Math.min(fp.imageWidth, endImgX));
                const clampedEndY = Math.max(0, Math.min(fp.imageHeight, endImgY));

                // Calculate arrow direction for arrowhead
                const dx = clampedEndX - clampedStartX;
                const dy = clampedEndY - clampedStartY;
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;

                arrowsOverlay += `<div style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;">
                  <svg style="position:absolute; top:0; left:0; width:100%; height:100%;" viewBox="0 0 ${fp.imageWidth} ${fp.imageHeight}" preserveAspectRatio="none">
                    <defs>
                      <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                        <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                      </marker>
                    </defs>
                    <line x1="${clampedStartX}" y1="${clampedStartY}" x2="${clampedEndX}" y2="${clampedEndY}" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arrowhead)" />
                  </svg>
                </div>`;
              });

              // Build annotations overlay
              let annotationsOverlay = '';
              console.log('ANNOTATIONS: total count=', annotations?.length || 0);
              if (annotations && annotations.length > 0) {
                annotations.forEach((annotation, idx) => {
                  if (!annotation || !annotation.position) {
                    console.log('Skipping annotation', idx, '- missing position');
                    return;
                  }

                  const annX = annotation.position.x;
                  const annY = annotation.position.y;
                  console.log('Annotation', idx, ':', annotation.type, annotation.id || annotation.symbolId, 'canvasPos:', annX, annY);

                  // Check if annotation is within floorplan bounds (in world coordinates)
                  const fpMinX = fpPos.x;
                  const fpMaxX = fpPos.x + (fp.imageWidth * fpScale);
                  const fpMinY = fpPos.y;
                  const fpMaxY = fpPos.y + (fp.imageHeight * fpScale);

                  if (annX < fpMinX || annY < fpMinY || annX > fpMaxX || annY > fpMaxY) {
                    return; // Skip annotations outside floorplan
                  }

                  // Convert canvas coordinates to image pixels
                  const imgPixelX = (annX - fpPos.x) / fpScale;
                  const imgPixelY = (annY - fpPos.y) / fpScale;

                  const percentX = (imgPixelX / fp.imageWidth) * 100;
                  const percentY = (imgPixelY / fp.imageHeight) * 100;

                  if (annotation.type === 'text') {
                    const color = annotation.color || '#000000';
                    const fontSize = (annotation.fontSize || 16) / fpScale;
                    const rotation = annotation.rotation ? `transform:rotate(${annotation.rotation}deg);` : '';
                    annotationsOverlay += `<div style="position:absolute; left:${percentX}%; top:${percentY}%; color:${color}; font-size:${fontSize}px; font-weight:500; white-space:nowrap; z-index:15; ${rotation}">${annotation.text || ''}</div>`;
                  } else if (annotation.type === 'rectangle') {
                    const color = annotation.color || '#3b82f6';
                    const width = (annotation.width || 40) / fpScale;
                    const height = (annotation.height || 30) / fpScale;
                    const percentWidth = (width / fp.imageWidth) * 100;
                    const percentHeight = (height / fp.imageHeight) * 100;
                    const stroke = (annotation.strokeWidth || 2) / fpScale;
                    const fill = annotation.fill ? `background:${color}80;` : '';
                    const rotation = annotation.rotation ? `rotate(${annotation.rotation}deg)` : '';
                    annotationsOverlay += `<div style="position:absolute; left:${percentX}%; top:${percentY}%; width:${percentWidth}%; height:${percentHeight}%; transform:translate(-50%,-50%) ${rotation}; border:${stroke}px solid ${color}; ${fill} border-radius:2px; z-index:10;"></div>`;
                  } else if (annotation.type === 'circle') {
                    const color = annotation.color || '#3b82f6';
                    const radius = (annotation.radius || 20) / fpScale;
                    const percentSize = (radius / fp.imageWidth) * 100 * 2;
                    const stroke = (annotation.strokeWidth || 2) / fpScale;
                    const fill = annotation.fill ? `background:${color}80;` : '';
                    const rotation = annotation.rotation ? `rotate(${annotation.rotation}deg)` : '';
                    annotationsOverlay += `<div style="position:absolute; left:${percentX}%; top:${percentY}%; width:${percentSize}%; aspect-ratio:1; transform:translate(-50%,-50%) ${rotation}; border:${stroke}px solid ${color}; ${fill} border-radius:50%; z-index:10;"></div>`;
                  } else if (annotation.type === 'line') {
                    const color = annotation.color || '#000000';
                    const endPos = annotation.endPosition;
                    if (endPos) {
                      const endImgX = (endPos.x - fpPos.x) / fpScale;
                      const endImgY = (endPos.y - fpPos.y) / fpScale;
                      const dx = endImgX - imgPixelX;
                      const dy = endImgY - imgPixelY;
                      const length = Math.sqrt(dx * dx + dy * dy);
                      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                      const stroke = (annotation.strokeWidth || 2) / fpScale;
                      const percentLength = (length / fp.imageWidth) * 100;
                      annotationsOverlay += `<div style="position:absolute; left:${percentX}%; top:${percentY}%; width:${percentLength}%; height:${stroke}px; background:${color}; transform:rotate(${angle}deg); transform-origin:left center; z-index:10;"></div>`;
                    }
                  }
                });
              }

              // Build SVG overlay for symbol PNG icons
              let svgSymbolsContent = '';
              let svgFilters = '';
              if (annotations && annotations.length > 0) {
                annotations.forEach((annotation, idx) => {
                  if (!annotation || !annotation.position) return;

                  const annX = annotation.position.x;
                  const annY = annotation.position.y;
                  const fpMinX = fpPos.x;
                  const fpMaxX = fpPos.x + (fp.imageWidth * fpScale);
                  const fpMinY = fpPos.y;
                  const fpMaxY = fpPos.y + (fp.imageHeight * fpScale);

                  if (annX < fpMinX || annY < fpMinY || annX > fpMaxX || annY > fpMaxY) {
                    console.log('  -> OUTSIDE floorplan bounds, skipping');
                    return;
                  }

                  const imgPixelX = (annX - fpPos.x) / fpScale;
                  const imgPixelY = (annY - fpPos.y) / fpScale;

                  if (annotation.type === 'symbol' && annotation.symbolId) {
                    const iconUrl = SYMBOL_ICONS[annotation.symbolId];
                    const baseSize = (60 * (annotation.scale || 1)) / fpScale;
                    const size = baseSize;
                    const color = annotation.color || '#3b82f6';

                    if (iconUrl) {
                      // Generate color filter
                      const filterId = `symbol-color-${idx}`;
                      const hex = color.replace('#', '');
                      const r = parseInt(hex.substring(0, 2), 16) / 255;
                      const g = parseInt(hex.substring(2, 4), 16) / 255;
                      const b = parseInt(hex.substring(4, 6), 16) / 255;

                      svgFilters += `<filter id="${filterId}"><feColorMatrix type="matrix" values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 1 0"/></filter>`;

                      // Use PNG icon with color filter - apply rotation and flip
                      const rotation = annotation.rotation || 0;
                      const flip = annotation.flipped ? -1 : 1;
                      const transform = `translate(${imgPixelX}, ${imgPixelY}) rotate(${rotation}) scale(${flip}, 1) translate(${-size/2}, ${-size/2})`;
                      
                      svgSymbolsContent += `<image href="${iconUrl}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" filter="url(#${filterId})" transform="${transform}"/>`;
                    }
                  }
                });
              }

              bodyHtml += `
              <section class="keep-together">
              <h2>${fp.name}</h2>
              <div style="position:relative; text-align:center; margin:20px auto; max-width:95%; display:inline-block;">
              <img src="${fp.url}" style="width:100%; height:auto; border:1px solid #e5e7eb; border-radius:8px; display:block;" />
              ${devicesOverlay}
              ${connectionsOverlay}
              ${arrowsOverlay}
              ${annotationsOverlay}
              <svg style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;" viewBox="0 0 ${fp.imageWidth} ${fp.imageHeight}" preserveAspectRatio="none">
                <defs>${svgFilters}</defs>
                ${svgSymbolsContent}
              </svg>
              </div>
  <div class="info-box">
    <div class="info-box-title">Scale Information</div>
    <p><strong>Calibration:</strong> ${fp.pixelsPerInch ? fp.pixelsPerInch.toFixed(2) + ' px/inch' : 'Not calibrated'}</p>
    ${fp.imageWidth ? `<p><strong>Dimensions:</strong> ${fp.imageWidth} × ${fp.imageHeight} pixels</p>` : ''}
    <p><strong>Devices shown:</strong> ${canvasProducts.filter(cp => {
      const deviceCenterX = cp.position.x + DEVICE_CARD_WIDTH / 2;
      const deviceCenterY = cp.position.y + DEVICE_CARD_HEIGHT / 2;
      const imgPixelX = (deviceCenterX - fpPos.x) / fpScale;
      const imgPixelY = (deviceCenterY - fpPos.y) / fpScale;
      return imgPixelX >= 0 && imgPixelY >= 0 && imgPixelX <= fp.imageWidth && imgPixelY <= fp.imageHeight;
    }).length} | <strong>Connections:</strong> ${connections.filter(conn => {
      const fromDevice = canvasProducts.find(cp => cp.instanceId === conn.from);
      const toDevice = canvasProducts.find(cp => cp.instanceId === conn.to);
      if (!fromDevice || !toDevice) return false;
      const fromCenterX = fromDevice.position.x + DEVICE_CARD_WIDTH / 2;
      const fromCenterY = fromDevice.position.y + DEVICE_CARD_HEIGHT / 2;
      const toCenterX = toDevice.position.x + DEVICE_CARD_WIDTH / 2;
      const toCenterY = toDevice.position.y + DEVICE_CARD_HEIGHT / 2;
      const fromImgX = (fromCenterX - fpPos.x) / fpScale;
      const fromImgY = (fromCenterY - fpPos.y) / fpScale;
      const toImgX = (toCenterX - fpPos.x) / fpScale;
      const toImgY = (toCenterY - fpPos.y) / fpScale;
      return fromImgX >= 0 && fromImgY >= 0 && fromImgX <= fp.imageWidth && fromImgY <= fp.imageHeight &&
             toImgX >= 0 && toImgY >= 0 && toImgX <= fp.imageWidth && toImgY <= fp.imageHeight;
    }).length}</p>
  </div>
</section>
<div class="page-break"></div>`;
            }
          }
        }

        // Part 2: How Your System Works (CLIENT ONLY)
        if (isClient) {
          console.log('ADDING_HSWS_SECTION');
          
          // Generate AI-powered system explanation
          let systemExplanation = '';
          try {
            const devicesByCategory = {};
            canvasProducts.forEach(cp => {
              const cat = cp.product?.category || 'other';
              if (!devicesByCategory[cat]) devicesByCategory[cat] = [];
              devicesByCategory[cat].push(cp);
            });

            // Build connection map for context
            const connectionDescriptions = connections.map(conn => {
              const fromDevice = canvasProducts.find(cp => cp.instanceId === conn.from);
              const toDevice = canvasProducts.find(cp => cp.instanceId === conn.to);
              return `${fromDevice?.label || fromDevice?.product?.brand || 'Device'} connects to ${toDevice?.label || toDevice?.product?.brand || 'Device'} via ${conn.type}`;
            }).join('; ');

            const prompt = `You are writing a friendly explanation for a homeowner about their new AV system. Write in simple terms they can understand.

SYSTEM DETAILS:
- ${canvasProducts.length} devices across ${uniqueRooms.length} room(s)
- ${connections.length} connections
- Rooms: ${uniqueRooms.join(', ')}

DEVICES (use these EXACT brand names and models when referring to equipment - NEVER use labels like "AVR-K-1" or "MS-K-1"):
${Object.entries(devicesByCategory).map(([cat, devices]) => `- ${cat.replace(/_/g, ' ')}: ${devices.map(d => d.product?.brand + ' ' + d.product?.model).join(', ')}`).join('\n')}

CONNECTIONS: ${connectionDescriptions}

IMPORTANT RULES:
- ALWAYS refer to devices by their actual BRAND NAME and MODEL (e.g., "Denon AVR-X3800H receiver", "Apple TV 4K", "Samsung QN65Q80B TV")
- NEVER use internal labels like "AVR-K-1", "MS-K-1", "TV-K-1", "SPK-K-1" etc.
- Write for someone who doesn't know technical terms

Write 3-4 paragraphs explaining:
1. What they can DO with this system (watch movies, listen to music, etc.)
2. How the main pieces work together - refer to each device by its actual brand and model name
3. Practical tips like "To watch a movie, simply..." or "To play music throughout the house..."

Use simple HTML formatting (<p>, <h3>, <ul>, <li>). Be warm and helpful.`;

            const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
              prompt: prompt,
              response_json_schema: {
                type: "object",
                properties: { html_content: { type: "string" } },
                required: ["html_content"]
              }
            });
            systemExplanation = response.html_content || '';
            console.log('AI explanation generated, length:', systemExplanation.length);
          } catch (e) {
            console.log('AI explanation failed:', e.message);
            // Fallback to basic explanation
            systemExplanation = `<p>Your audio/video system is designed to provide seamless entertainment throughout your home. With ${canvasProducts.length} integrated devices, you can enjoy movies, music, and more across ${uniqueRooms.length} room(s).</p>`;
          }

          bodyHtml += `
<section>
  <h1>How Your System Works</h1>
  <div class="info-box">
    <div class="info-box-title">Your Entertainment System Guide</div>
    <p>This guide explains how your audio/video system works and how to get the most out of it.</p>
  </div>
  ${systemExplanation}
</section>
<div class="page-break"></div>`;
        }

        // Part 3: Scope of Work (CLIENT ONLY)
        if (isClient) {
          const categoryCounts = {};
          canvasProducts.forEach(cp => {
            const cat = (cp.product?.category || 'other').replace(/_/g, ' ');
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          });
          
          const cableTypeCounts = {};
          connections.forEach(conn => {
            const type = conn.type || 'Unknown';
            cableTypeCounts[type] = (cableTypeCounts[type] || 0) + 1;
          });

          bodyHtml += `
<section>
  <h1>Scope of Work</h1>
  <div class="info-box">
    <div class="info-box-title">Project Overview</div>
    <p>This proposal includes the complete design, supply, installation, configuration, and training for a professional audio/video system across ${uniqueRooms.length} room(s) with ${canvasProducts.length} devices and ${connections.length} integrated connections.</p>
  </div>
  <h2>1. Equipment Supply</h2>
  <ul>${Object.entries(categoryCounts).map(([cat, count]) => `<li><strong>${count}x</strong> ${cat.charAt(0).toUpperCase() + cat.slice(1)}</li>`).join('')}</ul>
  <h2>2. Equipment Installation</h2>
  <ul>${uniqueRooms.map(room => {
    const roomDevices = canvasProducts.filter(cp => {
      const deviceRoom = cp.room ? String(cp.room).trim() : 'Unassigned';
      return deviceRoom === room;
    });
    if (roomDevices.length === 0) return '';
    const count = Number.isInteger(roomDevices.length) ? roomDevices.length : 0;
    return `<li><strong>${room}:</strong> ${count} device(s)</li>`;
  }).join('')}</ul>
  <h2>3. Cabling & Infrastructure</h2>
  <ul>${Object.entries(cableTypeCounts).map(([type, count]) => `<li><strong>${count}x</strong> ${type} cable run${count > 1 ? 's' : ''}</li>`).join('')}</ul>
  <h2>4. System Programming & Configuration</h2>
  <ul>
    <li>Network configuration for ${networkedCount} networked devices</li>
    <li>Audio/video signal routing and optimization</li>
    <li>Complete system testing and verification</li>
  </ul>
</section>
<div class="page-break"></div>`;
        }

        // Part 4: Equipment by Room (CLIENT ONLY)
        if (isClient) {
          let roomTablesHtml = '';
          uniqueRooms.forEach(room => {
            const roomDevices = canvasProducts.filter(cp => {
              const deviceRoom = cp.room ? String(cp.room).trim() : 'Unassigned';
              return deviceRoom === room;
            });
            if (roomDevices.length === 0) return;
            roomTablesHtml += `<h2>${room}</h2><table><thead><tr><th>Equipment</th><th>Brand / Model</th><th>Category</th>${showPricing ? '<th style="text-align:right;">Price</th>' : ''}</tr></thead><tbody>`;
            roomDevices.forEach(cp => {
              roomTablesHtml += `<tr><td>${cp.label || 'Device'}</td><td><strong>${cp.product?.brand || ''}</strong> ${cp.product?.model || ''}</td><td>${(cp.product?.category || '').replace(/_/g, ' ')}</td>${showPricing ? `<td style="text-align:right;">$${(cp.product?.price || 0).toLocaleString()}</td>` : ''}</tr>`;
            });
            roomTablesHtml += '</tbody></table>';
          });
          bodyHtml += `<section><h1>Equipment by Room</h1>${roomTablesHtml}</section><div class="page-break"></div>`;
        }

        // Part 5: Bill of Materials (CLIENT ONLY)
        if (isClient) {
          const grouped = {};
          canvasProducts.forEach(cp => {
            const key = `${cp.product?.brand}-${cp.product?.model}`;
            if (!grouped[key]) grouped[key] = { product: cp.product, count: 0 };
            grouped[key].count++;
          });
          
          let bomRows = Object.values(grouped).map(item => `<tr><td>${(item.product?.category || '').replace(/_/g, ' ')}</td><td><strong>${item.product?.brand || ''}</strong> ${item.product?.model || ''}</td><td style="text-align:center;">${item.count}</td><td style="text-align:right;">$${(item.product?.price || 0).toLocaleString()}</td><td style="text-align:right;">$${(((item.product?.price || 0) + (item.product?.installation_labor || 0)) * item.count).toLocaleString()}</td></tr>`).join('');

          // Calculate wire/cable costs
          const wireCounts = {};
          let totalWireMaterialCost = 0;
          connections.forEach(conn => {
            const wireType = conn.type || 'Unknown';
            const wireSpec = conn.wireSpec || '';
            const key = `${wireType}${wireSpec ? ' (' + wireSpec + ')' : ''}`;
            if (!wireCounts[key]) {
              wireCounts[key] = { count: 0, type: wireType, spec: wireSpec, materialCost: 0, totalLength: 0 };
            }
            wireCounts[key].count++;

            // Determine estimated length: use conn.length if specified, otherwise 50ft for same room, 250ft for different rooms
            let estLength = conn.length;
            if (!estLength) {
              const fromDevice = canvasProducts.find(cp => cp.instanceId === conn.from);
              const toDevice = canvasProducts.find(cp => cp.instanceId === conn.to);
              const sameRoom = fromDevice?.room && toDevice?.room && fromDevice.room === toDevice.room;
              estLength = sameRoom ? 50 : 250;
            }
            wireCounts[key].totalLength += estLength;

            const pricing = wirePricingData.find(wp => wp.wire_type?.toLowerCase() === wireType.toLowerCase());
            if (pricing?.material_price_per_foot) {
              wireCounts[key].materialCost += pricing.material_price_per_foot * estLength;
              totalWireMaterialCost += pricing.material_price_per_foot * estLength;
            }
          });

          let wireRows = Object.entries(wireCounts).map(([key, data]) => {
            return `<tr><td>Cable/Wire</td><td><strong>${data.type}</strong> ${data.spec}</td><td style="text-align:center;">${data.count} run${data.count > 1 ? 's' : ''}</td><td style="text-align:right;">-</td><td style="text-align:right;">${data.materialCost > 0 ? '$' + data.materialCost.toLocaleString() : 'TBD'}</td></tr>`;
          }).join('');

          const equipmentSubtotal = totalDevicePrice + totalInstallLabor;
          const materialsSubtotal = equipmentSubtotal + totalWireMaterialCost;

          bodyHtml += `
          <section>
          <h1>Bill of Materials</h1>
          <h2>Equipment</h2>
          <table><thead><tr><th>Item</th><th>Brand / Model</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Total</th></tr></thead><tbody>${bomRows}<tr style="font-weight:bold;background-color:#f1f5f9;"><td colspan="3" style="text-align:right;">Equipment Subtotal:</td><td></td><td style="text-align:right;">$${equipmentSubtotal.toLocaleString()}</td></tr></tbody></table>
          ${connections.length > 0 ? `<h2>Cabling & Infrastructure</h2><table><thead><tr><th>Item</th><th>Type / Spec</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Total</th></tr></thead><tbody>${wireRows}<tr style="font-weight:bold;background-color:#f1f5f9;"><td colspan="3" style="text-align:right;">Cabling Subtotal:</td><td></td><td style="text-align:right;">${totalWireMaterialCost > 0 ? '$' + totalWireMaterialCost.toLocaleString() : 'TBD'}</td></tr></tbody></table>` : ''}
          </section>
          <div class="page-break"></div>
          ${showLabor ? `<section>
          <h1>Labor & Installation</h1>
          <table><tbody><tr><td>System Design & Engineering</td><td style="text-align:right;">${designEngineeringRate === 0 ? 'Included' : '$' + designEngineeringRate.toLocaleString()}</td></tr><tr><td>Equipment Installation</td><td style="text-align:right;">${equipmentInstallationTotal > 0 ? '$' + equipmentInstallationTotal.toLocaleString() : 'TBD'}</td></tr><tr><td>Cable Runs & Termination</td><td style="text-align:right;">${cableTerminationTotal > 0 ? '$' + cableTerminationTotal.toLocaleString() : 'TBD'}</td></tr><tr><td>System Programming</td><td style="text-align:right;">${systemProgrammingTotal > 0 ? '$' + systemProgrammingTotal.toLocaleString() : 'TBD'}</td></tr><tr style="font-weight:bold;background-color:#f1f5f9;"><td>Labor Subtotal:</td><td style="text-align:right;">${laborSubtotal > 0 ? '$' + laborSubtotal.toLocaleString() : 'TBD'}</td></tr></tbody></table>
          <div class="highlight" style="margin-top:20px;"><h3>Project Total</h3><p style="font-size:18px;font-weight:bold;">Equipment + Cabling + Labor: $${(materialsSubtotal + laborSubtotal).toLocaleString()}</p></div>
          </section>
          <div class="page-break"></div>` : ''}`;
        }

        // Part 6: Device Documentation (INSTALLER ONLY)
        if (isInstaller) {
          let deviceDocHtml = '';
          uniqueRooms.forEach(room => {
            const roomDevices = canvasProducts.filter(cp => {
              const deviceRoom = cp.room ? String(cp.room).trim() : 'Unassigned';
              return deviceRoom === room;
            });
            if (roomDevices.length === 0) return;
            deviceDocHtml += `<h2>${room}</h2><table><thead><tr><th>Label</th><th>Brand / Model</th><th>Category</th><th>IP Address</th><th>Switch / Port</th></tr></thead><tbody>`;
            roomDevices.forEach(cp => {
              deviceDocHtml += `<tr><td>${cp.label || cp.product?.brand || 'Device'}</td><td><strong>${cp.product?.brand || ''}</strong> ${cp.product?.model || ''}</td><td>${(cp.product?.category || '').replace(/_/g, ' ')}</td><td>${cp.networkInfo?.ip && cp.networkInfo.ip !== '000.000.000.000' ? cp.networkInfo.ip : '-'}</td><td>${cp.networkInfo?.sw ? 'SW ' + cp.networkInfo.sw : '-'} · ${cp.networkInfo?.port ? 'Port ' + cp.networkInfo.port : '-'}</td></tr>`;
            });
            deviceDocHtml += '</tbody></table>';
          });
          bodyHtml += `<section><h1>Device Documentation</h1>${deviceDocHtml}</section><div class="page-break"></div>`;
        }

        // Part 7: Wire Schedule (INSTALLER ONLY)
        if (isInstaller && showWireSchedule && connections.length > 0) {
          let wireRows = connections.map((conn, i) => {
            const fromDevice = canvasProducts.find(cp => cp.instanceId === conn.from);
            const toDevice = canvasProducts.find(cp => cp.instanceId === conn.to);
            const wireId = conn.wireId || `C${i + 1}`;
            return `<tr><td>${wireId}</td><td>${conn.type || '-'}</td><td>${conn.wireSpec || '-'}</td><td>${fromDevice?.label || fromDevice?.product?.brand || 'Unknown'}</td><td>${toDevice?.label || toDevice?.product?.brand || 'Unknown'}</td><td>${conn.fromPort || '?'} → ${conn.toPort || '?'}</td></tr>`;
          }).join('');
          bodyHtml += `<section><h1>Wire Schedule</h1><table><thead><tr><th>Wire ID</th><th>Type</th><th>Spec</th><th>From</th><th>To</th><th>Ports</th></tr></thead><tbody>${wireRows}</tbody></table></section><div class="page-break"></div>`;
        }

        // Part 8: Sign-off (always)
        bodyHtml += `
<section class="keep-together">
  <h1>${isClient ? 'Proposal Acceptance' : 'Installation Sign-off'}</h1>
  <div class="info-box">
    <div class="info-box-title">${isClient ? 'Client Acceptance' : 'Client Approval'}</div>
    <p>${isClient ? 'By signing below, the client accepts this proposal and authorizes the work to proceed as described.' : 'The client acknowledges that the above AV system design has been reviewed and approved for installation.'}</p>
  </div>
  <table><tbody><tr><td style="width:50%;"><p><strong>Client Name</strong></p><p>______________________________</p><p>Date: ________________________</p></td><td style="width:50%;"><p><strong>Prepared By</strong></p><p>______________________________</p><p>Date: ________________________</p></td></tr></tbody></table>
</section>`;

        console.log('BODY_HAS_HSWS:', bodyHtml.includes('How Your System Works'));
        console.log('BODY_HAS_SCOPE:', bodyHtml.includes('Scope of Work'));

        const templateData = {
          title: `${projectName || 'AV System Design'} - ${exportTypeTitle}`,
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          body: bodyHtml
        };

        console.log('Sending to APITemplate, body length:', bodyHtml.length);
        
        const response = await fetch(`https://rest.apitemplate.io/v2/create-pdf?template_id=${TEMPLATE_ID}&expiration=1440`, {
          method: 'POST',
          headers: { 'X-API-KEY': API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify(templateData)
        });

        const responseText = await response.text();
        console.log('APITemplate response status:', response.status);

        if (!response.ok) {
          return Response.json({ error: `APITemplate error: ${response.status}`, details: responseText }, { status: 500 });
        }

        const result = JSON.parse(responseText);
        console.log('Parsed result:', result);
        return Response.json(result);
      }

      case 'generateDeviceLabel': {
        const { device, size } = params;
        const html = generateDeviceLabelHTML(device, size);
        const response = await fetch('https://rest.apitemplate.io/v2/create-image?expiration=1440', {
          method: 'POST',
          headers: { 'X-API-KEY': API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: html, settings: { image_type: 'png', width: size?.width || 400, height: size?.height || 200 } })
        });
        if (!response.ok) {
          const errorText = await response.text();
          return Response.json({ error: `APITemplate error: ${response.status}`, details: errorText }, { status: response.status });
        }
        return Response.json(await response.json());
      }

      case 'generateCableLabel': {
        const { connection, fromDevice, toDevice, size } = params;
        const html = generateCableLabelHTML(connection, fromDevice, toDevice, size);
        const response = await fetch('https://rest.apitemplate.io/v2/create-image?expiration=1440', {
          method: 'POST',
          headers: { 'X-API-KEY': API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: html, settings: { image_type: 'png', width: size?.width || 300, height: size?.height || 100 } })
        });
        if (!response.ok) {
          const errorText = await response.text();
          return Response.json({ error: `APITemplate error: ${response.status}`, details: errorText }, { status: response.status });
        }
        return Response.json(await response.json());
      }

      case 'generateRoomDiagram': {
        const { room, devices = [], connections: roomConnections = [] } = params;
        if (!room) return Response.json({ error: 'Room name is required' }, { status: 400 });
        if (!devices || devices.length === 0) return Response.json({ error: 'No devices in this room' }, { status: 400 });
        const html = generateRoomDiagramHTML(room, devices, roomConnections);
        const response = await fetch('https://rest.apitemplate.io/v2/create-image?expiration=1440', {
          method: 'POST',
          headers: { 'X-API-KEY': API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: html, settings: { image_type: 'png', width: 1200, height: 800 } })
        });
        if (!response.ok) {
          const errorText = await response.text();
          return Response.json({ error: `APITemplate error: ${response.status}`, details: errorText }, { status: response.status });
        }
        return Response.json(JSON.parse(await response.text()));
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('APITemplate service error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateDeviceLabelHTML(device, size) {
  const color = '#64748B';
  return `<!DOCTYPE html><html><head><style>body{margin:0;padding:15px;font-family:-apple-system,sans-serif;background:white;}.label{border:2px solid ${color};border-radius:8px;padding:15px;}.name{font-size:18px;font-weight:700;}.model{color:#64748B;font-size:12px;}</style></head><body><div class="label"><div class="name">${device.label || device.product?.brand || 'Device'}</div><div class="model">${device.product?.model || ''}</div></div></body></html>`;
}

function generateCableLabelHTML(connection, fromDevice, toDevice) {
  const color = '#64748B';
  return `<!DOCTYPE html><html><head><style>body{margin:0;padding:10px;font-family:-apple-system,sans-serif;background:white;}.label{background:${color};color:white;border-radius:6px;padding:12px 15px;}.wire-id{font-size:16px;font-weight:700;}.route{font-size:11px;opacity:0.9;}</style></head><body><div class="label"><div class="wire-id">${connection.wireId || 'CABLE'}</div><div class="route">${fromDevice?.label || 'Source'} → ${toDevice?.label || 'Destination'}</div></div></body></html>`;
}

function getSymbolSVG(symbolId, color) {
  const svgs = {
    'AV-SPK': `<svg viewBox="0 0 106 93" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;"><g transform="translate(0,93) scale(0.1,-0.1)" fill="${color}"><path d="M565 780 l-110 -110 -107 0 -108 0 0 -174 c0 -130 3 -175 12 -178 7 -3 58 -4 112 -3 l100 2 105 -108 c57 -60 111 -109 118 -109 10 0 13 75 13 395 0 312 -3 395 -13 395 -7 0 -62 -49 -122 -110z m101 -617 c-2 -2 -46 39 -96 91 l-93 96 -104 0 -104 0 3 147 3 147 101 -3 101 -3 94 101 94 100 3 -336 c1 -185 0 -338 -2 -340z"/></g></svg>`,
    'AV-TV': `<svg viewBox="0 0 106 85" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;"><g transform="translate(0,85) scale(0.1,-0.1)" fill="${color}"><path d="M262 438 l3 -193 280 0 280 0 0 190 0 190 -283 3 -282 2 2 -192z m82 -6 l1 -162 -27 0 -28 0 0 158 c0 87 3 162 7 166 4 4 16 6 26 4 18 -3 20 -14 21 -166z m366 1 l0 -163 -165 0 -165 0 0 163 0 162 165 0 165 0 0 -162z m82 2 l0 -160 -26 -3 -26 -3 0 159 c0 87 3 162 7 166 4 4 16 6 26 4 17 -3 19 -14 19 -163z"/></g></svg>`,
    'NET-WAP': `<svg viewBox="0 0 128 84" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;"><g transform="translate(0,84) scale(0.1,-0.1)" fill="${color}"><path d="M422 713 c2 -12 14 -19 37 -21 19 -2 44 -10 57 -19 36 -23 67 -79 60 -108 -5 -21 -3 -25 15 -25 19 0 21 4 14 37 -10 56 -74 133 -109 133 -8 0 -18 5 -21 10 -3 6 -17 10 -31 10 -19 0 -25 -5 -22 -17z M425 672 c-13 -13 -2 -22 26 -22 41 0 89 -50 89 -92 0 -17 4 -27 10 -23 24 15 5 72 -39 111 -23 21 -75 36 -86 26z M419 630 c-8 -6 -1 -13 24 -23 24 -11 38 -24 43 -41 7 -30 34 -35 34 -7 0 21 -42 67 -69 74 -10 2 -25 1 -32 -3z M420 515 c0 -52 -1 -55 -25 -55 l-25 0 0 -150 0 -150 280 0 280 0 0 150 0 150 -240 0 -240 0 0 55 c0 42 -3 55 -15 55 -12 0 -15 -13 -15 -55z m480 -205 l0 -120 -255 0 -255 0 0 120 0 120 255 0 255 0 0 -120z"/></g></svg>`,
    'NET-PO': `<svg viewBox="0 0 112 91" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;"><g transform="translate(0,91) scale(0.1,-0.1)" fill="${color}"><path d="M600 724 c-107 -63 -206 -120 -220 -128 -97 -52 -153 -85 -177 -102 l-27 -20 85 -50 c46 -27 87 -50 91 -52 4 -2 108 -61 230 -132 147 -85 226 -125 233 -119 11 11 20 584 10 667 -4 31 -11 52 -18 51 -7 -1 -100 -52 -207 -115z m198 -244 c1 -167 -2 -308 -6 -312 -5 -5 -48 14 -98 43 -49 28 -103 60 -120 69 -288 164 -334 194 -326 202 19 19 527 307 537 304 6 -2 11 -115 13 -306z"/></g></svg>`,
    'NET-DO': `<svg viewBox="0 0 114 85" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;"><g transform="translate(0,85) scale(0.1,-0.1)" fill="${color}"><path d="M750 753 c-52 -31 -108 -63 -125 -73 -16 -9 -106 -61 -200 -114 -93 -53 -176 -103 -183 -110 -14 -14 -11 -16 93 -76 357 -206 521 -297 528 -291 11 11 4 714 -8 717 -5 1 -53 -23 -105 -53z"/></g></svg>`,
    'NET-DP': `<svg viewBox="0 0 120 86" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;"><g transform="translate(0,86) scale(0.1,-0.1)" fill="${color}"><path d="M635 673 c-126 -73 -239 -138 -250 -143 -50 -24 -128 -76 -126 -85 4 -15 615 -364 624 -356 11 11 4 714 -8 716 -5 2 -113 -58 -240 -132z m233 -387 c1 -79 -2 -144 -7 -149 -6 -6 -20 -2 -39 12 -17 11 -33 21 -36 21 -4 0 -36 18 -72 40 -36 22 -67 40 -68 40 -4 0 -300 171 -305 176 -3 2 114 3 260 2 l264 -3 3 -139z"/></g></svg>`,
    'AV-PS': `<svg viewBox="0 0 115 81" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;"><g transform="translate(0,81) scale(0.1,-0.1)" fill="${color}"><path d="M260 569 c0 -6 9 -13 20 -16 18 -5 20 -15 22 -162 l3 -156 280 0 280 0 3 157 c2 152 3 157 24 160 12 2 23 9 26 16 3 9 -67 12 -327 12 -233 0 -331 -3 -331 -11z m580 -164 l0 -145 -252 2 -253 3 -3 129 c-1 72 0 136 2 143 4 10 59 13 256 13 l250 0 0 -145z"/></g></svg>`,
    'AV-AVO': `<svg viewBox="0 0 119 89" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;"><g transform="translate(0,89) scale(0.1,-0.1)" fill="${color}"><path d="M590 709 c-123 -71 -226 -129 -228 -129 -2 0 -16 -8 -30 -19 -15 -10 -49 -31 -77 -46 -71 -39 -72 -41 -29 -63 22 -10 80 -43 129 -72 118 -69 266 -155 335 -193 30 -17 72 -41 92 -54 21 -13 42 -23 48 -23 7 0 10 124 10 365 0 286 -3 365 -12 364 -7 0 -114 -59 -238 -130z m222 -66 c-2 -82 -4 -149 -5 -150 -6 -5 -527 -7 -527 -2 0 3 12 12 27 20 28 14 262 146 318 179 17 9 62 36 100 59 39 22 75 41 80 41 6 0 9 -54 7 -147z m-5 -186 c6 -7 6 -297 0 -297 -5 0 -21 8 -35 18 -15 11 -52 32 -82 49 -59 32 -85 47 -195 111 -38 23 -102 58 -142 79 -39 20 -70 40 -68 43 3 4 517 2 522 -3z"/></g></svg>`,
    'CTRL-KP': `<svg viewBox="0 0 91 77" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;"><g transform="translate(0,77) scale(0.1,-0.1)" fill="${color}"><path d="M287 704 c-4 -4 -7 -142 -7 -306 l0 -298 205 0 205 0 -2 303 -3 302 -196 3 c-107 1 -198 -1 -202 -4z m365 -304 l1 -265 -172 -3 -171 -2 0 270 0 270 171 -2 171 -3 0 -265z"/></g></svg>`,
    'CTRL-WTP': `<svg viewBox="0 0 87 83" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;"><g transform="translate(0,83) scale(0.05,-0.05)" fill="${color}"><path d="M405 865 l5 -595 470 0 470 0 0 590 0 590 -475 5 -476 6 6 -596z m891 35 c3 -269 0 -510 -6 -535 l-11 -46 -404 6 -405 5 -5 510 c-3 280 -1 521 4 535 8 20 99 25 416 20 l405 -5 6 -490z M529 1335 c-5 -14 -7 -237 -4 -495 l5 -470 332 -5 c419 -7 380 -61 373 518 l-5 467 -345 5 c-269 5 -348 0 -356 -20z m631 -70 c6 -398 -2 -815 -16 -829 -9 -9 -138 -15 -286 -12 l-268 6 -5 435 -6 435 291 0 c263 0 290 -3 290 -35z"/></g></svg>`,
    'CTRL-TTP': `<svg viewBox="0 0 87 84" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;"><g transform="translate(0,84) scale(0.05,-0.05)" fill="${color}"><path d="M457 1422 l-47 -38 0 -534 c0 -657 -54 -590 474 -590 526 0 476 -62 476 591 l0 511 -49 49 c-68 68 -772 77 -854 11z m804 -43 c48 -25 61 -989 15 -1035 -34 -34 -758 -34 -792 0 -43 43 -33 1009 11 1034 47 28 716 28 766 1z"/></g></svg>`,
    'CTRL-VC': `<svg viewBox="0 0 102 80" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;"><g transform="translate(0,80) scale(0.1,-0.1)" fill="${color}"><path d="M287 704 c-4 -4 -7 -142 -7 -306 l0 -298 205 0 205 0 -2 303 -3 302 -196 3 c-107 1 -198 -1 -202 -4z m365 -304 l1 -265 -172 -3 -171 -2 0 270 0 270 171 -2 171 -3 0 -265z M403 505 c-82 -65 -62 -189 36 -228 50 -21 101 -6 142 40 24 28 29 43 29 83 0 43 -5 54 -38 90 -35 36 -44 40 -88 40 -37 0 -57 -6 -81 -25z m121 -16 c33 -15 59 -71 51 -108 -16 -73 -111 -102 -160 -49 -44 47 -29 124 30 156 26 15 48 15 79 1z"/></g></svg>`,
    'ELEC-1G': `<svg viewBox="0 0 100 72" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;"><g transform="translate(0,72) scale(0.1,-0.1)" fill="${color}"><path d="M454 545 c-39 -17 -92 -77 -100 -113 -3 -15 -7 -31 -8 -36 -1 -5 -41 -10 -89 -10 -118 -1 -118 -20 1 -24 91 -3 92 -3 92 -28 0 -64 107 -154 184 -154 73 0 151 57 184 133 35 82 -21 202 -111 236 -38 15 -115 12 -153 -4z m166 -37 c41 -28 69 -65 72 -96 l3 -23 -158 0 c-87 -1 -161 2 -164 4 -7 7 32 79 54 99 48 44 141 51 193 16z m80 -160 c0 -6 -11 -30 -25 -54 -26 -45 -90 -84 -137 -84 -56 0 -126 48 -157 107 -21 42 -18 43 154 43 119 0 165 -3 165 -12z"/></g></svg>`,
    'ELEC-2G': `<svg viewBox="0 0 94 77" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;"><g transform="translate(0,77) scale(0.1,-0.1)" fill="${color}"><path d="M462 588 c-19 -6 -53 -33 -75 -60 l-42 -48 -87 0 c-52 0 -88 -4 -88 -10 0 -6 35 -10 85 -10 l85 0 0 -45 0 -44 -82 -3 c-54 -2 -83 -7 -86 -15 -3 -10 20 -13 90 -13 93 0 94 0 111 -30 44 -74 161 -105 242 -63 49 25 70 47 90 96 33 79 4 177 -65 223 -44 29 -127 39 -178 22z m126 -23 c43 -18 82 -53 82 -72 0 -10 -30 -13 -140 -13 -77 0 -140 3 -140 8 0 20 36 56 74 72 51 23 77 24 124 5z m108 -129 c3 -14 3 -34 -1 -45 -6 -20 -13 -21 -166 -21 l-159 0 0 45 0 45 160 0 160 0 6 -24z m-26 -105 c0 -5 -16 -23 -35 -39 -61 -55 -149 -55 -210 0 -19 16 -35 34 -35 39 0 5 63 9 140 9 77 0 140 -4 140 -9z"/></g></svg>`,
    'ELEC-4G': `<svg viewBox="0 0 102 73" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;"><g transform="translate(0,73) scale(0.1,-0.1)" fill="${color}"><path d="M487 570 c4 -22 2 -30 -9 -30 -19 0 -88 -69 -88 -87 0 -12 -19 -14 -97 -12 -87 3 -98 1 -101 -15 -3 -16 4 -17 87 -15 50 2 91 0 91 -4 0 -4 0 -25 0 -47 l0 -40 -95 0 c-83 0 -94 -2 -88 -16 5 -14 20 -16 105 -12 67 3 98 2 98 -6 0 -16 51 -70 78 -85 17 -9 22 -19 20 -39 -2 -19 2 -27 12 -27 10 0 14 8 13 23 -3 20 1 22 47 22 47 0 50 -2 50 -25 0 -16 6 -25 16 -25 13 0 15 7 11 29 -5 24 -1 32 31 52 75 49 105 154 67 235 -20 43 -70 94 -93 94 -10 0 -12 8 -7 30 6 25 4 30 -13 30 -15 0 -18 -5 -15 -23 4 -22 2 -23 -44 -21 -42 2 -48 5 -46 23 2 15 -3 21 -17 21 -16 0 -19 -5 -13 -30z m107 -36 c11 -4 16 -19 16 -51 l0 -44 -47 3 -47 3 -2 42 c-2 32 2 43 14 46 27 7 49 7 66 1z m-104 -54 c0 -39 -1 -40 -35 -40 -44 0 -46 19 -4 54 17 14 32 26 35 26 2 0 4 -18 4 -40z m212 -23 c8 -16 5 -18 -29 -15 -35 3 -38 6 -39 33 0 17 1 34 4 38 5 10 49 -29 64 -56z m-214 -90 l3 -47 -44 0 c-39 0 -46 3 -51 25 -4 14 -4 36 0 49 5 21 11 24 47 22 l42 -2 3 -47z m122 1 l0 -48 -49 0 -50 0 3 48 c2 26 4 47 5 47 0 0 21 0 46 0 l45 0 0 -47z m115 2 l0 -45 -45 -3 -46 -3 3 48 c1 26 2 48 2 49 1 0 20 0 44 0 l42 -1 0 -45z m-235 -112 c0 -21 -4 -38 -9 -38 -8 0 -71 66 -71 74 0 2 18 3 40 2 39 -1 40 -1 40 -38z m118 -7 c-3 -40 -6 -46 -27 -49 -12 -2 -33 -1 -45 2 -19 5 -22 12 -20 48 0 24 2 43 3 43 0 0 22 1 47 1 l45 2 -3 -47z m102 41 c0 -9 -63 -72 -71 -72 -6 0 -6 73 0 76 8 4 71 0 71 -4z"/></g></svg>`
  };
  return svgs[symbolId] || `<svg viewBox="0 0 20 20" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%;"><circle cx="10" cy="10" r="8" fill="${color}"/></svg>`;
}

function generateRoomDiagramHTML(room, devices, connections) {
  return `<!DOCTYPE html><html><head><style>body{margin:0;padding:20px;font-family:-apple-system,sans-serif;background:#F8FAFC;}.header{background:#3B82F6;color:white;padding:20px;border-radius:8px;margin-bottom:20px;}.title{font-size:24px;font-weight:700;}.devices{display:flex;flex-wrap:wrap;gap:15px;}.device{background:white;border-radius:8px;padding:15px;width:200px;box-shadow:0 2px 4px rgba(0,0,0,0.1);}.device-name{font-weight:600;}</style></head><body><div class="header"><div class="title">${room}</div><div>${devices.length} Devices</div></div><div class="devices">${devices.map(d => `<div class="device"><div class="device-name">${d.label || d.product?.brand}</div><div>${d.product?.model || ''}</div></div>`).join('')}</div></body></html>`;
}