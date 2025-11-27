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
                const { canvasProducts = [], connections = [], rooms = [], projectName, clientName, location, orgSettings, exportType = 'installer' } = params;
                const TEMPLATE_ID = 'c0377b23582ce40c';

                // Export type flags
                const isInstaller = exportType === 'installer' || exportType === 'documentation';
                const isClient = exportType === 'client' || exportType === 'documentation';
                const showWireSchedule = isInstaller;
                const showDeviceConnections = isInstaller;
                const showPricing = isClient;
                const showLabor = isClient;
        
        console.log('generateInstallationPackage called with:', {
          productsCount: canvasProducts?.length,
          connectionsCount: connections?.length,
          roomsCount: rooms?.length,
          projectName
        });

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

        // Build HTML body content based on export type
        const exportTypeTitle = exportType === 'client' ? 'Client Proposal' : exportType === 'documentation' ? 'Full Documentation' : 'Installation Package';
        
        // Calculate totals for pricing sections
        const totalDevicePrice = canvasProducts.reduce((sum, cp) => sum + (cp.product?.price || 0), 0);
        const totalInstallLabor = canvasProducts.reduce((sum, cp) => sum + (cp.product?.installation_labor || 0), 0);
        
        // Calculate cable labor from wire pricing
        let cableLaborTotal = 0;
        connections.forEach(conn => {
          const wireType = conn.type || '';
          const pricing = wirePricingData.find(wp => 
            wp.wire_type?.toLowerCase() === wireType.toLowerCase()
          );
          if (pricing?.labor_price_per_run) {
            cableLaborTotal += pricing.labor_price_per_run;
          }
        });
        
        // Get labor rates from org settings
        const laborRates = orgSettings?.labor_rates || {};
        const designEngineeringRate = laborRates.design_engineering_rate || 0;
        const equipmentInstallationRate = laborRates.equipment_installation_rate || 0;
        const systemProgrammingRate = laborRates.system_programming_rate || 0;
        
        // Calculate labor subtotal
        const laborSubtotal = designEngineeringRate + equipmentInstallationRate + cableLaborTotal + systemProgrammingRate;
        
        // Grand total
        const grandTotal = totalDevicePrice + totalInstallLabor + laborSubtotal;
        
        const bodyHtml = `
<!-- Project Overview -->
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
    <p>
      <strong>${canvasProducts.length}</strong> Devices ·
      <strong>${connections.length}</strong> Connections ·
      <strong>${uniqueRooms.length}</strong> Rooms
    </p>
  </div>
</section>

<div class="page-break"></div>

${isClient ? `
<!-- Scope of Work -->
<section class="keep-together">
  <h1>Scope of Work</h1>
  
  <div class="info-box">
    <div class="info-box-title">Project Scope</div>
    <p>This proposal includes the design, supply, and installation of a complete audio/video system across ${uniqueRooms.length} room(s).</p>
  </div>

  <h2>Rooms Included</h2>
  <ul>
    ${uniqueRooms.map(room => {
      const roomDevices = canvasProducts.filter(cp => cp.room === room || (!cp.room && room === 'Unassigned'));
      return `<li><strong>${room}</strong> - ${roomDevices.length} device(s)</li>`;
    }).join('')}
  </ul>
</section>

<div class="page-break"></div>

<!-- Devices Per Room -->
<section>
  <h1>Equipment by Room</h1>

  ${uniqueRooms.map(room => {
    const roomDevices = canvasProducts.filter(cp => cp.room === room || (!cp.room && room === 'Unassigned'));
    if (roomDevices.length === 0) return '';
    return `
  <h2>${room}</h2>
  <table>
    <thead>
      <tr>
        <th>Equipment</th>
        <th>Brand / Model</th>
        <th>Category</th>
        ${showPricing ? '<th style="text-align:right;">Price</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${roomDevices.map(cp => `
      <tr>
        <td>${cp.label || 'Device'}</td>
        <td><strong>${cp.product?.brand || ''}</strong> ${cp.product?.model || ''}</td>
        <td>${(cp.product?.category || '').replace(/_/g, ' ')}</td>
        ${showPricing ? `<td style="text-align:right;">$${(cp.product?.price || 0).toLocaleString()}</td>` : ''}
      </tr>
      `).join('')}
    </tbody>
  </table>
    `;
  }).join('')}
</section>

<div class="page-break"></div>

<!-- Bill of Materials with Pricing -->
<section>
  <h1>Bill of Materials</h1>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Brand / Model</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:right;">Install Labor</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${(() => {
        const grouped = {};
        canvasProducts.forEach(cp => {
          const key = `${cp.product?.brand}-${cp.product?.model}`;
          if (!grouped[key]) {
            grouped[key] = { product: cp.product, count: 0 };
          }
          grouped[key].count++;
        });
        return Object.values(grouped).map(item => `
      <tr>
        <td>${(item.product?.category || '').replace(/_/g, ' ')}</td>
        <td><strong>${item.product?.brand || ''}</strong> ${item.product?.model || ''}</td>
        <td style="text-align:center;">${item.count}</td>
        <td style="text-align:right;">$${(item.product?.price || 0).toLocaleString()}</td>
        <td style="text-align:right;">$${(item.product?.installation_labor || 0).toLocaleString()}</td>
        <td style="text-align:right;">$${(((item.product?.price || 0) + (item.product?.installation_labor || 0)) * item.count).toLocaleString()}</td>
      </tr>
        `).join('');
      })()}
      <tr style="font-weight:bold;background-color:#f1f5f9;">
        <td colspan="4" style="text-align:right;">Equipment Subtotal:</td>
        <td style="text-align:right;">$${totalInstallLabor.toLocaleString()}</td>
        <td style="text-align:right;">$${(totalDevicePrice + totalInstallLabor).toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  ${showLabor ? `
  <div class="keep-together">
    <h2>Labor & Installation</h2>
    <table>
      <tbody>
        <tr>
          <td>System Design & Engineering</td>
          <td style="text-align:right;">${designEngineeringRate === 0 ? 'Included' : '$' + designEngineeringRate.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Equipment Installation</td>
          <td style="text-align:right;">${equipmentInstallationRate > 0 ? '$' + equipmentInstallationRate.toLocaleString() : 'TBD'}</td>
        </tr>
        <tr>
          <td>Cable Runs & Termination (${connections.length} runs)</td>
          <td style="text-align:right;">${cableLaborTotal > 0 ? '$' + cableLaborTotal.toLocaleString() : 'TBD'}</td>
        </tr>
        <tr>
          <td>System Programming & Testing</td>
          <td style="text-align:right;">${systemProgrammingRate > 0 ? '$' + systemProgrammingRate.toLocaleString() : 'TBD'}</td>
        </tr>
        <tr style="font-weight:bold;background-color:#f1f5f9;">
          <td>Labor Subtotal:</td>
          <td style="text-align:right;">${laborSubtotal > 0 ? '$' + laborSubtotal.toLocaleString() : 'TBD'}</td>
        </tr>
      </tbody>
    </table>

    <div class="highlight" style="margin-top:20px;">
      <h3>Project Total</h3>
      <p style="font-size:18px;font-weight:bold;">Equipment + Labor: $${grandTotal.toLocaleString()}</p>
      <p style="font-size:12px;color:#64748b;">Equipment: $${totalDevicePrice.toLocaleString()} | Device Install: $${totalInstallLabor.toLocaleString()} | Other Labor: $${laborSubtotal.toLocaleString()}</p>
    </div>
  </div>
  ` : `
  <div class="highlight" style="margin-top:20px;">
    <h3>Project Total</h3>
    <p style="font-size:18px;font-weight:bold;">Equipment + Labor: $${grandTotal.toLocaleString()}</p>
    <p style="font-size:12px;color:#64748b;">Equipment: $${totalDevicePrice.toLocaleString()} | Device Install: $${totalInstallLabor.toLocaleString()} | Other Labor: $${laborSubtotal.toLocaleString()}</p>
  </div>
  `}
</section>

<div class="page-break"></div>
` : ''}

${isInstaller ? `
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
        const deviceColor = 
          category === 'network_switches' ? '#3b82f6' :
          category === 'media_streamers' ? '#f43f5e' :
          category === 'audio_streamers' ? '#ec4899' :
          category === 'av_receivers' ? '#f59e0b' :
          category === 'surround_processors' ? '#eab308' :
          category === 'stereo_amps' ? '#f97316' :
          category === 'multizone_amps' ? '#f59e0b' :
          category === 'projectors' ? '#8b5cf6' :
          category === 'projector_screens' ? '#a855f7' :
          category === 'televisions' ? '#6366f1' :
          category === 'speakers' ? '#22c55e' :
          category === 'soundbars' ? '#84cc16' :
          category === 'subwoofers' ? '#ef4444' :
          category === 'video_distribution' ? '#06b6d4' :
          category === 'matrix_switchers' ? '#14b8a6' :
          category === 'hdmi_extenders' ? '#0ea5e9' :
          category === 'control_processors' ? '#ec4899' :
          '#64748b';
        return `
      <tr>
        <td><span style="display:inline-block;min-width:60px;max-width:60px;width:60px;padding:3px 4px;border-radius:4px;font-size:8px;font-weight:700;font-family:monospace;color:#fff;background-color:${deviceColor};text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${cp.label || cp.product?.brand || 'Device'}</span></td>
        <td><strong style="font-size:14px;">${cp.product?.brand || ''}</strong> <span style="font-size:10px;">${cp.product?.model || ''}</span></td>
        <td class="mono" style="font-size:12px;">${(cp.product?.category || '').replace(/_/g, ' ')}</td>
        <td class="mono" style="font-size:9px;">${cp.networkInfo?.ip && cp.networkInfo.ip !== '000.000.000.000' ? cp.networkInfo.ip : '-'}</td>
        <td class="mono" style="font-size:9px;">${cp.networkInfo?.sw ? `SW ${cp.networkInfo.sw}` : '-'} · ${cp.networkInfo?.port ? `Port ${cp.networkInfo.port}` : '-'}</td>
      </tr>
        `;
      }).join('')}
    </tbody>
  </table>
    `;
  }).join('')}
</section>

<!-- Wire Schedule -->
${showWireSchedule && connections.length > 0 ? `
<div class="page-break"></div>
<section>
  <h1>Wire Schedule</h1>

  <table>
    <thead>
      <tr>
        <th>Wire ID</th>
        <th>Type</th>
        <th>Spec</th>
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
        const connType = (conn.type || '').toLowerCase();
        const wireColor = 
          connType === 'hdmi' ? '#e74c3c' :
          connType === 'hdbaset' ? '#e91e63' :
          connType === 'ethernet' ? '#27ae60' :
          connType === 'optical' || connType === 'optical/toslink' ? '#2a7fdb' :
          connType === 'rca' ? '#ffb300' :
          connType === 'xlr' ? '#1abc9c' :
          connType === 'speaker wire' ? '#8e5c2c' :
          connType === 'coaxial' ? '#9b59b6' :
          connType === 'usb' ? '#2a7fdb' :
          connType === 'rs232' ? '#7f8c8d' :
          connType === 'control' ? '#7f8c8d' :
          connType === 'subwoofer' ? '#e74c3c' :
          connType === 'component' ? '#2ecc71' :
          connType === 'composite' ? '#f1c40f' :
          connType === 'vga' ? '#3498db' :
          connType === '3.5mm jack' ? '#95a5a6' :
          '#64748b';
        return `
      <tr>
        <td><span style="display:inline-block;min-width:40px;max-width:40px;width:40px;padding:2px 4px;border-radius:4px;font-size:9px;font-weight:700;font-family:monospace;color:#fff;background-color:${wireColor};text-align:center;">${wireId}</span></td>
        <td class="mono" style="font-size:14px;">${conn.type || '-'}</td>
        <td class="mono" style="font-size:11px;">${conn.wireSpec || '-'}</td>
        <td class="mono"><span style="font-size:12px;">${fromDevice?.room || 'Unassigned'}</span><br><strong style="font-size:14px;">${fromDevice?.label || fromDevice?.product?.brand || 'Unknown'}</strong></td>
        <td class="mono"><span style="font-size:12px;">${toDevice?.room || 'Unassigned'}</span><br><strong style="font-size:14px;">${toDevice?.label || toDevice?.product?.brand || 'Unknown'}</strong></td>
        <td class="mono" style="font-size:12px;">${conn.fromPort || '?'} → ${conn.toPort || '?'}</td>
      </tr>
        `;
      }).join('')}
    </tbody>
  </table>
</section>
` : ''}

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
` : ''}

<!-- Sign-off -->
<section class="keep-together">
  <h1>${isClient ? 'Proposal Acceptance' : 'Installation Sign-off'}</h1>

  <div class="info-box">
    <div class="info-box-title">${isClient ? 'Client Acceptance' : 'Client Approval'}</div>
    <p>
      ${isClient 
        ? 'By signing below, the client accepts this proposal and authorizes the work to proceed as described.'
        : 'The client acknowledges that the above AV system design has been reviewed and approved for installation.'}
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
          title: `${projectName || 'AV System Design'} - ${exportTypeTitle}`,
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