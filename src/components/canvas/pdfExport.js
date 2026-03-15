import { jsPDF } from 'jspdf';
import { getSurveillanceSymbolDataUrl, isSurveillanceSymbol } from './surveillanceSymbolArtwork';
import { getCoverageConePoints, getCoverageDistanceCanvasUnits, getSurveillanceCoverageSettings } from './surveillanceCoverage';

const PAGE = { w: 210, h: 297 };
const MARGIN = 14;
const HEADER_H = 26;
const FOOTER_H = 12;
const TOP = HEADER_H + 14;
const BOTTOM = PAGE.h - FOOTER_H - 10;
const LINE = 6.8;

const C = {
  navy: [9, 21, 46],
  navySoft: [23, 42, 86],
  ink: [17, 24, 39],
  slate: [100, 116, 139],
  line: [226, 232, 240],
  panel: [247, 250, 255],
  blue: [37, 99, 235],
  green: [16, 185, 129],
  violet: [124, 58, 237],
  amber: [245, 158, 11]
};

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

const PNG_CACHE = new Map();
let SNAPSHOT_BASE_ICON = null;

const s = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);
const money = (v) => `$${Number(v || 0).toFixed(2)}`;
const slug = (v) => s(v).replace(/[^a-z0-9-_]+/gi, '_');
const deviceName = (cp) => `${cp?.product?.brand || 'Unknown'} ${cp?.product?.model || ''}`.trim();
const n = (v, fallback = 0) => {
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const normalizeWireTypeKey = (value) => s(value).toLowerCase().replace(/[\s_-]+/g, '');
const normalizeWireSpecKey = (value) => s(value).toLowerCase().replace(/[\s_-]+/g, '');
const inferConnectionLengthFeet = (conn, productsById) => {
  const explicit = n(conn?.length, NaN);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const fromRoom = productsById.get(conn?.from)?.room;
  const toRoom = productsById.get(conn?.to)?.room;
  return fromRoom && toRoom && fromRoom !== toRoom ? 250 : 50;
};
const needsTermination = (type) => {
  const key = normalizeWireTypeKey(type);
  return key === 'ethernet' || key === 'hdbaset';
};
const buildWirePricingIndex = (rows = []) => {
  const byTypeAndSpec = new Map();
  const byTypeAnySpec = new Map();
  const byTypeFallback = new Map();
  rows.forEach((row) => {
    const typeKey = normalizeWireTypeKey(row?.wire_type);
    if (!typeKey) return;
    const specKey = normalizeWireSpecKey(row?.wire_spec);
    if (specKey) byTypeAndSpec.set(`${typeKey}|${specKey}`, row);
    if (!specKey && !byTypeAnySpec.has(typeKey)) byTypeAnySpec.set(typeKey, row);
    const existing = byTypeFallback.get(typeKey);
    const rowUnit = n(row?.material_price_per_foot, 0) + n(row?.labor_price_per_run, 0);
    const existingUnit = existing ? n(existing?.material_price_per_foot, 0) + n(existing?.labor_price_per_run, 0) : -1;
    // Conservative fallback when spec is missing and no Any-spec row exists.
    if (!existing || rowUnit > existingUnit) byTypeFallback.set(typeKey, row);
  });
  return { byTypeAndSpec, byTypeAnySpec, byTypeFallback };
};
const calculateCablePricing = (connections = [], canvasProducts = [], wirePricing = []) => {
  const productsById = new Map((canvasProducts || []).map((cp) => [cp.instanceId, cp]));
  const index = buildWirePricingIndex(wirePricing);
  let material = 0;
  let termination = 0;
  let labor = 0;

  (connections || []).forEach((conn) => {
    const typeKey = normalizeWireTypeKey(conn?.type);
    const specKey = normalizeWireSpecKey(conn?.wireSpec || conn?.spec);
    const row =
      (specKey ? index.byTypeAndSpec.get(`${typeKey}|${specKey}`) : null) ||
      index.byTypeAnySpec.get(typeKey) ||
      index.byTypeFallback.get(typeKey) ||
      null;

    if (row) {
      const runLength = inferConnectionLengthFeet(conn, productsById);
      material += n(row?.material_price_per_foot, 0) * runLength;
      labor += n(row?.labor_price_per_run, 0);
      if (needsTermination(conn?.type)) {
        termination += n(row?.termination_price, 0) * 2;
      }
      return;
    }

    material += n(conn?.wireRunPrice, 75);
  });

  return {
    material,
    termination,
    labor,
    cableSubtotal: material + termination
  };
};

const fill = (doc, [r, g, b]) => doc.setFillColor(r, g, b);
const stroke = (doc, [r, g, b]) => doc.setDrawColor(r, g, b);
const textColor = (doc, [r, g, b]) => doc.setTextColor(r, g, b);

const text = (doc, value, x, y, w, opts = {}) => {
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  doc.setFontSize(opts.size || 9.4);
  textColor(doc, opts.color || C.ink);
  const lines = doc.splitTextToSize(s(value), w);
  for (const ln of lines) {
    doc.text(ln, x, y);
    y += LINE;
  }
  return y;
};

const readBlobAsDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image blob'));
    reader.readAsDataURL(blob);
  });

const toPngDataUrl = async (sourceUrlOrDataUrl) => {
  if (!sourceUrlOrDataUrl) return null;
  let input = sourceUrlOrDataUrl;
  if (!String(sourceUrlOrDataUrl).startsWith('data:image/')) {
    const response = await fetch(sourceUrlOrDataUrl);
    if (!response.ok) throw new Error(`Failed loading floorplan image (${response.status})`);
    const blob = await response.blob();
    input = await readBlobAsDataUrl(blob);
  }

  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Invalid floorplan image'));
    el.src = input;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width || 1200;
  canvas.height = img.naturalHeight || img.height || 900;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create floorplan image canvas');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height
  };
};

const toPngDataUrlCached = async (urlOrDataUrl) => {
  const key = String(urlOrDataUrl || '');
  if (!key) return null;
  if (PNG_CACHE.has(key)) return PNG_CACHE.get(key);
  const value = await toPngDataUrl(key);
  PNG_CACHE.set(key, value);
  return value;
};

const getSnapshotBaseIconPng = () => {
  if (SNAPSHOT_BASE_ICON) return SNAPSHOT_BASE_ICON;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    SNAPSHOT_BASE_ICON = { dataUrl: '', width: size, height: size };
    return SNAPSHOT_BASE_ICON;
  }

  // White icon on transparent background; final color is applied by transformSymbolPng.
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Camera body
  const bodyX = 22;
  const bodyY = 40;
  const bodyW = 84;
  const bodyH = 56;
  const radius = 12;
  ctx.beginPath();
  ctx.moveTo(bodyX + radius, bodyY);
  ctx.lineTo(bodyX + bodyW - radius, bodyY);
  ctx.quadraticCurveTo(bodyX + bodyW, bodyY, bodyX + bodyW, bodyY + radius);
  ctx.lineTo(bodyX + bodyW, bodyY + bodyH - radius);
  ctx.quadraticCurveTo(bodyX + bodyW, bodyY + bodyH, bodyX + bodyW - radius, bodyY + bodyH);
  ctx.lineTo(bodyX + radius, bodyY + bodyH);
  ctx.quadraticCurveTo(bodyX, bodyY + bodyH, bodyX, bodyY + bodyH - radius);
  ctx.lineTo(bodyX, bodyY + radius);
  ctx.quadraticCurveTo(bodyX, bodyY, bodyX + radius, bodyY);
  ctx.closePath();
  ctx.stroke();

  // Top bump
  ctx.beginPath();
  ctx.moveTo(42, 40);
  ctx.lineTo(54, 28);
  ctx.lineTo(76, 28);
  ctx.lineTo(86, 40);
  ctx.stroke();

  // Lens
  ctx.beginPath();
  ctx.arc(64, 68, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(64, 68, 7, 0, Math.PI * 2);
  ctx.fill();

  SNAPSHOT_BASE_ICON = {
    dataUrl: canvas.toDataURL('image/png'),
    width: size,
    height: size
  };
  return SNAPSHOT_BASE_ICON;
};

const tintPng = (png, rgb) => {
  const img = new Image();
  img.src = png.dataUrl;
  const canvas = document.createElement('canvas');
  canvas.width = png.width;
  canvas.height = png.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return png;

  return new Promise((resolve) => {
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height
      });
    };
    img.onerror = () => resolve(png);
  });
};

const transformSymbolPng = (png, { rgb, rotation = 0, flipped = false }) => {
  const img = new Image();
  img.src = png.dataUrl;
  const radians = (Number(rotation || 0) * Math.PI) / 180;

  return new Promise((resolve) => {
    img.onload = () => {
      const srcW = Number(png.width || img.naturalWidth || img.width || 64);
      const srcH = Number(png.height || img.naturalHeight || img.height || 64);
      const pad = Math.ceil(Math.max(srcW, srcH) * 0.2);
      const paddedW = srcW + pad * 2;
      const paddedH = srcH + pad * 2;
      const cos = Math.abs(Math.cos(radians));
      const sin = Math.abs(Math.sin(radians));
      const outW = Math.max(1, Math.ceil(paddedW * cos + paddedH * sin));
      const outH = Math.max(1, Math.ceil(paddedW * sin + paddedH * cos));

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(png);

      ctx.clearRect(0, 0, outW, outH);
      ctx.translate(outW / 2, outH / 2);
      if (radians) ctx.rotate(radians);
      ctx.scale(flipped ? -1 : 1, 1);
      ctx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH);

      // Apply symbol color after transform so output color/orientation matches canvas.
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      ctx.fillRect(-outW / 2, -outH / 2, outW, outH);
      ctx.globalCompositeOperation = 'source-over';

      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width: outW,
        height: outH
      });
    };
    img.onerror = () => resolve(png);
  });
};

const colorToRgb = (value, fallback = C.blue) => {
  if (Array.isArray(value) && value.length === 3) return value;
  const v = s(value).toLowerCase();
  if (!v) return fallback;
  if (v.startsWith('#')) {
    const hex = v.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16)
      ];
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
      ];
    }
  }
  return fallback;
};

const getFloorplanSizeInCanvas = (fp) => {
  const fpScale = Number(fp?.scale || 1);
  const hasCal = fp?.imageWidth && fp?.imageHeight && fp?.pixelsPerInch;
  if (hasCal) {
    const sf = (1 / Number(fp.pixelsPerInch || 1)) * fpScale;
    return {
      width: Number(fp.imageWidth) * sf,
      height: Number(fp.imageHeight) * sf
    };
  }
  if (fp?.imageWidth && fp?.imageHeight) {
    const width = 500 * fpScale;
    return {
      width,
      height: width * (Number(fp.imageHeight) / Math.max(1, Number(fp.imageWidth)))
    };
  }
  return { width: 500 * fpScale, height: 500 * fpScale };
};

const floorplanRelToCanvas = (relX, relY, fp) => {
  const pos = fp?.position || { x: 0, y: 0 };
  const size = getFloorplanSizeInCanvas(fp);
  return {
    x: Number(pos.x || 0) + Number(relX || 0) * size.width,
    y: Number(pos.y || 0) + Number(relY || 0) * size.height
  };
};

const createCtx = (projectName, exportType) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let pageNo = 1;

  const drawChrome = (subtitle) => {
    fill(doc, C.navy);
    doc.rect(0, 0, PAGE.w, HEADER_H, 'F');
    fill(doc, C.blue);
    doc.circle(MARGIN + 2, 8.6, 2, 'F');
    fill(doc, C.green);
    doc.circle(MARGIN + 7, 8.6, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.8);
    doc.setTextColor(255, 255, 255);
    doc.text(s(projectName), MARGIN + 12, 10.4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.3);
    doc.setTextColor(207, 219, 243);
    doc.text(s(subtitle), MARGIN + 12, 15.6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.text('AV SYSTEM DESIGN', PAGE.w - MARGIN, 10.1, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(191, 205, 230);
    doc.text('Professional AV Documentation', PAGE.w - MARGIN, 15.2, { align: 'right' });

    fill(doc, [249, 251, 255]);
    doc.rect(0, PAGE.h - FOOTER_H, PAGE.w, FOOTER_H, 'F');
    stroke(doc, C.line);
    doc.line(0, PAGE.h - FOOTER_H, PAGE.w, PAGE.h - FOOTER_H);
    textColor(doc, C.slate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Where AV Design Meets Effortless Documentation', MARGIN, PAGE.h - 4.2);
    doc.text(`Page ${pageNo}`, PAGE.w - MARGIN, PAGE.h - 4.2, { align: 'right' });
  };

  const newPage = (subtitle) => {
    doc.addPage();
    pageNo += 1;
    drawChrome(subtitle);
    return TOP;
  };

  const ensure = (y, needed, subtitle) => (y + needed <= BOTTOM ? y : newPage(subtitle));

  drawChrome(`Type: ${s(exportType)} | Date: ${new Date().toLocaleDateString()}`);
  return { doc, newPage, ensure };
};

const section = (doc, y, title, tag, color) => {
  fill(doc, color);
  doc.roundedRect(MARGIN, y - 4.5, 16, 9.6, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(tag, MARGIN + 8, y + 0.8, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.8);
  textColor(doc, C.ink);
  doc.text(title, MARGIN + 22, y + 0.9);
  stroke(doc, C.line);
  doc.line(MARGIN + 22, y + 3.4, PAGE.w - MARGIN, y + 3.4);
  return y + 14;
};

const cardMetrics = (doc, y, cards) => {
  const gap = 3.6;
  const w = (PAGE.w - MARGIN * 2 - gap * (cards.length - 1)) / cards.length;
  const h = 25;
  for (let i = 0; i < cards.length; i += 1) {
    const c = cards[i];
    const x = MARGIN + i * (w + gap);
    fill(doc, [255, 255, 255]);
    stroke(doc, C.line);
    doc.roundedRect(x, y, w, h, 2, 2, 'FD');
    fill(doc, c.color);
    doc.rect(x, y, 2.5, h, 'F');
    text(doc, `${c.code} ${c.label}`, x + 4.2, y + 8.2, w - 8, { size: 8.4, color: C.slate, bold: true });
    text(doc, `${c.value}`, x + 4.2, y + 18.2, w - 8, { size: 15, bold: true });
  }
  return y + h + 6;
};

const row = (doc, y, idx, h = 10.5) => {
  fill(doc, idx % 2 ? C.panel : [255, 255, 255]);
  stroke(doc, C.line);
  doc.roundedRect(MARGIN, y - 3.9, PAGE.w - MARGIN * 2, h, 1.5, 1.5, 'FD');
};

const groupedBom = (products) => {
  const map = new Map();
  for (const cp of products) {
    const brand = s(cp?.product?.brand || 'Unknown');
    const model = s(cp?.product?.model || 'Unknown');
    const key = `${brand}::${model}`;
    if (!map.has(key)) {
      map.set(key, {
        brand,
        model,
        category: s(cp?.product?.category || 'uncategorized'),
        qty: 0,
        unit: Number(cp?.product?.price || 0),
        install: Number(cp?.product?.installation_labor || 0),
        config: Number(cp?.product?.configuration_labor || 0)
      });
    }
    map.get(key).qty += 1;
  }
  return [...map.values()].sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
};

const cover = (ctx, data) => {
  const { doc } = ctx;
  let y = TOP;
  fill(doc, [255, 255, 255]);
  stroke(doc, C.line);
  doc.roundedRect(MARGIN, y, PAGE.w - MARGIN * 2, 52, 3, 3, 'FD');
  y = text(doc, data.projectName, MARGIN + 5, y + 13, 145, { size: 20, bold: true });
  y = text(
    doc,
    `Client: ${s(data.clientName || 'N/A')} | Location: ${s(data.location || 'N/A')} | Export: ${s(data.exportType)}`,
    MARGIN + 5,
    y - 1,
    PAGE.w - MARGIN * 2 - 10,
    { size: 10.2, color: C.slate }
  );
  y += 10;
  cardMetrics(doc, y, [
    { code: 'DEV', label: 'Devices', value: data.canvasProducts.length, color: C.blue },
    { code: 'CON', label: 'Connections', value: data.connections.length, color: C.violet },
    { code: 'ROM', label: 'Rooms', value: data.rooms.length, color: C.green },
    { code: 'ANN', label: 'Annotations', value: data.annotations.length, color: C.amber }
  ]);
};

const installer = async (ctx, data) => {
  const { doc, ensure, newPage } = ctx;
  const roomById = new Map(data.rooms.map((r) => [r.id, s(r.name || r.id)]));
  const roomFloorplanById = new Map(data.rooms.map((r) => [r.id, r?.floorplanId || null]));
  const labels = new Map(data.canvasProducts.map((cp) => [cp.instanceId, deviceName(cp)]));

  // 1) System overview
  let y = newPage('Installer Package | System Overview');
  y = section(doc, y, 'System Overview & Cable Legend', 'OV', C.violet);
  y = text(doc, `Devices ${data.canvasProducts.length} | Connections ${data.connections.length} | Rooms ${data.rooms.length} | Floorplans ${data.floorplans.length}`, MARGIN, y, PAGE.w - MARGIN * 2, { size: 9.5, color: C.slate });
  y += 7;
  fill(doc, C.navySoft);
  doc.roundedRect(MARGIN, y - 4, PAGE.w - MARGIN * 2, 9, 1.5, 1.5, 'F');
  text(doc, 'Cable Type', MARGIN + 3, y + 1, 35, { size: 8.4, bold: true, color: [255, 255, 255] });
  text(doc, 'Count', MARGIN + 92, y + 1, 20, { size: 8.4, bold: true, color: [255, 255, 255] });
  text(doc, 'Typical Use', MARGIN + 120, y + 1, 60, { size: 8.4, bold: true, color: [255, 255, 255] });
  y += 13;
  const byType = {};
  data.connections.forEach((c) => { const t = s(c?.type || 'Unknown'); byType[t] = (byType[t] || 0) + 1; });
  Object.entries(byType).forEach(([t, n], idx) => {
    y = ensure(y, 12.5, 'Installer Package | System Overview');
    row(doc, y, idx, 11.6);
    text(doc, t, MARGIN + 3, y + 1.2, 80, { size: 9, bold: true });
    text(doc, String(n), MARGIN + 92, y + 1.2, 20, { size: 8.8, color: C.slate });
    text(doc, 'AV interconnect', MARGIN + 120, y + 1.2, 65, { size: 8.6, color: C.slate });
    y += 13;
  });

  // 2) Device cards
  y = newPage('Installer Package | Device Documentation');
  y = section(doc, y, 'Device Documentation Cards', 'DV', C.blue);
  data.canvasProducts.forEach((cp, idx) => {
    y = ensure(y, 60, 'Installer Package | Device Documentation');
    fill(doc, [255, 255, 255]);
    stroke(doc, C.line);
    doc.roundedRect(MARGIN, y - 4, PAGE.w - MARGIN * 2, 54, 2, 2, 'FD');
    fill(doc, C.blue);
    doc.rect(MARGIN, y - 4, 2.5, 54, 'F');

    fill(doc, [240, 245, 254]);
    stroke(doc, [222, 232, 246]);
    doc.roundedRect(MARGIN + 5, y + 6, 27, 31, 2, 2, 'FD');
    text(doc, 'IMG', MARGIN + 15, y + 22, 8, { size: 8, color: C.slate, bold: true });

    const room = roomById.get(cp?.room) || s(cp?.room || 'Unassigned');
    const net = cp?.networkInfo || {};
    let ty = y + 6;
    ty = text(doc, `${idx + 1}. ${deviceName(cp)}`, MARGIN + 35, ty, 145, { size: 10.5, bold: true });
    ty = text(doc, `Room ${room} | Category ${s(cp?.product?.category || 'uncategorized')}`, MARGIN + 35, ty - 0.8, 145, { size: 8.8, color: C.slate });
    ty = text(doc, `IP ${s(net.ip || '-')} | SW ${s(net.sw || '-')} | Port ${s(net.port || '-')} | MAC ${s(net.mac || '-')}`, MARGIN + 35, ty - 0.6, 145, { size: 8.6, color: C.slate });
    ty = text(doc, s(cp?.product?.description || ''), MARGIN + 35, ty, 145, { size: 9 });
    const manuals = [cp?.product?.installation_manual_url, cp?.product?.user_manual_url].filter(Boolean).map((u) => s(u));
    if (manuals.length) {
      text(doc, `Manuals: ${manuals.join(' | ')}`, MARGIN + 35, ty + 0.4, 145, { size: 8.2, color: C.blue });
    }
    y += 58;
  });

  // 3) Cable schedule
  y = newPage('Installer Package | Cable Schedule');
  y = section(doc, y, 'Cable / Wire Schedule', 'CN', C.violet);
  fill(doc, C.navySoft);
  doc.roundedRect(MARGIN, y - 4, PAGE.w - MARGIN * 2, 9, 1.5, 1.5, 'F');
  text(doc, 'Wire', MARGIN + 3, y + 1, 22, { size: 8.4, bold: true, color: [255, 255, 255] });
  text(doc, 'Type', MARGIN + 28, y + 1, 28, { size: 8.4, bold: true, color: [255, 255, 255] });
  text(doc, 'From', MARGIN + 58, y + 1, 60, { size: 8.4, bold: true, color: [255, 255, 255] });
  text(doc, 'To', MARGIN + 120, y + 1, 70, { size: 8.4, bold: true, color: [255, 255, 255] });
  y += 13;
  data.connections.forEach((c, idx) => {
    y = ensure(y, 12.5, 'Installer Package | Cable Schedule');
    row(doc, y, idx, 11.6);
    text(doc, s(c?.wireId || '-'), MARGIN + 3, y + 1.2, 22, { size: 9, bold: true });
    text(doc, s(c?.type || '-'), MARGIN + 28, y + 1.2, 28, { size: 8.7, color: C.slate });
    text(doc, `${labels.get(c?.from) || c?.from} (${s(c?.fromPort || '-')})`, MARGIN + 58, y + 1.2, 60, { size: 8.3, color: C.slate });
    text(doc, `${labels.get(c?.to) || c?.to} (${s(c?.toPort || '-')})`, MARGIN + 120, y + 1.2, 70, { size: 8.3, color: C.slate });
    y += 13;
  });

  // 4) Floorplans
  y = newPage('Installer Package | Floorplans');
  const plans = data.floorplans.length ? data.floorplans : [{ id: 'default', name: 'Primary Layout', scale: 1, position: { x: 0, y: 0 } }];
  const posById = new Map(data.canvasProducts.map((cp) => [cp.instanceId, cp?.position || { x: 0, y: 0 }]));

  for (let i = 0; i < plans.length; i += 1) {
    const fp = plans[i];
    if (i > 0) y = newPage('Installer Package | Floorplans');
    y = section(doc, y, `Floorplan: ${s(fp?.name || 'Layout')}`, 'FP', C.green);
    const x = MARGIN, w = PAGE.w - MARGIN * 2, h = 172;
    fill(doc, [255, 255, 255]);
    stroke(doc, C.line);
    doc.roundedRect(x, y, w, h, 2, 2, 'FD');
    const imageArea = { x: x + 2, y: y + 2, w: w - 4, h: h - 4 };
    let bgDrawn = false;
    const floorplanImageUrl = s(fp?.url || fp?.originalUrl || fp?.image_url || '');
    let overlayRect = { ...imageArea };
    if (floorplanImageUrl) {
      try {
        const png = await toPngDataUrlCached(floorplanImageUrl);
        const imgRatio = png.width / Math.max(1, png.height);
        const areaRatio = imageArea.w / Math.max(1, imageArea.h);
        let drawW = imageArea.w;
        let drawH = imageArea.h;
        if (imgRatio > areaRatio) {
          drawH = drawW / imgRatio;
        } else {
          drawW = drawH * imgRatio;
        }
        const drawX = imageArea.x + (imageArea.w - drawW) / 2;
        const drawY = imageArea.y + (imageArea.h - drawH) / 2;
        doc.addImage(png.dataUrl, 'PNG', drawX, drawY, drawW, drawH, undefined, 'FAST');
        overlayRect = { x: drawX, y: drawY, w: drawW, h: drawH };
        bgDrawn = true;
      } catch {
        bgDrawn = false;
      }
    }
    if (!bgDrawn) {
      stroke(doc, [236, 242, 250]);
      for (let gx = 1; gx < 8; gx += 1) doc.line(x + (w / 8) * gx, y, x + (w / 8) * gx, y + h);
      for (let gy = 1; gy < 6; gy += 1) doc.line(x, y + (h / 6) * gy, x + w, y + (h / 6) * gy);
    }
    const fpPos = fp?.position || { x: 0, y: 0 };
    const fpSize = getFloorplanSizeInCanvas(fp);
    const toPdf = (canvasX, canvasY) => ({
      x: overlayRect.x + ((Number(canvasX || 0) - Number(fpPos.x || 0)) / Math.max(1, fpSize.width)) * overlayRect.w,
      y: overlayRect.y + ((Number(canvasY || 0) - Number(fpPos.y || 0)) / Math.max(1, fpSize.height)) * overlayRect.h
    });
    const scaleX = overlayRect.w / Math.max(1, fpSize.width);
    const scaleY = overlayRect.h / Math.max(1, fpSize.height);
    const uniformScale = (scaleX + scaleY) / 2;
    const inFloorplanBounds = (canvasX, canvasY) =>
      Number(canvasX || 0) >= Number(fpPos.x || 0)
      && Number(canvasX || 0) <= Number(fpPos.x || 0) + fpSize.width
      && Number(canvasY || 0) >= Number(fpPos.y || 0)
      && Number(canvasY || 0) <= Number(fpPos.y || 0) + fpSize.height;

    const devicesOnFloorplan = data.canvasProducts.filter((cp) => {
      const roomFloorplanId = roomFloorplanById.get(cp?.room);
      if (roomFloorplanId && roomFloorplanId === fp?.id) return true;
      return inFloorplanBounds(cp?.position?.x, cp?.position?.y);
    });
    const deviceIdsOnFloorplan = new Set(devicesOnFloorplan.map((cp) => cp.instanceId));
    const annotationsOnFloorplan = data.annotations.filter(
      (ann) => ann?.floorplanId === fp?.id && !ann?.hidden
    );

    stroke(doc, C.violet);
    doc.setLineWidth(0.55);
    data.connections.forEach((c) => {
      const from = posById.get(c?.from);
      const to = posById.get(c?.to);
      if (!from || !to) return;
      if (!deviceIdsOnFloorplan.has(c?.from) || !deviceIdsOnFloorplan.has(c?.to)) return;
      const p1 = toPdf(from.x, from.y);
      const p2 = toPdf(to.x, to.y);
      doc.line(p1.x, p1.y, p2.x, p2.y);
    });
    devicesOnFloorplan.forEach((cp) => {
      const p = cp?.position || { x: 0, y: 0 };
      const pt = toPdf(p.x, p.y);
      fill(doc, [255, 255, 255]);
      doc.circle(pt.x, pt.y, 2.1, 'F');
      fill(doc, C.blue);
      doc.circle(pt.x, pt.y, 1.5, 'F');
    });

    for (const ann of annotationsOnFloorplan) {
      const rgb = colorToRgb(ann?.color, C.blue);
      stroke(doc, rgb);
      fill(doc, rgb);
      const startCanvas = floorplanRelToCanvas(ann?.position?.x, ann?.position?.y, fp);
      const startPdf = toPdf(startCanvas.x, startCanvas.y);

      if (ann?.type === 'line' && ann?.endPosition) {
        const endCanvas = floorplanRelToCanvas(ann.endPosition.x, ann.endPosition.y, fp);
        const endPdf = toPdf(endCanvas.x, endCanvas.y);
        doc.setLineWidth(Math.max(0.45, Number(ann?.strokeWidth || 1) * 0.34));
        doc.line(startPdf.x, startPdf.y, endPdf.x, endPdf.y);
        continue;
      }
      if (ann?.type === 'rectangle') {
        const rw = Number(ann?.width || 0) * overlayRect.w;
        const rh = Number(ann?.height || 0) * overlayRect.h;
        doc.setLineWidth(Math.max(0.45, Number(ann?.strokeWidth || 1) * 0.32));
        ann?.fill ? doc.rect(startPdf.x, startPdf.y, rw, rh, 'FD') : doc.rect(startPdf.x, startPdf.y, rw, rh, 'S');
        continue;
      }
      if (ann?.type === 'circle') {
        const rr = Number(ann?.radius || 0) * overlayRect.w;
        doc.setLineWidth(Math.max(0.45, Number(ann?.strokeWidth || 1) * 0.32));
        ann?.fill ? doc.circle(startPdf.x, startPdf.y, rr, 'FD') : doc.circle(startPdf.x, startPdf.y, rr, 'S');
        continue;
      }
      if (ann?.type === 'text') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(7, Math.min(14, Number(ann?.fontSize || 10) * 0.45)));
        textColor(doc, rgb);
        doc.text(s(ann?.text || 'Text'), startPdf.x, startPdf.y);
        continue;
      }
      if (ann?.type === 'snapshot') {
        const snapScale = Number(ann?.scale || 1);
        const rotation = Number(ann?.rotation || 0);
        const flipped = Boolean(ann?.flipped);
        const targetSize = Math.max(3.2, 48 * snapScale * uniformScale);
        const snapshotRaw = getSnapshotBaseIconPng();
        const snapshotPng = await transformSymbolPng(snapshotRaw, { rgb, rotation, flipped });
        const ratio = Number(snapshotPng.width || 1) / Math.max(1, Number(snapshotPng.height || 1));
        let iconW = targetSize;
        let iconH = targetSize;
        if (ratio > 1) {
          iconH = iconW / ratio;
          iconW = iconH * ratio;
        } else {
          iconW = iconH * ratio;
          iconH = iconW / Math.max(0.0001, ratio);
        }
        doc.addImage(snapshotPng.dataUrl, 'PNG', startPdf.x - iconW / 2, startPdf.y - iconH / 2, iconW, iconH, undefined, 'FAST');
        continue;
      }
      if (ann?.type === 'symbol') {
        const symbolId = s(ann?.symbolId || '');
        const symbolScale = Number(ann?.scale || 1);
        const rotation = Number(ann?.rotation || 0);
        const flipped = Boolean(ann?.flipped);
        if (isSurveillanceSymbol(symbolId)) {
          const coverage = getSurveillanceCoverageSettings(ann);
          if (coverage.coverageEnabled) {
            const coverageHeading = rotation + Number(coverage.coverageRotationDeg || 0);
            const canvasDistance = getCoverageDistanceCanvasUnits(coverage.coverageDistanceFt, fp);
            const pdfDistance = canvasDistance * uniformScale;
            fill(doc, [Math.min(255, rgb[0] + 90), Math.min(255, rgb[1] + 90), Math.min(255, rgb[2] + 90)]);
            stroke(doc, rgb);
            doc.setLineWidth(0.35);
            if (coverage.coverageAngle >= 359.5) {
              doc.circle(startPdf.x, startPdf.y, pdfDistance, 'FD');
            } else {
              const cone = getCoverageConePoints(startPdf, coverageHeading, coverage.coverageAngle, pdfDistance);
              doc.triangle(cone.start.x, cone.start.y, cone.left.x, cone.left.y, cone.right.x, cone.right.y, 'FD');
            }
          }
        }
        const iconUrl = SYMBOL_ICONS[symbolId] || (isSurveillanceSymbol(symbolId) ? getSurveillanceSymbolDataUrl(symbolId, '#ffffff') : '');
        const baseCanvasPx = 60 * symbolScale;
        const targetSize = Math.max(3.5, baseCanvasPx * uniformScale);
        if (iconUrl) {
          try {
            const iconPngRaw = await toPngDataUrlCached(iconUrl);
            const iconPngTinted = await tintPng(iconPngRaw, rgb);
            const iconPng = await transformSymbolPng(iconPngTinted, { rgb, rotation, flipped });
            const ratio = Number(iconPng.width || 1) / Math.max(1, Number(iconPng.height || 1));
            let iconW = targetSize;
            let iconH = targetSize;
            if (ratio > 1) {
              iconH = iconW / ratio;
              iconW = iconH * ratio;
            } else {
              iconW = iconH * ratio;
              iconH = iconW / Math.max(0.0001, ratio);
            }
            doc.addImage(iconPng.dataUrl, 'PNG', startPdf.x - iconW / 2, startPdf.y - iconH / 2, iconW, iconH, undefined, 'FAST');
            continue;
          } catch {
            // fall through to vector fallback
          }
        }
        const iconW = targetSize;
        const iconH = targetSize;
        fill(doc, rgb);
        doc.roundedRect(startPdf.x - iconW / 2, startPdf.y - iconH / 2, iconW, iconH, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(5.2, iconW * 1.15));
        textColor(doc, [255, 255, 255]);
        doc.text(symbolId.slice(0, 2) || 'S', startPdf.x, startPdf.y + Math.min(2.1, iconH * 0.25), { align: 'center' });
      }
    }
    text(doc, `Scale ${s(fp?.scale || 1)} | Position ${s(JSON.stringify(fp?.position || { x: 0, y: 0 }))}`, MARGIN, y + h + 10, PAGE.w - MARGIN * 2, { size: 8.8, color: C.slate });
  }

  // 5) Room breakdown
  y = newPage('Installer Package | Rooms');
  y = section(doc, y, 'Room-by-Room Device Breakdown', 'RM', C.green);
  if (!data.rooms.length) {
    text(doc, 'No rooms defined.', MARGIN, y, PAGE.w - MARGIN * 2, { color: C.slate });
  } else {
    data.rooms.forEach((r) => {
      const devices = data.canvasProducts.filter((cp) => cp?.room === r?.id);
      y = ensure(y, 24, 'Installer Package | Rooms');
      fill(doc, C.panel);
      stroke(doc, C.line);
      doc.roundedRect(MARGIN, y - 4, PAGE.w - MARGIN * 2, 19, 2, 2, 'FD');
      y = text(doc, `${s(r?.name || r?.id)} (${devices.length} devices)`, MARGIN + 3, y + 0.4, 95, { size: 9.8, bold: true });
      const devs = devices.map((cp) => `${deviceName(cp)} [${s(cp?.product?.category || 'uncategorized')}]`).join(' | ') || 'No devices';
      y = text(doc, devs, MARGIN + 3, y - 0.2, PAGE.w - MARGIN * 2 - 6, { size: 8.6, color: C.slate });
      y = text(doc, 'Installation Notes: ___________________________________________', MARGIN + 3, y + 1.4, PAGE.w - MARGIN * 2 - 6, { size: 8.4, color: C.amber });
      y += 4;
    });
  }

  // 6) Guidelines
  y = newPage('Installer Package | Guidelines');
  y = section(doc, y, 'Installation Guidelines', 'IN', C.amber);
  [
    ['HDMI Tips', 'Use certified cables for run length and bandwidth. Keep high-data runs isolated from AC bundles.'],
    ['Power Sequencing', 'Source devices first, then processors/switchers, then displays and amplifiers.'],
    ['Network Setup', 'Use reserved/static IPs for managed AV endpoints and document switch/port mapping.'],
    ['Audio Leveling', 'Set reference levels and verify channel balance and zone trims before final handoff.']
  ].forEach(([title, body], idx) => {
    y = ensure(y, 27, 'Installer Package | Guidelines');
    fill(doc, idx % 2 ? C.panel : [255, 255, 255]);
    stroke(doc, C.line);
    doc.roundedRect(MARGIN, y - 4, PAGE.w - MARGIN * 2, 23, 2, 2, 'FD');
    y = text(doc, title, MARGIN + 3, y + 1.2, PAGE.w - MARGIN * 2 - 6, { size: 10, bold: true });
    y = text(doc, body, MARGIN + 3, y + 1.2, PAGE.w - MARGIN * 2 - 6, { size: 8.9, color: C.slate });
    y += 3;
  });

  // 7) Manuals
  y = newPage('Installer Package | Manuals');
  y = section(doc, y, 'Device Manuals', 'MN', C.blue);
  const unique = new Map();
  data.canvasProducts.forEach((cp) => {
    const key = `${s(cp?.product?.brand)}::${s(cp?.product?.model)}`;
    if (!unique.has(key)) unique.set(key, cp);
  });
  [...unique.values()].forEach((cp, idx) => {
    y = ensure(y, 24, 'Installer Package | Manuals');
    row(doc, y, idx, 19);
    y = text(doc, deviceName(cp), MARGIN + 3, y + 0.4, 95, { size: 9.4, bold: true });
    y = text(doc, `Install: ${s(cp?.product?.installation_manual_url || 'Not provided')}`, MARGIN + 3, y + 0.4, PAGE.w - MARGIN * 2 - 6, { size: 8.3, color: C.slate });
    y = text(doc, `User: ${s(cp?.product?.user_manual_url || 'Not provided')}`, MARGIN + 3, y + 0.4, PAGE.w - MARGIN * 2 - 6, { size: 8.3, color: C.slate });
    y += 4;
  });

  // 8) Sign-off
  y = newPage('Installer Package | Sign-off');
  y = section(doc, y, 'Project Sign-off', 'OK', C.green);
  y = text(doc, `Project ${data.projectName}`, MARGIN, y, PAGE.w - MARGIN * 2, { size: 10.2, bold: true });
  y = text(doc, `Client ${s(data.clientName || 'N/A')} | Location ${s(data.location || 'N/A')}`, MARGIN, y, PAGE.w - MARGIN * 2, { size: 9.1, color: C.slate });
  const fields = ['Installer Name', 'Client Name', 'Installation Complete Date', 'Final Walkthrough Date', 'Installer Signature', 'Client Signature'];
  fields.forEach((f) => {
    y = ensure(y, 18, 'Installer Package | Sign-off');
    text(doc, `${f}:`, MARGIN, y, 52, { size: 9.4, bold: true });
    stroke(doc, C.line);
    doc.line(MARGIN + 45, y + 0.2, PAGE.w - MARGIN, y + 0.2);
    y += 18;
  });
};

const client = (ctx, data, title = 'Client Package') => {
  const { doc, ensure, newPage } = ctx;
  let y = newPage(`${title} | Overview`);
  y = section(doc, y, `${title} - Proposal Overview`, 'CL', C.violet);
  y = text(
    doc,
    'Client-facing summary focused on room coverage, product scope, and investment. Installer-specific technical details are intentionally excluded.',
    MARGIN,
    y,
    PAGE.w - MARGIN * 2,
    { size: 9.5, color: C.slate }
  );
  y += 7;
  y = cardMetrics(doc, y, [
    { code: 'RM', label: 'Rooms', value: data.rooms.length, color: C.green },
    { code: 'DV', label: 'Devices', value: data.canvasProducts.length, color: C.blue },
    { code: 'PK', label: 'Package', value: 'Proposal', color: C.violet }
  ]);

  y = section(doc, y, 'Products by Room', 'PR', C.blue);
  data.rooms.forEach((r, idx) => {
    y = ensure(y, 16, `${title} | Products by Room`);
    row(doc, y, idx, 14);
    y = text(doc, s(r?.name || r?.id), MARGIN + 3, y + 1.2, 52, { size: 9.4, bold: true });
    const prods = data.canvasProducts.filter((cp) => cp?.room === r?.id).map((cp) => deviceName(cp)).join(' | ') || 'No devices';
    y = text(doc, prods, MARGIN + 58, y - 5.4, PAGE.w - MARGIN * 2 - 62, { size: 8.5, color: C.slate });
    y += 2;
  });

  y = newPage(`${title} | Investment`);
  y = section(doc, y, 'Investment Summary', 'BO', C.amber);
  fill(doc, C.navySoft);
  doc.roundedRect(MARGIN, y - 4, PAGE.w - MARGIN * 2, 9, 1.5, 1.5, 'F');
  text(doc, 'Product', MARGIN + 3, y + 1, 80, { size: 8.4, bold: true, color: [255, 255, 255] });
  text(doc, 'Qty', MARGIN + 90, y + 1, 16, { size: 8.4, bold: true, color: [255, 255, 255] });
  text(doc, 'Material', MARGIN + 108, y + 1, 34, { size: 8.4, bold: true, color: [255, 255, 255] });
  text(doc, 'Labor', MARGIN + 145, y + 1, 28, { size: 8.4, bold: true, color: [255, 255, 255] });
  text(doc, 'Total', MARGIN + 176, y + 1, 20, { size: 8.4, bold: true, color: [255, 255, 255] });
  y += 13;
  const bom = groupedBom(data.canvasProducts);
  let mat = 0;
  let lab = 0;
  bom.forEach((r, idx) => {
    y = ensure(y, 12.5, `${title} | Investment`);
    row(doc, y, idx, 11.6);
    const m = r.unit * r.qty;
    const l = (r.install + r.config) * r.qty;
    mat += m;
    lab += l;
    text(doc, `${r.brand} ${r.model}`, MARGIN + 3, y + 1.2, 84, { size: 8.7, bold: true });
    text(doc, String(r.qty), MARGIN + 90, y + 1.2, 16, { size: 8.5, color: C.slate });
    text(doc, money(m), MARGIN + 108, y + 1.2, 34, { size: 8.5, color: C.slate });
    text(doc, money(l), MARGIN + 145, y + 1.2, 28, { size: 8.5, color: C.slate });
    text(doc, money(m + l), MARGIN + 176, y + 1.2, 20, { size: 8.7, bold: true });
    y += 13;
  });
  const cablePricing = calculateCablePricing(data.connections, data.canvasProducts, data.wirePricing);
  y = ensure(y, 12, `${title} | Investment`);
  fill(doc, [237, 247, 255]);
  stroke(doc, [191, 219, 254]);
  doc.roundedRect(MARGIN, y - 4, PAGE.w - MARGIN * 2, 10, 2, 2, 'FD');
  text(
    doc,
    `Total Investment ${money(mat + lab + cablePricing.cableSubtotal + cablePricing.labor)} (Materials ${money(mat + cablePricing.cableSubtotal)} + Labor ${money(lab + cablePricing.labor)})`,
    MARGIN + 3,
    y + 1,
    PAGE.w - MARGIN * 2 - 6,
    { size: 9.7, bold: true, color: C.blue }
  );
};

export const exportProjectPdf = async ({
  projectName,
  clientName,
  location,
  exportType,
  canvasProducts = [],
  connections = [],
  rooms = [],
  floorplans = [],
  annotations = [],
  wirePricing = []
}) => {
  const data = {
    projectName: s(projectName || 'AV System Design'),
    clientName: s(clientName || ''),
    location: s(location || ''),
    exportType: s(exportType || 'installer'),
    canvasProducts: list(canvasProducts),
    connections: list(connections),
    rooms: list(rooms),
    floorplans: list(floorplans),
    annotations: list(annotations),
    wirePricing: list(wirePricing)
  };

  const ctx = createCtx(data.projectName, data.exportType);
  cover(ctx, data);

  if (data.exportType === 'installer') {
    await installer(ctx, data);
  } else if (data.exportType === 'client') {
    client(ctx, data, 'Client Package');
  } else {
    await installer(ctx, data);
    client(ctx, data, 'Client Package (Included in Full Documentation)');
  }

  ctx.doc.save(`${slug(data.projectName)}-${slug(data.exportType)}.pdf`);
};

export const exportWireSchedulePdf = ({ projectName, canvasProducts = [], connections = [] }) => {
  const data = {
    projectName: s(projectName || 'Project'),
    exportType: 'wire_schedule',
    canvasProducts: list(canvasProducts),
    connections: list(connections),
    rooms: [],
    floorplans: [],
    annotations: []
  };
  const ctx = createCtx(data.projectName, data.exportType);
  const { doc, ensure } = ctx;
  let y = TOP;
  y = section(doc, y, 'Cable / Wire Schedule', 'WS', C.violet);
  const labels = new Map(data.canvasProducts.map((cp) => [cp.instanceId, deviceName(cp)]));
  fill(doc, C.navySoft);
  doc.roundedRect(MARGIN, y - 4, PAGE.w - MARGIN * 2, 9, 1.5, 1.5, 'F');
  text(doc, 'Wire', MARGIN + 3, y + 1, 22, { size: 8.4, bold: true, color: [255, 255, 255] });
  text(doc, 'Type', MARGIN + 28, y + 1, 28, { size: 8.4, bold: true, color: [255, 255, 255] });
  text(doc, 'From', MARGIN + 58, y + 1, 60, { size: 8.4, bold: true, color: [255, 255, 255] });
  text(doc, 'To', MARGIN + 120, y + 1, 70, { size: 8.4, bold: true, color: [255, 255, 255] });
  y += 11;
  data.connections.forEach((c, idx) => {
    y = ensure(y, 11, 'Wire Schedule');
    row(doc, y, idx, 10.4);
    text(doc, s(c?.wireId || '-'), MARGIN + 3, y + 0.6, 22, { size: 8.8, bold: true });
    text(doc, s(c?.type || '-'), MARGIN + 28, y + 0.6, 28, { size: 8.6, color: C.slate });
    text(doc, `${labels.get(c?.from) || c?.from} (${s(c?.fromPort || '-')})`, MARGIN + 58, y + 0.6, 60, { size: 8.3, color: C.slate });
    text(doc, `${labels.get(c?.to) || c?.to} (${s(c?.toPort || '-')})`, MARGIN + 120, y + 0.6, 70, { size: 8.3, color: C.slate });
    y += 12;
  });
  doc.save(`${slug(data.projectName)}-Wire-Schedule.pdf`);
};

export const exportBomPdf = ({ projectName, canvasProducts = [] }) => {
  const data = {
    projectName: s(projectName || 'Project'),
    exportType: 'bom',
    canvasProducts: list(canvasProducts),
    connections: [],
    rooms: [],
    floorplans: [],
    annotations: []
  };
  const ctx = createCtx(data.projectName, data.exportType);
  client(ctx, data, 'BOM Package');
  ctx.doc.save(`${slug(data.projectName)}-BOM.pdf`);
};
