import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const API_KEY = Deno.env.get('APITEMPLATE_API_KEY');

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
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!API_KEY) {
      return Response.json({ error: 'APITemplate API key not configured' }, { status: 500 });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      // ==========================================
      // TEMPLATE MANAGEMENT
      // ==========================================
      
      case 'listTemplates': {
        const result = await apiRequest('/v2/list-templates');
        return Response.json(result);
      }

      case 'getAccountInfo': {
        const result = await apiRequest('/v2/account-info');
        return Response.json(result);
      }

      // ==========================================
      // AV SYSTEM SPECIFIC - PDF GENERATION
      // ==========================================

      case 'generateInstallationPackage': {
        // Generate AV installation package PDF using template ID
        const { canvasProducts = [], connections = [], rooms = [], projectName, clientName, location, orgSettings } = params;
        const TEMPLATE_ID = 'c0377b23582ce40c';
        
        console.log('generateInstallationPackage called with:', {
          productsCount: canvasProducts?.length,
          connectionsCount: connections?.length,
          roomsCount: rooms?.length,
          projectName
        });

        // Build template data
        const uniqueRooms = [...new Set(canvasProducts.map(cp => cp.room).filter(Boolean))];
        if (uniqueRooms.length === 0) uniqueRooms.push('Unassigned');

        // Build HTML body content using Fusion CSS classes with page breaks
        const bodyHtml = `
<!-- Project Overview -->
<section class="keep-together">
  <h1>Project Overview</h1>

  <div class="highlight">
    <h3>Project Details</h3>
    <p><strong>Client:</strong> ${clientName || 'N/A'}</p>
    <p><strong>Location:</strong> ${location || 'N/A'}</p>
    <p><strong>Prepared by:</strong> ${user.full_name || user.email}</p>
  </div>

  <div class="info-box">
    <div class="info-box-title">System Summary</div>
    <p>
      <strong>${canvasProducts.length}</strong> Devices ·
      <strong>${connections.length}</strong> Connections ·
      <strong>${uniqueRooms.length}</strong> Rooms
    </p>
  </div>
</section>

<div class="page-break"></div>

<!-- Device Documentation -->
<section>
  <h1>Device Documentation</h1>

  ${uniqueRooms.map(room => {
    const roomDevices = canvasProducts.filter(cp => cp.room === room || (!cp.room && room === 'Unassigned'));
    if (roomDevices.length === 0) return '';
    return `
  <h2>${room}</h2>
  <table>
    <thead>
      <tr>
        <th>Label</th>
        <th>Brand / Model</th>
        <th>Category</th>
        <th>IP Address</th>
        <th>Switch / Port</th>
      </tr>
    </thead>
    <tbody>
      ${roomDevices.map(cp => {
        const category = (cp.product?.category || '').toLowerCase();
        const deviceColor = category.includes('network') || category.includes('switch') ? '#3b82f6' :  // blue - network
                            category.includes('media') || category.includes('streamer') ? '#10b981' :  // green - source
                            category.includes('receiver') || category.includes('amp') || category.includes('audio') ? '#f59e0b' :  // amber - audio
                            category.includes('projector') || category.includes('television') || category.includes('tv') ? '#8b5cf6' :  // purple - video
                            category.includes('control') ? '#ec4899' :  // pink - control
                            '#10b981';  // green - fallback (source)
        return `
      <tr>
        <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;font-family:monospace;color:#fff;background-color:${deviceColor};">${cp.label || cp.product?.brand || 'Device'}</span></td>
        <td><strong>${cp.product?.brand || ''}</strong> ${cp.product?.model || ''}</td>
        <td class="mono">${(cp.product?.category || '').replace(/_/g, ' ')}</td>
        <td class="mono">${cp.networkInfo?.ip && cp.networkInfo.ip !== '000.000.000.000' ? cp.networkInfo.ip : '-'}</td>
        <td class="mono">${cp.networkInfo?.sw ? `SW ${cp.networkInfo.sw}` : '-'} · ${cp.networkInfo?.port ? `Port ${cp.networkInfo.port}` : '-'}</td>
      </tr>
        `;
      }).join('')}
    </tbody>
  </table>
    `;
  }).join('')}
</section>

<div class="page-break"></div>

<!-- Cable Schedule -->
<section>
  <h1>Cable Schedule</h1>

  <table>
    <thead>
      <tr>
        <th>Wire ID</th>
        <th>Type</th>
        <th>From</th>
        <th>To</th>
        <th>Ports</th>
      </tr>
    </thead>
    <tbody>
      ${connections.map((conn, i) => {
        const fromDevice = canvasProducts.find(cp => cp.instanceId === conn.from);
        const toDevice = canvasProducts.find(cp => cp.instanceId === conn.to);
        const wireId = conn.wireId || `C${i + 1}`;
        const prefix = wireId?.[0] || '';
        const wireColor = prefix === 'V' ? '#8b5cf6' :  // purple - video
                          prefix === 'A' ? '#f59e0b' :  // amber - audio
                          prefix === 'N' ? '#3b82f6' :  // blue - network
                          prefix === 'C' ? '#ec4899' :  // pink - control
                          prefix === 'P' ? '#ef4444' :  // red - power
                          '#3b82f6';                    // blue - fallback
        return `
      <tr>
        <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;font-family:monospace;color:#fff;background-color:${wireColor};">${wireId}</span></td>
        <td class="mono">${conn.type || '-'}</td>
        <td class="mono">${fromDevice?.label || fromDevice?.product?.brand || 'Unknown'}</td>
        <td class="mono">${toDevice?.label || toDevice?.product?.brand || 'Unknown'}</td>
        <td class="mono">${conn.fromPort || '?'} → ${conn.toPort || '?'}</td>
      </tr>
        `;
      }).join('')}
    </tbody>
  </table>
</section>

<div class="page-break"></div>

<!-- Room Overview -->
<section>
  <h1>Room Overview</h1>

  ${uniqueRooms.map(room => {
    const roomDevices = canvasProducts.filter(cp => cp.room === room || (!cp.room && room === 'Unassigned'));
    if (roomDevices.length === 0) return '';
    return `
  <h2>${room}</h2>
  <ul>
    ${roomDevices.map(cp => `
    <li>${cp.label || cp.product?.brand || 'Device'} · ${cp.product?.brand || ''} ${cp.product?.model || ''}</li>
    `).join('')}
  </ul>
    `;
  }).join('')}
</section>

<div class="page-break"></div>

<!-- Sign-off -->
<section class="keep-together">
  <h1>Sign-off</h1>

  <div class="info-box">
    <div class="info-box-title">Client Approval</div>
    <p>
      The client acknowledges that the above AV system design has been reviewed and approved
      for installation.
    </p>
  </div>

  <table>
    <tbody>
      <tr>
        <td style="width: 50%;">
          <p><strong>Client Name</strong></p>
          <p>______________________________</p>
          <p>Date: ________________________</p>
        </td>
        <td style="width: 50%;">
          <p><strong>Prepared By</strong></p>
          <p>______________________________</p>
          <p>Date: ________________________</p>
        </td>
      </tr>
    </tbody>
  </table>
</section>
        `;

        // Template data payload - matches your template variables
        const templateData = {
          title: projectName || 'AV System Design',
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          body: bodyHtml
        };

        console.log('Sending request to APITemplate with template ID:', TEMPLATE_ID);
        console.log('Template data:', JSON.stringify(templateData).substring(0, 500));
        
        try {
          const response = await fetch(`https://rest.apitemplate.io/v2/create-pdf?template_id=${TEMPLATE_ID}&expiration=1440`, {
            method: 'POST',
            headers: {
              'X-API-KEY': API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(templateData)
          });

          const responseText = await response.text();
          console.log('APITemplate response status:', response.status);
          console.log('APITemplate response:', responseText.substring(0, 500));

          if (!response.ok) {
            return Response.json({ 
              error: `APITemplate error: ${response.status}`, 
              details: responseText 
            }, { status: 500 });
          }

          const result = JSON.parse(responseText);
          console.log('Parsed result:', result);
          return Response.json(result);
        } catch (fetchError) {
          console.error('Fetch error:', fetchError);
          return Response.json({ error: `API request failed: ${fetchError.message}` }, { status: 500 });
        }
      }

      case 'generateDeviceLabel': {
        // Generate device label image using v2 create-image endpoint
        const { device, size } = params;
        
        const html = generateDeviceLabelHTML(device, size);
        
        const response = await fetch('https://rest.apitemplate.io/v2/create-image?expiration=1440', {
          method: 'POST',
          headers: {
            'X-API-KEY': API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            body: html,
            settings: {
              image_type: 'png',
              width: size?.width || 400,
              height: size?.height || 200
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          return Response.json({ error: `APITemplate error: ${response.status}`, details: errorText }, { status: response.status });
        }

        const result = await response.json();
        return Response.json(result);
      }

      case 'generateCableLabel': {
        // Generate cable label image
        const { connection, fromDevice, toDevice, size } = params;
        
        const html = generateCableLabelHTML(connection, fromDevice, toDevice, size);
        
        const response = await fetch('https://rest.apitemplate.io/v2/create-image?expiration=1440', {
          method: 'POST',
          headers: {
            'X-API-KEY': API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            body: html,
            settings: {
              image_type: 'png',
              width: size?.width || 300,
              height: size?.height || 100
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          return Response.json({ error: `APITemplate error: ${response.status}`, details: errorText }, { status: response.status });
        }

        const result = await response.json();
        return Response.json(result);
      }

      case 'generateRoomDiagram': {
        // Generate room diagram as image
        const { room, devices = [], connections: roomConnections = [] } = params;
        
        console.log('generateRoomDiagram called with:', JSON.stringify({
          room,
          devicesCount: devices?.length,
          connectionsCount: roomConnections?.length,
          devicesSample: devices?.slice(0, 2)
        }));

        if (!room) {
          return Response.json({ error: 'Room name is required' }, { status: 400 });
        }

        if (!devices || devices.length === 0) {
          return Response.json({ error: 'No devices in this room' }, { status: 400 });
        }
        
        const html = generateRoomDiagramHTML(room, devices, roomConnections);
        console.log('Generated HTML length:', html.length);
        
        try {
          // APITemplate.io v2 uses /v2/create-image for HTML to image
          const response = await fetch('https://rest.apitemplate.io/v2/create-image?expiration=1440', {
            method: 'POST',
            headers: {
              'X-API-KEY': API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              body: html,
              settings: {
                image_type: 'png',
                width: 1200,
                height: 800
              }
            })
          });

          const responseText = await response.text();
          console.log('APITemplate response status:', response.status);
          console.log('APITemplate response:', responseText.substring(0, 500));

          if (!response.ok) {
            return Response.json({ 
              error: `APITemplate error: ${response.status}`, 
              details: responseText 
            }, { status: response.status });
          }

          const result = JSON.parse(responseText);
          return Response.json(result);
        } catch (error) {
          console.error('Room diagram generation error:', error);
          return Response.json({ error: error.message }, { status: 500 });
        }
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('APITemplate service error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ==========================================
// HTML GENERATORS FOR AV SYSTEM
// ==========================================

function generateInstallationPackageHTML({ canvasProducts, connections, rooms, projectName, clientName, location, orgSettings, generatedBy }) {
  const uniqueRooms = [...new Set(canvasProducts.map(cp => cp.room).filter(Boolean))];
  if (uniqueRooms.length === 0) uniqueRooms.push('Unassigned');

  const categoryColors = {
    televisions: '#3B82F6',
    projectors: '#8B5CF6',
    projector_screens: '#D946EF',
    video_distribution: '#06B6D4',
    matrix_switchers: '#14B8A6',
    audio_streamers: '#EC4899',
    media_streamers: '#F43F5E',
    speakers: '#22C55E',
    soundbars: '#84CC16',
    subwoofers: '#EF4444',
    stereo_amps: '#F97316',
    multizone_amps: '#F59E0B',
    surround_processors: '#EAB308',
    av_receivers: '#10B981',
    network_switches: '#64748B',
    control_processors: '#8B5CF6'
  };

  const cableColors = {
    'HDMI': '#E74C3C',
    'HDBaseT': '#E91E63',
    'Optical': '#2A7FDB',
    'RCA': '#FFB300',
    'XLR': '#1ABC9C',
    'Speaker Wire': '#8E5C2C',
    'Ethernet': '#27AE60',
    'USB': '#2A7FDB',
    'RS232': '#7F8C8D',
    'Control': '#7F8C8D'
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1F2937; line-height: 1.5; }
    
    .page { page-break-after: always; min-height: 100vh; }
    .page:last-child { page-break-after: avoid; }
    
    /* Cover Page */
    .cover { background: #111827; color: white; display: flex; flex-direction: column; }
    .cover-header { background: #0F172A; padding: 40px; text-align: center; }
    .cover-logo { max-width: 150px; max-height: 60px; margin-bottom: 20px; }
    .cover-main { flex: 1; background: #1E293B; padding: 60px 40px; text-align: center; }
    .cover-title { font-size: 32px; font-weight: 700; margin-bottom: 10px; }
    .cover-subtitle { color: #3B82F6; font-size: 14px; margin-bottom: 40px; }
    .cover-info { margin-bottom: 20px; }
    .cover-label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .cover-value { color: white; font-size: 16px; font-weight: 600; margin-top: 4px; }
    .cover-footer { background: #111827; padding: 40px; }
    .stats { display: flex; justify-content: space-around; margin-bottom: 30px; }
    .stat { text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; }
    .stat-label { color: #64748B; font-size: 10px; margin-top: 4px; }
    .footer-text { color: #64748B; font-size: 10px; text-align: center; }
    
    /* Section Headers */
    .section-header { background: #111827; color: white; padding: 20px 30px; margin-bottom: 20px; }
    .section-title { font-size: 20px; font-weight: 700; }
    .section-subtitle { color: #64748B; font-size: 12px; }
    
    /* Device Cards */
    .devices-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 0 20px; }
    .device-card { background: #F8FAFC; border-radius: 8px; padding: 15px; border-left: 4px solid #3B82F6; }
    .device-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .device-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: 700; }
    .device-name { font-size: 14px; font-weight: 600; }
    .device-category { font-size: 10px; color: #64748B; background: #E2E8F0; padding: 2px 8px; border-radius: 10px; }
    .device-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; }
    .device-info-label { color: #64748B; }
    .device-info-value { color: #1F2937; }
    
    /* Cable Schedule */
    .cable-table { width: 100%; border-collapse: collapse; margin: 20px; font-size: 11px; }
    .cable-table th { background: #1F2937; color: white; padding: 10px; text-align: left; }
    .cable-table td { padding: 10px; border-bottom: 1px solid #E5E7EB; }
    .cable-table tr:nth-child(even) { background: #F9FAFB; }
    .cable-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-weight: 600; font-size: 10px; }
    
    /* Room Sections */
    .room-header { background: #3B82F6; color: white; padding: 25px 30px; }
    .room-title { font-size: 22px; font-weight: 700; }
    .room-count { font-size: 12px; opacity: 0.8; }
    .room-device { background: #F8FAFC; border-radius: 8px; padding: 15px; margin: 10px 20px; display: flex; align-items: center; gap: 15px; }
    .room-device-icon { width: 50px; height: 50px; background: #3B82F6; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; }
    .room-device-info { flex: 1; }
    .room-device-name { font-weight: 600; font-size: 14px; }
    .room-device-model { color: #64748B; font-size: 12px; }
    .room-device-network { text-align: right; font-size: 11px; color: #64748B; }
    
    /* Sign-off */
    .signoff-field { margin: 20px 30px; }
    .signoff-label { color: #64748B; font-size: 12px; margin-bottom: 5px; }
    .signoff-line { border-bottom: 1px solid #9CA3AF; height: 30px; }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="page cover">
    <div class="cover-header">
      ${orgSettings?.logo_url ? `<img src="${orgSettings.logo_url}" class="cover-logo" alt="Logo">` : ''}
    </div>
    <div class="cover-main">
      <div class="cover-title">${projectName || 'AV System Design'}</div>
      <div class="cover-subtitle">Installation Package</div>
      
      ${clientName ? `
      <div class="cover-info">
        <div class="cover-label">Prepared For</div>
        <div class="cover-value">${clientName}</div>
      </div>
      ` : ''}
      
      ${location ? `
      <div class="cover-info">
        <div class="cover-label">Location</div>
        <div class="cover-value">${location}</div>
      </div>
      ` : ''}
      
      <div class="cover-info">
        <div class="cover-label">Date</div>
        <div class="cover-value">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
    </div>
    <div class="cover-footer">
      <div class="stats">
        <div class="stat">
          <div class="stat-value" style="color: #3B82F6">${canvasProducts.length}</div>
          <div class="stat-label">Devices</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #22C55E">${connections.length}</div>
          <div class="stat-label">Connections</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #F59E0B">${uniqueRooms.length}</div>
          <div class="stat-label">Rooms</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #8B5CF6">${connections.length}</div>
          <div class="stat-label">Cable Runs</div>
        </div>
      </div>
      <div class="footer-text">Generated by ${generatedBy}<br>Powered by AV System Designer</div>
    </div>
  </div>

  <!-- Device Documentation -->
  <div class="page">
    <div class="section-header">
      <div class="section-title">Device Documentation</div>
      <div class="section-subtitle">${canvasProducts.length} Devices</div>
    </div>
    <div class="devices-grid">
      ${canvasProducts.map(cp => {
        const catColor = categoryColors[cp.product.category] || '#64748B';
        const deviceConnections = connections.filter(c => c.from === cp.instanceId || c.to === cp.instanceId);
        return `
        <div class="device-card" style="border-left-color: ${catColor}">
          <div class="device-header">
            <div class="device-icon" style="background: ${catColor}">${(cp.product.category || 'DV').substring(0, 2).toUpperCase()}</div>
            <div>
              <div class="device-name">${cp.label || cp.product.brand}</div>
              <span class="device-category">${(cp.product.category || '').replace(/_/g, ' ')}</span>
            </div>
          </div>
          <div class="device-info">
            <div><span class="device-info-label">Model:</span> <span class="device-info-value">${cp.product.model || '-'}</span></div>
            <div><span class="device-info-label">Room:</span> <span class="device-info-value">${cp.room || 'Unassigned'}</span></div>
            <div><span class="device-info-label">IP:</span> <span class="device-info-value">${cp.networkInfo?.ip && cp.networkInfo.ip !== '000.000.000.000' ? cp.networkInfo.ip : '-'}</span></div>
            <div><span class="device-info-label">Connections:</span> <span class="device-info-value">${deviceConnections.length}</span></div>
          </div>
        </div>
        `;
      }).join('')}
    </div>
  </div>

  <!-- Cable Schedule -->
  <div class="page">
    <div class="section-header">
      <div class="section-title">Cable Schedule</div>
      <div class="section-subtitle">${connections.length} Connections</div>
    </div>
    <table class="cable-table">
      <thead>
        <tr>
          <th>Cable ID</th>
          <th>From Device</th>
          <th>From Port</th>
          <th>To Device</th>
          <th>To Port</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        ${connections.map((conn, i) => {
          const fromDevice = canvasProducts.find(cp => cp.instanceId === conn.from);
          const toDevice = canvasProducts.find(cp => cp.instanceId === conn.to);
          const cableColor = cableColors[conn.type] || '#64748B';
          return `
          <tr>
            <td><span class="cable-badge" style="background: ${cableColor}">${conn.wireId || `C${i + 1}`}</span></td>
            <td>${fromDevice?.label || fromDevice?.product?.brand || 'Unknown'}</td>
            <td>${conn.fromPort || '-'}</td>
            <td>${toDevice?.label || toDevice?.product?.brand || 'Unknown'}</td>
            <td>${conn.toPort || '-'}</td>
            <td style="color: ${cableColor}; font-weight: 600">${conn.type || '-'}</td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>

  <!-- Room Pages -->
  ${uniqueRooms.map(room => {
    const roomDevices = canvasProducts.filter(cp => cp.room === room || (!cp.room && room === 'Unassigned'));
    if (roomDevices.length === 0) return '';
    return `
    <div class="page">
      <div class="room-header">
        <div class="room-title">${room}</div>
        <div class="room-count">${roomDevices.length} Devices</div>
      </div>
      ${roomDevices.map(cp => {
        const deviceConnections = connections.filter(c => c.from === cp.instanceId || c.to === cp.instanceId);
        const inputConns = deviceConnections.filter(c => c.to === cp.instanceId).length;
        const outputConns = deviceConnections.filter(c => c.from === cp.instanceId).length;
        return `
        <div class="room-device">
          <div class="room-device-icon">${(cp.product.category || 'DV').substring(0, 2).toUpperCase()}</div>
          <div class="room-device-info">
            <div class="room-device-name">${cp.label || cp.product.brand}</div>
            <div class="room-device-model">${cp.product.brand} ${cp.product.model}</div>
            <div style="color: #64748B; font-size: 11px; margin-top: 4px;">Inputs: ${inputConns} | Outputs: ${outputConns}</div>
          </div>
          <div class="room-device-network">
            ${cp.networkInfo?.ip && cp.networkInfo.ip !== '000.000.000.000' ? `IP: ${cp.networkInfo.ip}<br>` : ''}
            ${cp.networkInfo?.mac && cp.networkInfo.mac !== '00:00:00:00:00:00' ? `MAC: ${cp.networkInfo.mac}` : ''}
          </div>
        </div>
        `;
      }).join('')}
    </div>
    `;
  }).join('')}

  <!-- Sign-off Page -->
  <div class="page">
    <div class="section-header">
      <div class="section-title">Project Sign-Off</div>
    </div>
    <p style="padding: 20px 30px; color: #64748B;">This document certifies that the AV system installation has been completed according to specifications and has been tested and verified.</p>
    
    <div class="signoff-field"><div class="signoff-label">Installer Name:</div><div class="signoff-line"></div></div>
    <div class="signoff-field"><div class="signoff-label">Installer Signature:</div><div class="signoff-line"></div></div>
    <div class="signoff-field"><div class="signoff-label">Client Name:</div><div class="signoff-line"></div></div>
    <div class="signoff-field"><div class="signoff-label">Client Signature:</div><div class="signoff-line"></div></div>
    <div class="signoff-field"><div class="signoff-label">Completion Date:</div><div class="signoff-line"></div></div>
    
    <div style="position: absolute; bottom: 30px; left: 0; right: 0; text-align: center; color: #9CA3AF; font-size: 10px;">
      ${projectName || 'AV System Design'} - Installation Package<br>
      Generated ${new Date().toLocaleDateString()}
    </div>
  </div>
</body>
</html>
  `;
}

function generateDeviceLabelHTML(device, size) {
  const categoryColors = {
    televisions: '#3B82F6', projectors: '#8B5CF6', speakers: '#22C55E',
    av_receivers: '#10B981', network_switches: '#64748B'
  };
  const color = categoryColors[device.product?.category] || '#64748B';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 15px; font-family: -apple-system, sans-serif; background: white; }
    .label { border: 2px solid ${color}; border-radius: 8px; padding: 15px; }
    .header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .icon { width: 40px; height: 40px; background: ${color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
    .name { font-size: 18px; font-weight: 700; }
    .model { color: #64748B; font-size: 12px; }
    .info { font-size: 11px; color: #374151; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="label">
    <div class="header">
      <div class="icon">${(device.product?.category || 'DV').substring(0, 2).toUpperCase()}</div>
      <div>
        <div class="name">${device.label || device.product?.brand || 'Device'}</div>
        <div class="model">${device.product?.model || ''}</div>
      </div>
    </div>
    <div class="info">
      ${device.room ? `Room: ${device.room}<br>` : ''}
      ${device.networkInfo?.ip && device.networkInfo.ip !== '000.000.000.000' ? `IP: ${device.networkInfo.ip}` : ''}
    </div>
  </div>
</body>
</html>
  `;
}

function generateCableLabelHTML(connection, fromDevice, toDevice) {
  const cableColors = {
    'HDMI': '#E74C3C', 'Ethernet': '#27AE60', 'Optical': '#2A7FDB',
    'Speaker Wire': '#8E5C2C', 'RCA': '#FFB300'
  };
  const color = cableColors[connection.type] || '#64748B';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 10px; font-family: -apple-system, sans-serif; background: white; }
    .label { background: ${color}; color: white; border-radius: 6px; padding: 12px 15px; }
    .wire-id { font-size: 16px; font-weight: 700; margin-bottom: 5px; }
    .route { font-size: 11px; opacity: 0.9; }
    .type { font-size: 10px; opacity: 0.8; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="label">
    <div class="wire-id">${connection.wireId || 'CABLE'}</div>
    <div class="route">${fromDevice?.label || 'Source'} → ${toDevice?.label || 'Destination'}</div>
    <div class="type">${connection.type || 'Unknown'} | ${connection.fromPort || '?'} → ${connection.toPort || '?'}</div>
  </div>
</body>
</html>
  `;
}

function generateRoomDiagramHTML(room, devices, connections) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 20px; font-family: -apple-system, sans-serif; background: #F8FAFC; }
    .header { background: #3B82F6; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .title { font-size: 24px; font-weight: 700; }
    .count { opacity: 0.8; font-size: 14px; }
    .devices { display: flex; flex-wrap: wrap; gap: 15px; }
    .device { background: white; border-radius: 8px; padding: 15px; width: 200px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .device-name { font-weight: 600; margin-bottom: 5px; }
    .device-info { font-size: 12px; color: #64748B; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${room}</div>
    <div class="count">${devices.length} Devices</div>
  </div>
  <div class="devices">
    ${devices.map(d => `
      <div class="device">
        <div class="device-name">${d.label || d.product?.brand}</div>
        <div class="device-info">${d.product?.model || ''}</div>
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;
}