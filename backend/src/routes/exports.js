import { requireAuth } from '../lib/auth.js';
import { config } from '../config.js';

const canExport = (role) => ['owner', 'administrator', 'collaborator'].includes(role);

const getTemplateIdForType = (exportType) => {
  // Prefer per-type overrides, fall back to one shared template.
  if (exportType === 'client') return sanitize(config.apiTemplateTemplateClient || config.apiTemplateTemplateDefault);
  if (exportType === 'documentation') return sanitize(config.apiTemplateTemplateDocumentation || config.apiTemplateTemplateDefault);
  return sanitize(config.apiTemplateTemplateInstaller || config.apiTemplateTemplateDefault);
};

const sanitize = (value) => String(value ?? '').trim();
const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatDate = (isoValue) => {
  const date = isoValue ? new Date(isoValue) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const asArray = (value) => (Array.isArray(value) ? value : []);
const asString = (value, fallback = '') => {
  const clean = sanitize(value);
  return clean || fallback;
};
const asNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizePort = (value) => asString(value, '-');
const normalizeRoom = (value) => asString(value, 'Unassigned');
const normalizeWireId = (connection, index) => asString(connection?.wireId, `C${index + 1}`);
const normalizeWireSpec = (connection) => asString(connection?.wireSpec || connection?.spec, '-');
const normalizeConnectionType = (connection) => asString(connection?.type, '-');

const normalizeProduct = (product, index) => {
  const p = isPlainObject(product?.product) ? product.product : {};
  const brand = asString(p.brand, '');
  const model = asString(p.model, '');
  const label = asString(product?.label, brand || 'Device');
  const category = asString(p.category, 'other');
  const room = normalizeRoom(product?.room);
  const price = asNumber(p.price, 0);
  const installationLabor = asNumber(p.installation_labor, 0);
  const configurationLabor = asNumber(p.configuration_labor, 0);
  const ip = asString(product?.networkInfo?.ip, '');

  return {
    ...product,
    instanceId: asString(product?.instanceId, `DEV-${index + 1}`),
    room,
    label,
    product: {
      ...p,
      brand,
      model,
      category,
      price,
      installation_labor: installationLabor,
      configuration_labor: configurationLabor
    },
    networkInfo: ip && ip !== '000.000.000.000' ? { ...(product?.networkInfo || {}), ip } : { ...(product?.networkInfo || {}), ip: '' }
  };
};

const normalizeConnection = (connection, index, productsById) => {
  const fromId = asString(connection?.from, '');
  const toId = asString(connection?.to, '');
  const fromProduct = fromId ? productsById.get(fromId) : null;
  const toProduct = toId ? productsById.get(toId) : null;

  const inferredLength =
    fromProduct && toProduct && fromProduct.room && toProduct.room && fromProduct.room !== toProduct.room ? 250 : 50;

  return {
    ...connection,
    type: normalizeConnectionType(connection),
    wireId: normalizeWireId(connection, index),
    wireSpec: normalizeWireSpec(connection),
    from: fromId,
    to: toId,
    fromPort: normalizePort(connection?.fromPort),
    toPort: normalizePort(connection?.toPort),
    length: asNumber(connection?.length, inferredLength)
  };
};

const validateExportPayload = (payload) => {
  if (!isPlainObject(payload)) {
    return 'Request body must be a JSON object.';
  }

  const mustBeString = ['projectName', 'clientName', 'location', 'preparedBy', 'exportType'];
  for (const key of mustBeString) {
    if (payload[key] != null && typeof payload[key] !== 'string') {
      return `"${key}" must be a string when provided.`;
    }
  }

  const mustBeArray = ['canvasProducts', 'connections', 'rooms', 'floorplans', 'arrows', 'annotations'];
  for (const key of mustBeArray) {
    if (payload[key] != null && !Array.isArray(payload[key])) {
      return `"${key}" must be an array when provided.`;
    }
  }

  if (payload.orgSettings != null && !isPlainObject(payload.orgSettings)) {
    return '"orgSettings" must be an object when provided.';
  }

  if (payload.exportType != null) {
    const type = sanitize(payload.exportType);
    if (type && !['installer', 'client', 'documentation'].includes(type)) {
      return '"exportType" must be one of: installer, client, documentation.';
    }
  }

  return null;
};

const normalizeExportPayload = (payload) => {
  const canvasProducts = asArray(payload.canvasProducts).map((cp, idx) => normalizeProduct(cp, idx));
  const productsById = new Map(canvasProducts.map((cp) => [cp.instanceId, cp]));
  const connections = asArray(payload.connections).map((conn, idx) => normalizeConnection(conn, idx, productsById));

  return {
    projectName: asString(payload.projectName, 'AV System Design'),
    clientName: asString(payload.clientName, 'N/A'),
    location: asString(payload.location, 'N/A'),
    preparedBy: asString(payload.preparedBy, 'N/A'),
    exportType: asString(payload.exportType, 'installer'),
    canvasProducts,
    connections,
    rooms: asArray(payload.rooms),
    floorplans: asArray(payload.floorplans).map((fp) => ({
      ...fp,
      position: isPlainObject(fp?.position) ? fp.position : { x: 0, y: 0 },
      scale: asNumber(fp?.scale, 1),
      pixelsPerInch: asNumber(fp?.pixelsPerInch, 1)
    })),
    arrows: asArray(payload.arrows),
    annotations: asArray(payload.annotations),
    orgSettings: isPlainObject(payload.orgSettings) ? payload.orgSettings : {}
  };
};

const toMoney = (value) => `$${asNumber(value, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const deviceName = (cp) => sanitize(`${cp?.product?.brand || ''} ${cp?.product?.model || ''}`) || sanitize(cp?.label) || 'Unnamed device';
const isLikelyAnnotationId = (value) => /^ann[:_-]/i.test(sanitize(value));
const pageBreak = `<div style="page-break-before: always;"></div>`;
const toRenderableImageUrl = (value) => {
  const url = sanitize(value);
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return '';
};

const buildHtmlBody = (payload, exportType) => {
  const products = asArray(payload.canvasProducts);
  const connections = asArray(payload.connections);
  const floorplans = asArray(payload.floorplans);
  const annotations = asArray(payload.annotations);
  const roomsInput = asArray(payload.rooms);

  const productById = new Map(products.map((cp) => [sanitize(cp?.instanceId), cp]));
  const annotationById = new Map(annotations.map((ann, idx) => [sanitize(ann?.id || ann?.instanceId || `ann:${idx + 1}`), ann]));

  const roomRows = roomsInput.length
    ? roomsInput.map((room, idx) => ({
      id: sanitize(typeof room === 'string' ? room : room?.id || room?.name || `room-${idx + 1}`),
      name: sanitize(typeof room === 'string' ? room : room?.name || room?.id || `Room ${idx + 1}`)
    }))
    : [...new Set(products.map((cp) => sanitize(cp?.room)).filter(Boolean))].map((roomName, idx) => ({
      id: roomName,
      name: roomName || `Room ${idx + 1}`
    }));

  const roomNameById = new Map(roomRows.map((r) => [r.id, r.name]));

  const resolveEndpoint = (id) => {
    const key = sanitize(id);
    if (!key) return '-';
    const cp = productById.get(key);
    if (cp) return deviceName(cp);

    const ann = annotationById.get(key);
    if (ann) {
      const kind = sanitize(ann?.type || 'Annotation');
      const label = sanitize(ann?.title || ann?.text || ann?.symbolId || key);
      return `${kind}: ${label}`;
    }

    if (isLikelyAnnotationId(key)) return `Annotation ${escapeHtml(key)}`;
    return key;
  };

  const groupedBom = new Map();
  for (const cp of products) {
    const brand = sanitize(cp?.product?.brand);
    const model = sanitize(cp?.product?.model);
    const category = sanitize(cp?.product?.category || 'other');
    const key = `${brand}::${model}::${category}`;
    if (!groupedBom.has(key)) {
      groupedBom.set(key, {
        brand,
        model,
        category,
        qty: 0,
        unit: asNumber(cp?.product?.price, 0),
        install: asNumber(cp?.product?.installation_labor, 0),
        config: asNumber(cp?.product?.configuration_labor, 0)
      });
    }
    groupedBom.get(key).qty += 1;
  }
  const bomRows = [...groupedBom.values()].sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));

  const cableTypeCounts = new Map();
  for (const conn of connections) {
    const key = sanitize(conn?.type || 'Unknown');
    cableTypeCounts.set(key, (cableTypeCounts.get(key) || 0) + 1);
  }

  let equipmentMaterialTotal = 0;
  let laborInstallTotal = 0;
  let laborConfigTotal = 0;
  for (const row of bomRows) {
    equipmentMaterialTotal += row.qty * row.unit;
    laborInstallTotal += row.qty * row.install;
    laborConfigTotal += row.qty * row.config;
  }

  // Cable pricing fallback: $75 per run if no explicit per-connection pricing is available.
  const cableSubtotal = connections.reduce((sum, conn) => {
    const unitPerRun = asNumber(conn?.wireRunPrice, 75);
    return sum + unitPerRun;
  }, 0);

  const laborRates = isPlainObject(payload.orgSettings?.labor_rates) ? payload.orgSettings.labor_rates : {};
  const laborDesign = asNumber(laborRates.design_engineering_rate, 0);
  const laborInstallFromSettings = asNumber(laborRates.equipment_installation_rate, 0);
  const laborProgrammingFromSettings = asNumber(laborRates.system_programming_rate, 0);
  const laborInstall = laborInstallTotal > 0 ? laborInstallTotal : laborInstallFromSettings;
  const laborProgramming = laborConfigTotal > 0 ? laborConfigTotal : laborProgrammingFromSettings;
  const laborCable = connections.length * 280;
  const laborSubtotal = laborDesign + laborInstall + laborCable + laborProgramming;
  const projectTotal = equipmentMaterialTotal + cableSubtotal + laborSubtotal;

  const section = (title, subtitle = '') => `
    <section style="margin: 0 0 22px;">
      <h2 style="font-size: 28px; margin: 0; color: #0f172a;">${escapeHtml(title)}</h2>
      ${subtitle ? `<p style="font-size: 13px; margin: 6px 0 0; color: #64748b;">${escapeHtml(subtitle)}</p>` : ''}
    </section>
  `;

  const renderRoomsForEquipment = roomRows.map((room) => {
    const roomDevices = products.filter((cp) => sanitize(cp?.room) === room.id || sanitize(cp?.room) === room.name);
    if (!roomDevices.length) return '';
    return `
      <section style="margin: 0 0 18px;">
        <h3 style="margin: 0 0 10px; font-size: 18px;">${escapeHtml(room.name)}</h3>
        <table style="width:100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="text-align:left;padding:8px;border:1px solid #dbe5f1;">Equipment</th>
              <th style="text-align:left;padding:8px;border:1px solid #dbe5f1;">Brand / Model</th>
              <th style="text-align:left;padding:8px;border:1px solid #dbe5f1;">Category</th>
              <th style="text-align:right;padding:8px;border:1px solid #dbe5f1;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${roomDevices.map((cp) => `
              <tr>
                <td style="padding:8px;border:1px solid #dbe5f1;">${escapeHtml(sanitize(cp?.instanceId) || sanitize(cp?.label) || '-')}</td>
                <td style="padding:8px;border:1px solid #dbe5f1;">${escapeHtml(deviceName(cp))}</td>
                <td style="padding:8px;border:1px solid #dbe5f1;">${escapeHtml(sanitize(cp?.product?.category || 'other'))}</td>
                <td style="padding:8px;border:1px solid #dbe5f1; text-align:right;">${escapeHtml(toMoney(cp?.product?.price))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    `;
  }).join('');

  const commonCss = `
    <style>
      .muted { color: #64748b; }
      .small { font-size: 12px; }
      .card { border: 1px solid #dbe5f1; border-radius: 8px; padding: 10px 12px; margin: 0 0 10px; }
      .table { width:100%; border-collapse: collapse; font-size: 12px; }
      .table th { text-align:left; padding: 8px; border:1px solid #dbe5f1; background:#f8fafc; }
      .table td { padding: 8px; border:1px solid #dbe5f1; vertical-align: top; }
      .right { text-align: right; }
      .room-pill { display:inline-block; font-size:11px; color:#334155; border:1px solid #dbe5f1; border-radius:999px; padding:2px 8px; margin-right:6px; }
      .floor-img { width:100%; max-height:680px; object-fit:contain; border:1px solid #dbe5f1; border-radius:8px; background:#f8fafc; }
    </style>
  `;

  const projectOverviewSection = `
    ${section('Project Overview', 'SYSTEM SUMMARY')}
    <div class="card">
      <div style="font-size:16px;font-weight:600;margin-bottom:6px;">
        ${products.length} Devices · ${connections.length} Connections · ${roomRows.length} Rooms
      </div>
      <div class="small muted">Project Details</div>
      <div class="small">Client: ${escapeHtml(payload.clientName || 'N/A')}</div>
      <div class="small">Location: ${escapeHtml(payload.location || 'N/A')}</div>
      <div class="small">Prepared by: ${escapeHtml(payload.preparedBy || 'N/A')}</div>
      <div class="small">Document Type: ${escapeHtml(exportType === 'documentation' ? 'Full Documentation' : exportType === 'client' ? 'Client Proposal' : 'Installer Package')}</div>
    </div>
  `;

  const tocSection = `
    ${pageBreak}
    ${section('Table of Contents')}
    <ol style="margin: 0; padding-left: 22px; line-height: 1.8;">
      <li>Project Overview</li>
      <li>Floorplans</li>
      <li>How Your System Works</li>
      <li>Scope of Work</li>
      <li>Equipment by Room</li>
      <li>Bill of Materials</li>
      <li>Device Documentation</li>
      <li>Wire Schedule</li>
      <li>Proposal Acceptance</li>
    </ol>
  `;

  const floorplansSection = `
    ${pageBreak}
    ${section('Floorplans', 'SITE LAYOUT')}
    <p class="small muted" style="margin-top:-8px;">The following pages show device and wiring locations on the actual floor plans.</p>
    ${floorplans.length ? floorplans.map((fp, idx) => `
      <div style="${idx > 0 ? 'page-break-before: always;' : ''}">
        <h3 style="font-size:18px; margin: 14px 0 10px;">${escapeHtml(sanitize(fp?.name || `Floorplan ${idx + 1}`))}</h3>
        ${toRenderableImageUrl(fp?.url || fp?.originalUrl || fp?.image_url)
          ? `<img class="floor-img" src="${escapeHtml(toRenderableImageUrl(fp?.url || fp?.originalUrl || fp?.image_url))}" alt="${escapeHtml(sanitize(fp?.name || `Floorplan ${idx + 1}`))}" />`
          : '<div class="card small muted">No floorplan image available.</div>'}
        <div class="small muted" style="margin-top:8px;">
          SCALE INFORMATION · Calibration: ${escapeHtml(String(asNumber(fp?.pixelsPerInch, 1)))} px/inch
          · Scale: ${escapeHtml(String(asNumber(fp?.scale, 1)))}
          · Position: ${escapeHtml(JSON.stringify(fp?.position || { x: 0, y: 0 }))}
        </div>
      </div>
    `).join('') : '<div class="card small muted">No floorplans in this project.</div>'}
  `;

  const narrativeSection = `
    ${pageBreak}
    ${section('How Your System Works', 'YOUR ENTERTAINMENT SYSTEM GUIDE')}
    <p>This guide explains how your audio/video system works and how to get the most out of it.</p>
    <p><strong>Welcome to Your New AV System!</strong><br/>Congratulations on your new audio-visual (AV) system. Your setup includes ${products.length} devices across ${roomRows.length} room(s), connected through ${connections.length} integrated runs.</p>
    <p><strong>How Your Devices Work Together</strong><br/>At the heart of the system is your core switching/distribution layer, linking source devices, endpoints, and in-room infrastructure. Wire labels and port mappings in this document align to your field install standards.</p>
    <p><strong>Using Your System Made Easy</strong><br/>Use room-level controls and source selections to route audio/video to the desired zones. Keep this package as your reference for troubleshooting, maintenance, and future expansion.</p>
  `;

  const scopeSection = `
    ${pageBreak}
    ${section('Scope of Work', 'PROJECT OVERVIEW')}
    <p>This proposal includes the complete design, supply, installation, configuration, and handoff for a professional AV system across ${roomRows.length} room(s), with ${products.length} devices and ${connections.length} integrated connections.</p>
    <ol style="line-height:1.8;">
      <li>Equipment Supply</li>
      <li>Equipment Installation</li>
      <li>Cabling & Infrastructure</li>
      <li>System Programming & Configuration</li>
    </ol>
    <ul>
      <li>${products.length}x total endpoint devices</li>
      <li>${connections.length}x cable runs</li>
      <li>Audio/video signal routing and optimization</li>
      <li>Complete system testing and verification</li>
    </ul>
  `;

  const equipmentByRoomSection = `
    ${pageBreak}
    ${section('Equipment by Room')}
    ${renderRoomsForEquipment || '<div class="card small muted">No room equipment available.</div>'}
  `;

  const billOfMaterialsSection = `
    ${pageBreak}
    ${section('Bill of Materials')}
    <h3 style="font-size:18px;margin:0 0 10px;">Equipment</h3>
    <table class="table">
      <thead>
        <tr>
          <th>Item</th><th>Brand / Model</th><th>Qty</th><th class="right">Unit Price</th><th class="right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${bomRows.length ? bomRows.map((row) => `
          <tr>
            <td>${escapeHtml(row.category || 'other')}</td>
            <td>${escapeHtml(`${row.brand} ${row.model}`.trim() || 'Unnamed Device')}</td>
            <td>${escapeHtml(String(row.qty))}</td>
            <td class="right">${escapeHtml(toMoney(row.unit))}</td>
            <td class="right">${escapeHtml(toMoney(row.qty * row.unit))}</td>
          </tr>
        `).join('') : '<tr><td colspan="5" class="muted">No equipment items.</td></tr>'}
      </tbody>
    </table>
    <p><strong>Equipment Subtotal:</strong> ${escapeHtml(toMoney(equipmentMaterialTotal))}</p>
    <h3 style="font-size:18px;margin:16px 0 10px;">Cabling & Infrastructure</h3>
    <table class="table">
      <thead>
        <tr><th>Item</th><th>Type / Spec</th><th>Qty</th><th class="right">Unit Price</th><th class="right">Total</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Cable/Wire</td>
          <td>${escapeHtml(connections[0]?.type || 'Mixed')} / ${escapeHtml(connections[0]?.wireSpec || 'Standard')}</td>
          <td>${escapeHtml(String(connections.length))} runs</td>
          <td class="right">${escapeHtml(toMoney(connections.length ? cableSubtotal / connections.length : 0))}</td>
          <td class="right">${escapeHtml(toMoney(cableSubtotal))}</td>
        </tr>
      </tbody>
    </table>
    <p><strong>Cabling Subtotal:</strong> ${escapeHtml(toMoney(cableSubtotal))}</p>
    <h3 style="font-size:18px;margin:16px 0 10px;">Labor & Installation</h3>
    <table class="table">
      <tbody>
        <tr><td>System Design & Engineering</td><td class="right">${escapeHtml(toMoney(laborDesign))}</td></tr>
        <tr><td>Equipment Installation</td><td class="right">${escapeHtml(toMoney(laborInstall))}</td></tr>
        <tr><td>Cable Runs & Termination</td><td class="right">${escapeHtml(toMoney(laborCable))}</td></tr>
        <tr><td>System Programming</td><td class="right">${escapeHtml(toMoney(laborProgramming))}</td></tr>
      </tbody>
    </table>
    <p><strong>Labor Subtotal:</strong> ${escapeHtml(toMoney(laborSubtotal))}</p>
    <p style="font-size:16px;"><strong>Project Total:</strong> ${escapeHtml(toMoney(projectTotal))}</p>
  `;

  const deviceDocumentationSection = `
    ${pageBreak}
    ${section('Device Documentation')}
    ${products.length ? products.map((cp) => {
      const roomName = roomNameById.get(sanitize(cp?.room)) || sanitize(cp?.room) || 'Unassigned';
      const net = isPlainObject(cp?.networkInfo) ? cp.networkInfo : {};
      const connectionCount = connections.filter((c) => sanitize(c?.from) === sanitize(cp?.instanceId) || sanitize(c?.to) === sanitize(cp?.instanceId)).length;
      return `
        <div class="card">
          <div style="font-size:11px; letter-spacing:0.04em; color:#475569; text-transform:uppercase;">${escapeHtml(sanitize(cp?.product?.category || 'other'))}</div>
          <div style="font-size:17px; font-weight:700; margin-top:2px;">${escapeHtml(sanitize(cp?.instanceId) || cp?.label || '-')}</div>
          <div style="font-size:15px; font-weight:600;">${escapeHtml(deviceName(cp))}</div>
          <div class="small muted">${connectionCount} connection(s)</div>
          <div style="margin-top:8px;" class="small">Room: ${escapeHtml(roomName)}</div>
          ${net.ip ? `<div class="small muted">IP ${escapeHtml(net.ip)} | SW ${escapeHtml(net.sw || '-')} | Port ${escapeHtml(net.port || '-')} | MAC ${escapeHtml(net.mac || '-')}</div>` : ''}
        </div>
      `;
    }).join('') : '<div class="card small muted">No devices available.</div>'}
  `;

  const wireScheduleSection = `
    ${pageBreak}
    ${section('Wire Schedule')}
    <table class="table">
      <thead>
        <tr>
          <th>Wire ID</th><th>Type</th><th>Spec</th><th>From</th><th>To</th><th>Ports</th>
        </tr>
      </thead>
      <tbody>
        ${connections.length ? connections.map((conn) => `
          <tr>
            <td>${escapeHtml(conn?.wireId || '-')}</td>
            <td>${escapeHtml(conn?.type || '-')}</td>
            <td>${escapeHtml(conn?.wireSpec || '-')}</td>
            <td>${escapeHtml(resolveEndpoint(conn?.from))}</td>
            <td>${escapeHtml(resolveEndpoint(conn?.to))}</td>
            <td>${escapeHtml(`${conn?.fromPort || '-'} -> ${conn?.toPort || '-'}`)}</td>
          </tr>
        `).join('') : '<tr><td colspan="6" class="muted">No wire schedule rows available.</td></tr>'}
      </tbody>
    </table>
  `;

  const acceptanceSection = `
    ${pageBreak}
    ${section('Proposal Acceptance', 'CLIENT ACCEPTANCE')}
    <p>By signing below, the client accepts this proposal and authorizes the work to proceed as described.</p>
    <div style="margin-top:30px;">
      <div style="margin-bottom:22px;">Client Name<br/><span style="display:inline-block;border-bottom:1px solid #94a3b8; min-width:320px;">&nbsp;</span><br/>Date: <span style="display:inline-block;border-bottom:1px solid #94a3b8; min-width:190px;">&nbsp;</span></div>
      <div>Prepared By<br/><span style="display:inline-block;border-bottom:1px solid #94a3b8; min-width:320px;">&nbsp;</span><br/>Date: <span style="display:inline-block;border-bottom:1px solid #94a3b8; min-width:190px;">&nbsp;</span></div>
    </div>
  `;

  const clientFocusedSection = `
    ${pageBreak}
    ${section('Client Proposal Overview')}
    <div class="card">
      <div><strong>Client:</strong> ${escapeHtml(payload.clientName || 'N/A')}</div>
      <div><strong>Location:</strong> ${escapeHtml(payload.location || 'N/A')}</div>
      <div><strong>Rooms Covered:</strong> ${escapeHtml(String(roomRows.length))}</div>
      <div><strong>Devices Included:</strong> ${escapeHtml(String(products.length))}</div>
      <div><strong>Total Investment:</strong> ${escapeHtml(toMoney(projectTotal))}</div>
    </div>
    <h3 style="margin:0 0 8px;">Products by Room</h3>
    ${roomRows.map((room) => {
      const roomDevices = products.filter((cp) => sanitize(cp?.room) === room.id || sanitize(cp?.room) === room.name);
      return `
        <div class="card">
          <div style="font-weight:700;margin-bottom:6px;">${escapeHtml(room.name)}</div>
          <div class="small muted">${roomDevices.length ? escapeHtml(roomDevices.map((cp) => deviceName(cp)).join(' | ')) : 'No devices'}</div>
        </div>
      `;
    }).join('')}
  `;

  const installerBody = [
    projectOverviewSection,
    tocSection,
    floorplansSection,
    narrativeSection,
    scopeSection,
    equipmentByRoomSection,
    billOfMaterialsSection,
    deviceDocumentationSection,
    wireScheduleSection,
    acceptanceSection
  ].join('');

  const clientBody = [
    projectOverviewSection,
    clientFocusedSection,
    billOfMaterialsSection,
    acceptanceSection
  ].join('');

  return `${commonCss}${exportType === 'client' ? clientBody : exportType === 'documentation' ? `${installerBody}${clientFocusedSection}` : installerBody}`;
};

export default async function exportRoutes(fastify) {
  fastify.post('/exports/pdf', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    if (!canExport(auth.user.organization_role)) {
      return reply.code(403).send({ error: 'Insufficient permissions to export PDFs' });
    }

    if (!config.apiTemplateApiKey) {
      return reply.code(400).send({ error: 'APITEMPLATE_API_KEY is not configured' });
    }

    const rawPayload = request.body || {};
    const validationError = validateExportPayload(rawPayload);
    if (validationError) {
      return reply.code(400).send({ error: validationError });
    }

    const payload = normalizeExportPayload(rawPayload);
    const exportType = sanitize(payload.exportType || 'installer');
    const templateId = getTemplateIdForType(exportType);
    if (!templateId) {
      return reply.code(400).send({ error: `No APITemplate template configured for export type: ${exportType}` });
    }

    const exportTypeTitle =
      exportType === 'client'
        ? 'Client Proposal'
        : exportType === 'documentation'
          ? 'Full Documentation'
          : 'Installer Package';
    const title = sanitize(payload.projectName || 'AV System Design');
    const generatedAt = new Date().toISOString();
    const body = buildHtmlBody(payload, exportType);

    const apiPayload = {
      // Keep in payload for backwards compatibility with providers/proxies that accept body config.
      template_id: templateId,
      output_format: 'pdf',
      title: `${title} - ${exportTypeTitle}`,
      date: formatDate(generatedAt),
      body,
      data: {
        title: `${title} - ${exportTypeTitle}`,
        date: formatDate(generatedAt),
        body,
        project_name: sanitize(payload.projectName || 'AV System Design'),
        client_name: sanitize(payload.clientName || 'N/A'),
        location: sanitize(payload.location || 'N/A'),
        prepared_by: sanitize(payload.preparedBy || 'N/A'),
        export_type: exportType,
        generated_at: generatedAt,
        summary: {
          devices: Array.isArray(payload.canvasProducts) ? payload.canvasProducts.length : 0,
          connections: Array.isArray(payload.connections) ? payload.connections.length : 0,
          rooms: Array.isArray(payload.rooms) ? payload.rooms.length : 0,
          floorplans: Array.isArray(payload.floorplans) ? payload.floorplans.length : 0
        }
      }
    };

    const endpointUrl = new URL(config.apiTemplateEndpoint);
    // APITemplate v2 expects template_id in querystring.
    endpointUrl.searchParams.set('template_id', templateId);

    const response = await fetch(endpointUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiTemplateApiKey
      },
      body: JSON.stringify(apiPayload)
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerError = responseData?.message || responseData?.error || `APITemplate request failed (${response.status})`;
      return reply.code(502).send({ error: providerError });
    }

    const downloadUrl =
      responseData?.download_url ||
      responseData?.pdf_url ||
      responseData?.url ||
      responseData?.data?.download_url ||
      null;

    if (!downloadUrl) {
      return reply.code(502).send({ error: 'APITemplate did not return a download URL' });
    }

    return {
      download_url: downloadUrl
    };
  });
}
