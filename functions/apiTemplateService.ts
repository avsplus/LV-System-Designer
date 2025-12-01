import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const API_KEY = Deno.env.get('APITEMPLATE_API_KEY');

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
        const { canvasProducts = [], connections = [], rooms = [], projectName, clientName, location, orgSettings, exportType = 'installer' } = params;
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
    const roomDevices = canvasProducts.filter(cp => cp.room === room || (!cp.room && room === 'Unassigned'));
    if (roomDevices.length === 0) return '';
    return `<li><strong>${room}:</strong> ${roomDevices.length} device(s)</li>`;
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
            const roomDevices = canvasProducts.filter(cp => cp.room === room || (!cp.room && room === 'Unassigned'));
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
              wireCounts[key] = { count: 0, type: wireType, spec: wireSpec, materialCost: 0 };
            }
            wireCounts[key].count++;
            const pricing = wirePricingData.find(wp => wp.wire_type?.toLowerCase() === wireType.toLowerCase());
            if (pricing?.material_price_per_foot) {
              // Estimate 50ft per run as default
              const estLength = conn.length || 50;
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
          ${showLabor ? `<h2>Labor & Installation</h2><table><tbody><tr><td>System Design & Engineering</td><td style="text-align:right;">${designEngineeringRate === 0 ? 'Included' : '$' + designEngineeringRate.toLocaleString()}</td></tr><tr><td>Equipment Installation</td><td style="text-align:right;">${equipmentInstallationTotal > 0 ? '$' + equipmentInstallationTotal.toLocaleString() : 'TBD'}</td></tr><tr><td>Cable Runs & Termination</td><td style="text-align:right;">${cableTerminationTotal > 0 ? '$' + cableTerminationTotal.toLocaleString() : 'TBD'}</td></tr><tr><td>System Programming</td><td style="text-align:right;">${systemProgrammingTotal > 0 ? '$' + systemProgrammingTotal.toLocaleString() : 'TBD'}</td></tr><tr style="font-weight:bold;background-color:#f1f5f9;"><td>Labor Subtotal:</td><td style="text-align:right;">${laborSubtotal > 0 ? '$' + laborSubtotal.toLocaleString() : 'TBD'}</td></tr></tbody></table>` : ''}
          <div class="highlight" style="margin-top:20px;"><h3>Project Total</h3><p style="font-size:18px;font-weight:bold;">Equipment + Cabling + Labor: $${(materialsSubtotal + laborSubtotal).toLocaleString()}</p></div>
          </section>
          <div class="page-break"></div>`;
        }

        // Part 6: Device Documentation (INSTALLER ONLY)
        if (isInstaller) {
          let deviceDocHtml = '';
          uniqueRooms.forEach(room => {
            const roomDevices = canvasProducts.filter(cp => cp.room === room || (!cp.room && room === 'Unassigned'));
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

function generateRoomDiagramHTML(room, devices, connections) {
  return `<!DOCTYPE html><html><head><style>body{margin:0;padding:20px;font-family:-apple-system,sans-serif;background:#F8FAFC;}.header{background:#3B82F6;color:white;padding:20px;border-radius:8px;margin-bottom:20px;}.title{font-size:24px;font-weight:700;}.devices{display:flex;flex-wrap:wrap;gap:15px;}.device{background:white;border-radius:8px;padding:15px;width:200px;box-shadow:0 2px 4px rgba(0,0,0,0.1);}.device-name{font-weight:600;}</style></head><body><div class="header"><div class="title">${room}</div><div>${devices.length} Devices</div></div><div class="devices">${devices.map(d => `<div class="device"><div class="device-name">${d.label || d.product?.brand}</div><div>${d.product?.model || ''}</div></div>`).join('')}</div></body></html>`;
}