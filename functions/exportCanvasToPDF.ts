import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

// ==========================================
// DESIGN TOKENS (PDF "CSS")
// ==========================================
const theme = {
  page: {
    width: 210,
    height: 297,
    marginX: 15,
    marginY: 15,
  },
  fonts: {
    title: 20,
    subtitle: 11,
    heading: 12,
    body: 9,
    small: 8,
    tiny: 7,
  },
  colors: {
    text: [32, 38, 54],
    muted: [107, 114, 128],
    cardBg: [249, 250, 251],
    border: [229, 231, 235],
    headerLine: [229, 231, 235],
    white: [255, 255, 255],
    dark: [17, 24, 39],
    accent: [59, 130, 246],
    success: [34, 197, 94],
    warning: [251, 191, 36],
    categories: {
      televisions: [59, 130, 246],
      projectors: [139, 92, 246],
      projector_screens: [217, 70, 239],
      video_distribution: [6, 182, 212],
      matrix_switchers: [20, 184, 166],
      audio_streamers: [236, 72, 153],
      media_streamers: [244, 63, 94],
      speakers: [34, 197, 94],
      soundbars: [132, 204, 22],
      subwoofers: [239, 68, 68],
      stereo_amps: [249, 115, 22],
      multizone_amps: [245, 158, 11],
      surround_processors: [234, 179, 8],
      av_receivers: [16, 185, 129],
      network_switches: [100, 116, 139],
      control_processors: [139, 92, 246],
      default: [75, 85, 99]
    },
    cables: {
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
    }
  },
  layout: {
    cardWidth: 85,
    cardHeight: 52,
    cardRadius: 3,
    cardGapX: 10,
    cardGapY: 8,
    cardPaddingX: 6,
    cardPaddingY: 6,
    topBarHeight: 2.5,
  }
};

// Category icons (emoji-style symbols for PDF)
const categoryIcons = {
  televisions: '📺', projectors: '📽', projector_screens: '🖼',
  video_distribution: '🔀', matrix_switchers: '⊞', audio_streamers: '🎵',
  media_streamers: '▶', speakers: '🔊', soundbars: '🔉', subwoofers: '🔈',
  stereo_amps: '🎛', multizone_amps: '🎚', surround_processors: '🎬',
  av_receivers: '📻', network_switches: '🌐', control_processors: '⚙'
};

// Simple text icons as fallback (jsPDF doesn't render emojis well)
const categoryTextIcons = {
  televisions: 'TV', projectors: 'PJ', projector_screens: 'SC',
  video_distribution: 'VD', matrix_switchers: 'MX', audio_streamers: 'AS',
  media_streamers: 'MS', speakers: 'SP', soundbars: 'SB', subwoofers: 'SW',
  stereo_amps: 'SA', multizone_amps: 'MA', surround_processors: 'SR',
  av_receivers: 'AV', network_switches: 'NS', control_processors: 'CP'
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================
const setColor = (doc, color) => doc.setTextColor(color[0], color[1], color[2]);
const setFill = (doc, color) => doc.setFillColor(color[0], color[1], color[2]);
const setDraw = (doc, color) => doc.setDrawColor(color[0], color[1], color[2]);

const getCategoryColor = (category) => 
  theme.colors.categories[category] || theme.colors.categories.default;

const getCableColor = (type) => 
  theme.colors.cables[type] || theme.colors.muted;

const truncateText = (str, maxLen) => 
  str && str.length > maxLen ? str.substring(0, maxLen - 1) + '..' : (str || '');

const truncate = truncateText;

const centerText = (doc, text, y, fontSize) => {
  doc.setFontSize(fontSize);
  const textWidth = doc.getTextWidth(text);
  doc.text(text, (theme.page.width - textWidth) / 2, y);
};

// ==========================================
// REUSABLE COMPONENTS
// ==========================================
function drawPageHeader(doc, title, subtitle, y = theme.page.marginY) {
  const { marginX, width } = theme.page;
  
  setColor(doc, theme.colors.text);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(theme.fonts.title);
  doc.text(title, marginX, y + 6);
  
  setColor(doc, theme.colors.muted);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(theme.fonts.subtitle);
  doc.text(subtitle, marginX, y + 13);
  
  setDraw(doc, theme.colors.headerLine);
  doc.setLineWidth(0.3);
  doc.line(marginX, y + 17, width - marginX, y + 17);
  
  return y + 22;
}

// Draw a category-specific icon shape
function drawCategoryIcon(doc, cx, cy, category, size = 10) {
  const catColor = getCategoryColor(category);
  setFill(doc, catColor);
  setDraw(doc, catColor);

  const halfSize = size / 2;

  switch(category) {
    case 'televisions':
      // TV shape - rectangle with stand
      doc.roundedRect(cx - halfSize, cy - halfSize * 0.7, size, size * 0.7, 1, 1, 'F');
      doc.rect(cx - 1, cy + halfSize * 0.1, 2, 2, 'F');
      doc.rect(cx - halfSize * 0.6, cy + halfSize * 0.5, size * 0.6, 1, 'F');
      break;
    case 'projectors':
      // Projector - lens circle with body
      doc.roundedRect(cx - halfSize, cy - halfSize * 0.5, size, size * 0.6, 1, 1, 'F');
      setFill(doc, theme.colors.white);
      doc.circle(cx - halfSize * 0.3, cy, halfSize * 0.4, 'F');
      setFill(doc, catColor);
      doc.circle(cx - halfSize * 0.3, cy, halfSize * 0.2, 'F');
      break;
    case 'speakers':
      // Speaker cone
      doc.roundedRect(cx - halfSize * 0.8, cy - halfSize, size * 0.8, size, 2, 2, 'F');
      setFill(doc, theme.colors.white);
      doc.circle(cx, cy - halfSize * 0.3, halfSize * 0.3, 'F');
      doc.circle(cx, cy + halfSize * 0.4, halfSize * 0.5, 'F');
      break;
    case 'av_receivers':
      // Receiver - rectangle with knobs
      doc.roundedRect(cx - halfSize, cy - halfSize * 0.4, size, size * 0.5, 1, 1, 'F');
      setFill(doc, theme.colors.white);
      doc.circle(cx - halfSize * 0.5, cy, 1.5, 'F');
      doc.circle(cx + halfSize * 0.5, cy, 1.5, 'F');
      break;
    case 'media_streamers':
      // Play button triangle
      doc.circle(cx, cy, halfSize, 'F');
      setFill(doc, theme.colors.white);
      doc.triangle(cx - 2, cy - 3, cx - 2, cy + 3, cx + 3, cy, 'F');
      break;
    case 'network_switches':
      // Network icon - square with dots
      doc.roundedRect(cx - halfSize, cy - halfSize * 0.5, size, size * 0.5, 1, 1, 'F');
      setFill(doc, theme.colors.white);
      for (let i = 0; i < 4; i++) {
        doc.circle(cx - halfSize * 0.6 + i * 3, cy, 0.8, 'F');
      }
      break;
    case 'subwoofers':
      // Subwoofer - square with big cone
      doc.roundedRect(cx - halfSize, cy - halfSize, size, size, 2, 2, 'F');
      setFill(doc, theme.colors.white);
      doc.circle(cx, cy, halfSize * 0.7, 'F');
      setFill(doc, catColor);
      doc.circle(cx, cy, halfSize * 0.3, 'F');
      break;
    default:
      // Default circle with text
      doc.circle(cx, cy, halfSize, 'F');
      setColor(doc, theme.colors.white);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(6);
      const iconText = categoryTextIcons[category] || 'DV';
      doc.text(iconText, cx, cy + 1.5, { align: 'center' });
  }
}

function drawDeviceCard(doc, x, y, device, connections) {
    const { cardWidth, cardHeight, cardRadius, cardPaddingX, cardPaddingY, topBarHeight } = theme.layout;
    const categoryColor = getCategoryColor(device.product.category);

    // Card background
    setFill(doc, theme.colors.cardBg);
    setDraw(doc, theme.colors.border);
    doc.roundedRect(x, y, cardWidth, cardHeight, cardRadius, cardRadius, 'FD');

    // Top accent bar
    setFill(doc, categoryColor);
    doc.roundedRect(x, y, cardWidth, topBarHeight, cardRadius, cardRadius, 'F');
    doc.rect(x, y + topBarHeight - 1, cardWidth, 1, 'F');

    // Category icon
    const iconCx = x + cardPaddingX + 6;
    const iconCy = y + topBarHeight + cardPaddingY + 6;

    drawCategoryIcon(doc, iconCx, iconCy, device.product.category, 12);
  
  // Device name
  const titleX = iconCx + 10;
  setColor(doc, theme.colors.text);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(theme.fonts.heading);
  doc.text(truncate(device.label || device.product.brand, 14), titleX, iconCy + 1);
  
  // Category tag
  const catText = device.product.category.replace(/_/g, ' ');
  doc.setFontSize(theme.fonts.tiny);
  const catWidth = doc.getTextWidth(catText) + 4;
  const tagX = x + cardWidth - cardPaddingX - catWidth;
  const tagY = y + topBarHeight + 3;
  
  setFill(doc, [248, 250, 252]);
  setDraw(doc, [226, 232, 240]);
  doc.roundedRect(tagX, tagY, catWidth, 5, 1.5, 1.5, 'FD');
  setColor(doc, theme.colors.muted);
  doc.setFont(undefined, 'normal');
  doc.text(catText, tagX + 2, tagY + 3.5);
  
  // Info grid
  const col1X = x + cardPaddingX;
  const col2X = x + cardWidth / 2 + 2;
  let infoY = y + topBarHeight + cardPaddingY + 14;
  
  doc.setFontSize(theme.fonts.small);
  
  // Model & Room
  setColor(doc, theme.colors.muted);
  doc.text('Model', col1X, infoY);
  doc.text('Room', col2X, infoY);
  
  setColor(doc, theme.colors.text);
  doc.text(truncate(device.product.model, 16), col1X, infoY + 4);
  doc.text(truncate(device.room || 'Unassigned', 14), col2X, infoY + 4);
  
  // IP & Ports
  infoY += 10;
  setColor(doc, theme.colors.muted);
  doc.text('IP Address', col1X, infoY);
  doc.text('Ports', col2X, infoY);
  
  setColor(doc, theme.colors.text);
  const ip = device.networkInfo?.ip && device.networkInfo.ip !== '000.000.000.000' 
    ? device.networkInfo.ip : '-';
  doc.text(ip, col1X, infoY + 4);
  
  const portsInUse = connections.map(c => c.from === device.instanceId ? c.fromPort : c.toPort).filter(Boolean);
  const portsText = portsInUse.length > 0 ? portsInUse.slice(0, 2).join(', ') + (portsInUse.length > 2 ? '...' : '') : '-';
  doc.text(truncate(portsText, 14), col2X, infoY + 4);
  
  // Connection count badge
  if (connections.length > 0) {
    const badgeX = x + cardWidth - cardPaddingX - 8;
    const badgeY = y + cardHeight - cardPaddingY - 5;
    setFill(doc, [239, 246, 255]);
    setDraw(doc, [219, 234, 254]);
    doc.roundedRect(badgeX, badgeY, 8, 5, 2, 2, 'FD');
    setColor(doc, theme.colors.accent);
    doc.setFontSize(theme.fonts.tiny);
    doc.text(connections.length.toString(), badgeX + 4, badgeY + 3.5, { align: 'center' });
  }
}

function drawDarkHeader(doc, title, subtitle) {
  const { marginX, width } = theme.page;
  setFill(doc, theme.colors.dark);
  doc.rect(0, 0, width, 28, 'F');
  setColor(doc, theme.colors.white);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(16);
  doc.text(title, marginX, 18);
  if (subtitle) {
    setColor(doc, theme.colors.muted);
    doc.setFontSize(10);
    doc.text(subtitle, width - marginX, 18, { align: 'right' });
  }
  return 38;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestData = await req.json();
    const { action, canvasProducts, connections, projectName, rooms = [], clientName, location, orgSettings, floorplans = [] } = requestData;

    // Handle label and diagram generation actions
    if (action === 'generateDeviceLabel') {
      const { device } = requestData;
      if (!device) {
        return Response.json({ error: 'Device data required' }, { status: 400 });
      }
      
      const doc = new jsPDF({ unit: 'mm', format: [100, 50], orientation: 'landscape' });
      const catColor = getCategoryColor(device.product?.category);
      
      // Background
      setFill(doc, theme.colors.white);
      doc.rect(0, 0, 100, 50, 'F');
      
      // Left accent bar
      setFill(doc, catColor);
      doc.rect(0, 0, 4, 50, 'F');
      
      // Category icon
      doc.circle(15, 18, 8, 'F');
      setColor(doc, theme.colors.white);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
      const iconText = categoryIcons[device.product?.category] || 'DV';
      doc.text(iconText, 15, 20, { align: 'center' });
      
      // Device name
      setColor(doc, theme.colors.dark);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(14);
      doc.text(device.label || device.product?.brand || 'Device', 28, 16);
      
      // Model
      setColor(doc, theme.colors.muted);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(device.product?.model || '', 28, 24);
      
      // Room & IP
      doc.setFontSize(8);
      if (device.room) {
        doc.text(`Room: ${device.room}`, 8, 38);
      }
      if (device.networkInfo?.ip && device.networkInfo.ip !== '000.000.000.000') {
        doc.text(`IP: ${device.networkInfo.ip}`, 8, 45);
      }
      
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      return Response.json({ pdf: pdfBase64 });
    }

    if (action === 'generateCableLabel') {
      const { connection, fromDevice, toDevice } = requestData;
      if (!connection) {
        return Response.json({ error: 'Connection data required' }, { status: 400 });
      }
      
      const doc = new jsPDF({ unit: 'mm', format: [80, 30], orientation: 'landscape' });
      const cableColor = getCableColor(connection.type);
      
      // Background with cable color
      setFill(doc, cableColor);
      doc.rect(0, 0, 80, 30, 'F');
      
      // Wire ID
      setColor(doc, theme.colors.white);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(14);
      doc.text(connection.wireId || 'CABLE', 5, 12);
      
      // Route info
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      const fromLabel = fromDevice?.label || fromDevice?.product?.brand || 'Source';
      const toLabel = toDevice?.label || toDevice?.product?.brand || 'Destination';
      doc.text(`${fromLabel} → ${toLabel}`, 5, 20);
      
      // Type and ports
      doc.setFontSize(7);
      doc.text(`${connection.type} | ${connection.fromPort || '?'} → ${connection.toPort || '?'}`, 5, 26);
      
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      return Response.json({ pdf: pdfBase64 });
    }

    if (action === 'generateWireSchedule') {
      const { canvasProducts: devices = [], connections: conns = [], projectName: pName, clientName: cName } = requestData;

      if (!conns || conns.length === 0) {
        return Response.json({ error: 'No connections to export' }, { status: 400 });
      }

      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 15;

      // Header
      setFill(doc, theme.colors.dark);
      doc.rect(0, 0, pageWidth, 30, 'F');

      // Logo on left (if available in orgSettings) - maintain aspect ratio
      if (orgSettings?.logo_url) {
        try {
          const logoResponse = await fetch(orgSettings.logo_url);
          const logoBlob = await logoResponse.blob();
          const logoArrayBuffer = await logoBlob.arrayBuffer();
          const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoArrayBuffer)));
          const logoFormat = orgSettings.logo_url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
          // Max height 18mm, maintain aspect ratio
          const maxHeight = 18;
          const maxWidth = 40;
          doc.addImage(`data:image/${logoFormat.toLowerCase()};base64,${logoBase64}`, logoFormat, margin, 6, 0, maxHeight);
        } catch (e) {
          console.log('Could not load logo:', e);
        }
      }

      // Centered title
      setColor(doc, theme.colors.white);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(20);
      doc.text('Wire Schedule', pageWidth / 2, 18, { align: 'center' });

      // Project info on right
      setColor(doc, theme.colors.muted);
      doc.setFontSize(10);
      doc.text(pName || 'AV System', pageWidth - margin, 15, { align: 'right' });
      if (cName) {
        doc.text(cName, pageWidth - margin, 22, { align: 'right' });
      }

      let y = 45;

      // Table header
      const colWidths = [25, 55, 35, 55, 35, 30, 35];
      const headers = ['Wire ID', 'From Device', 'From Port', 'To Device', 'To Port', 'Type', 'Rooms'];

      setFill(doc, [31, 41, 55]);
      doc.rect(margin, y - 6, pageWidth - margin * 2, 10, 'F');
      setColor(doc, theme.colors.white);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);

      let xPos = margin + 3;
      headers.forEach((header, i) => {
        doc.text(header, xPos, y);
        xPos += colWidths[i];
      });

      y += 8;

      // Table rows
      conns.forEach((conn, i) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 25;

          // Redraw header on new page
          setFill(doc, [31, 41, 55]);
          doc.rect(margin, y - 6, pageWidth - margin * 2, 10, 'F');
          setColor(doc, theme.colors.white);
          doc.setFont(undefined, 'bold');
          doc.setFontSize(8);
          xPos = margin + 3;
          headers.forEach((header, j) => {
            doc.text(header, xPos, y);
            xPos += colWidths[j];
          });
          y += 8;
        }

        const fromDevice = devices.find(d => d.instanceId === conn.from);
        const toDevice = devices.find(d => d.instanceId === conn.to);

        // Zebra striping
        if (i % 2 === 0) {
          setFill(doc, [249, 250, 251]);
          doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
        }

        xPos = margin + 3;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);

        // Wire ID badge
        const cableColor = getCableColor(conn.type);
        setFill(doc, cableColor);
        doc.roundedRect(xPos, y - 3, 18, 6, 1, 1, 'F');
        setColor(doc, theme.colors.white);
        doc.setFont(undefined, 'bold');
        doc.text(conn.wireId || `W${i + 1}`, xPos + 2, y + 1);
        xPos += colWidths[0];

        setColor(doc, theme.colors.dark);
        doc.setFont(undefined, 'normal');
        doc.text(truncate(fromDevice?.label || fromDevice?.product?.brand || 'Unknown', 20), xPos, y + 1);
        xPos += colWidths[1];
        doc.text(truncate(conn.fromPort || '-', 12), xPos, y + 1);
        xPos += colWidths[2];
        doc.text(truncate(toDevice?.label || toDevice?.product?.brand || 'Unknown', 20), xPos, y + 1);
        xPos += colWidths[3];
        doc.text(truncate(conn.toPort || '-', 12), xPos, y + 1);
        xPos += colWidths[4];
        setColor(doc, cableColor);
        doc.text(truncate(conn.type || '-', 10), xPos, y + 1);
        xPos += colWidths[5];
        setColor(doc, theme.colors.muted);
        const rooms = [fromDevice?.room, toDevice?.room].filter(Boolean);
        doc.text(truncate([...new Set(rooms)].join(' → ') || '-', 12), xPos, y + 1);

        y += 8;
      });

      // Footer
      setColor(doc, theme.colors.muted);
      doc.setFontSize(8);
      doc.text(`Generated ${new Date().toLocaleDateString()} | ${conns.length} connections`, margin, pageHeight - 10);

      const pdfBase64 = doc.output('datauristring').split(',')[1];
      return Response.json({ pdf: pdfBase64 });
    }

    if (action === 'generateBOM') {
      const { canvasProducts: devices = [], connections: conns = [], projectName: pName, clientName: cName } = requestData;

      if (!devices || devices.length === 0) {
        return Response.json({ error: 'No devices to export' }, { status: 400 });
      }

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;

      // Header
      setFill(doc, theme.colors.dark);
      doc.rect(0, 0, pageWidth, 30, 'F');

      // Logo on left (if available in orgSettings) - maintain aspect ratio
      if (orgSettings?.logo_url) {
        try {
          const logoResponse = await fetch(orgSettings.logo_url);
          const logoBlob = await logoResponse.blob();
          const logoArrayBuffer = await logoBlob.arrayBuffer();
          const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoArrayBuffer)));
          const logoFormat = orgSettings.logo_url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
          // Max height 18mm, maintain aspect ratio
          const maxHeight = 18;
          doc.addImage(`data:image/${logoFormat.toLowerCase()};base64,${logoBase64}`, logoFormat, margin, 6, 0, maxHeight);
        } catch (e) {
          console.log('Could not load logo:', e);
        }
      }

      // Centered title
      setColor(doc, theme.colors.white);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(20);
      doc.text('Bill of Materials', pageWidth / 2, 18, { align: 'center' });

      // Project info on right
      setColor(doc, theme.colors.muted);
      doc.setFontSize(10);
      doc.text(pName || 'AV System', pageWidth - margin, 15, { align: 'right' });
      if (cName) {
        doc.text(cName, pageWidth - margin, 22, { align: 'right' });
      }

      let y = 45;

      // Group by brand+model for quantity count
      const grouped = {};
      devices.forEach(d => {
        const key = `${d.product?.brand || 'Unknown'}|${d.product?.model || 'Unknown'}|${d.product?.category || ''}`;
        if (!grouped[key]) {
          grouped[key] = {
            brand: d.product?.brand || 'Unknown',
            model: d.product?.model || 'Unknown',
            category: d.product?.category || '',
            price: d.product?.price || 0,
            quantity: 0,
            rooms: [],
            isCable: false
          };
        }
        grouped[key].quantity++;
        if (d.room && !grouped[key].rooms.includes(d.room)) {
          grouped[key].rooms.push(d.room);
        }
      });

      // Calculate cable requirements from connections
      const cableRequirements = {};
      const hdmiCrossRoomConnections = [];
      
      conns.forEach(conn => {
        if (!conn) return;
        const fromDevice = devices.find(d => d.instanceId === conn.from);
        const toDevice = devices.find(d => d.instanceId === conn.to);
        const fromRoom = fromDevice?.room || 'Unassigned';
        const toRoom = toDevice?.room || 'Unassigned';
        const sameRoom = fromRoom === toRoom;
        const cableType = conn.type || 'Unknown';
        
        // Determine cable length and type based on connection type and room proximity
        let cableName, cableLength, cableNotes = '';
        
        let isExtender = false;
        if (cableType === 'HDMI' || cableType === 'HDBaseT') {
          if (sameRoom) {
            cableName = 'HDMI Cable (15ft)';
            cableLength = '15ft';
          } else {
            // Cross-room HDMI requires extender
            hdmiCrossRoomConnections.push({
              from: fromDevice?.label || fromDevice?.product?.brand || 'Unknown',
              to: toDevice?.label || toDevice?.product?.brand || 'Unknown',
              fromRoom,
              toRoom
            });
            cableName = 'HDBaseT/AVoIP Extender Kit';
            cableLength = 'Kit';
            cableNotes = `Cross-room: ${fromRoom} → ${toRoom}`;
            isExtender = true;
          }
        } else if (cableType === 'Ethernet') {
          if (sameRoom) {
            cableName = 'Ethernet Cable Cat6 (15ft)';
            cableLength = '15ft';
          } else {
            cableName = 'Ethernet Cable Cat6 (250ft)';
            cableLength = '250ft';
          }
        } else if (cableType === 'Speaker Wire') {
          if (sameRoom) {
            cableName = 'Speaker Wire 14AWG (15ft)';
            cableLength = '15ft';
          } else {
            cableName = 'Speaker Wire 14AWG (250ft)';
            cableLength = '250ft';
          }
        } else if (cableType === 'Optical' || cableType === 'Optical/TOSLINK') {
          cableName = 'Optical/TOSLINK Cable (6ft)';
          cableLength = '6ft';
        } else if (cableType === 'RCA') {
          cableName = 'RCA Audio Cable (6ft)';
          cableLength = '6ft';
        } else if (cableType === 'XLR') {
          cableName = 'XLR Balanced Cable (15ft)';
          cableLength = '15ft';
        } else if (cableType === 'Subwoofer') {
          cableName = 'Subwoofer Cable (15ft)';
          cableLength = '15ft';
        } else if (cableType === 'Coaxial') {
          cableName = 'Coaxial Digital Cable (6ft)';
          cableLength = '6ft';
        } else if (cableType === 'USB') {
          cableName = 'USB Cable (6ft)';
          cableLength = '6ft';
        } else if (cableType === 'RS232' || cableType === 'Control') {
          cableName = 'RS232/Control Cable (15ft)';
          cableLength = '15ft';
        } else if (cableType === 'Component' || cableType === 'Composite' || cableType === 'VGA') {
          cableName = `${cableType} Cable (6ft)`;
          cableLength = '6ft';
        } else {
          cableName = `${cableType} Cable`;
          cableLength = '-';
        }
        
        // Use unique key that includes notes for extenders (to separate different cross-room connections)
        const cableKey = isExtender ? `${cableName}_${cableNotes}` : cableName;
        if (!cableRequirements[cableKey]) {
          cableRequirements[cableKey] = {
            brand: 'Cable/Wire',
            model: cableName,
            category: 'cables',
            price: 0,
            quantity: 0,
            rooms: [],
            isCable: true,
            isExtender: isExtender,
            notes: cableNotes
          };
        }
        cableRequirements[cableKey].quantity++;
      });

      // Combine devices and cables
      const items = [...Object.values(grouped), ...Object.values(cableRequirements)];

      // EQUIPMENT SECTION
      setColor(doc, theme.colors.dark);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('Equipment', margin, y);
      y += 8;

      // Table header
      const colWidths = [50, 45, 35, 15, 20, 25];
      const headers = ['Brand / Model', 'Category', 'Rooms', 'Qty', 'Unit $', 'Total $'];

      setFill(doc, [31, 41, 55]);
      doc.rect(margin, y - 6, pageWidth - margin * 2, 10, 'F');
      setColor(doc, theme.colors.white);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);

      let xPos = margin + 3;
      headers.forEach((header, i) => {
        doc.text(header, xPos, y);
        xPos += colWidths[i];
      });

      y += 10;

      let grandTotal = 0;
      let deviceCount = 0;

      // Equipment rows (non-cables)
      const equipmentItems = items.filter(item => !item.isCable);
      equipmentItems.forEach((item, i) => {
        if (y > pageHeight - 50) {
          doc.addPage();
          y = 25;

          // Redraw header
          setFill(doc, [31, 41, 55]);
          doc.rect(margin, y - 6, pageWidth - margin * 2, 10, 'F');
          setColor(doc, theme.colors.white);
          doc.setFont(undefined, 'bold');
          doc.setFontSize(8);
          xPos = margin + 3;
          headers.forEach((header, j) => {
            doc.text(header, xPos, y);
            xPos += colWidths[j];
          });
          y += 10;
        }

        // Zebra striping
        if (i % 2 === 0) {
          setFill(doc, [249, 250, 251]);
          doc.rect(margin, y - 5, pageWidth - margin * 2, 10, 'F');
        }

        const catColor = getCategoryColor(item.category);
        const lineTotal = item.price * item.quantity;
        grandTotal += lineTotal;
        deviceCount += item.quantity;

        xPos = margin + 3;

        // Category color dot
        setFill(doc, catColor);
        doc.circle(xPos + 2, y, 2, 'F');

        setColor(doc, theme.colors.dark);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);
        doc.text(truncate(item.brand, 18), xPos + 6, y - 1);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(7);
        setColor(doc, theme.colors.muted);
        doc.text(truncate(item.model, 20), xPos + 6, y + 4);
        xPos += colWidths[0];

        doc.setFontSize(7);
        doc.text(truncate(item.category.replace(/_/g, ' '), 16), xPos, y + 1);
        xPos += colWidths[1];

        doc.text(truncate(item.rooms.join(', ') || '-', 14), xPos, y + 1);
        xPos += colWidths[2];

        setColor(doc, theme.colors.dark);
        doc.setFont(undefined, 'bold');
        doc.text(item.quantity.toString(), xPos + 4, y + 1);
        xPos += colWidths[3];

        doc.setFont(undefined, 'normal');
        doc.text(item.price ? `$${item.price.toFixed(0)}` : '-', xPos, y + 1);
        xPos += colWidths[4];

        doc.text(lineTotal ? `$${lineTotal.toFixed(0)}` : '-', xPos, y + 1);

        y += 10;
      });

      // Equipment subtotal
      y += 3;
      setFill(doc, [229, 231, 235]);
      doc.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F');
      setColor(doc, theme.colors.dark);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text('Equipment Subtotal', margin + 5, y);
      doc.text(`${deviceCount} items`, margin + 120, y);
      if (grandTotal > 0) {
        doc.text(`$${grandTotal.toFixed(0)}`, pageWidth - margin - 5, y, { align: 'right' });
      }
      y += 15;

      // CABLES & WIRING SECTION
      const cableItems = items.filter(item => item.isCable && !item.isExtender);
      const extenderItems = items.filter(item => item.isExtender);
      
      // Collect all notes for reference
      const allNotes = [];
      cableItems.forEach(item => {
        if (item.notes && !allNotes.includes(item.notes)) {
          allNotes.push(item.notes);
        }
      });
      extenderItems.forEach(item => {
        if (item.notes && !allNotes.includes(item.notes)) {
          allNotes.push(item.notes);
        }
      });

      // Default cable prices (estimates)
      const cablePrices = {
        'HDMI Cable (15ft)': 25,
        'Ethernet Cable Cat6 (15ft)': 12,
        'Ethernet Cable Cat6 (250ft)': 85,
        'Speaker Wire 14AWG (15ft)': 15,
        'Speaker Wire 14AWG (250ft)': 95,
        'Optical/TOSLINK Cable (6ft)': 15,
        'RCA Audio Cable (6ft)': 12,
        'XLR Balanced Cable (15ft)': 35,
        'Subwoofer Cable (15ft)': 25,
        'Coaxial Digital Cable (6ft)': 15,
        'USB Cable (6ft)': 10,
        'RS232/Control Cable (15ft)': 20,
        'Component Cable (6ft)': 18,
        'Composite Cable (6ft)': 10,
        'VGA Cable (6ft)': 15,
        'HDBaseT/AVoIP Extender Kit': 450,
      };

      if (cableItems.length > 0) {
        if (y > pageHeight - 80) {
          doc.addPage();
          y = 25;
        }

        setColor(doc, theme.colors.dark);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text('Cables & Wiring', margin, y);
        y += 8;

        // Cable table header
        const cableColWidths = [60, 15, 15, 20, 25, 25];
        const cableHeaders = ['Cable Type', 'Note', 'Qty', 'Length', 'Unit $', 'Total $'];

        setFill(doc, [142, 92, 44]); // Brown for cables
        doc.rect(margin, y - 6, pageWidth - margin * 2, 10, 'F');
        setColor(doc, theme.colors.white);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);

        xPos = margin + 3;
        cableHeaders.forEach((header, i) => {
          doc.text(header, xPos, y);
          xPos += cableColWidths[i];
        });
        y += 10;

        let cableTotal = 0;

        cableItems.forEach((item, i) => {
          if (y > pageHeight - 50) {
            doc.addPage();
            y = 25;
            
            // Redraw cable header
            setFill(doc, [142, 92, 44]);
            doc.rect(margin, y - 6, pageWidth - margin * 2, 10, 'F');
            setColor(doc, theme.colors.white);
            doc.setFont(undefined, 'bold');
            doc.setFontSize(8);
            xPos = margin + 3;
            cableHeaders.forEach((header, j) => {
              doc.text(header, xPos, y);
              xPos += cableColWidths[j];
            });
            y += 10;
          }

          // Zebra striping
          if (i % 2 === 0) {
            setFill(doc, [254, 249, 231]);
            doc.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F');
          }

          xPos = margin + 3;

          // Cable icon
          setFill(doc, getCableColor(item.model.includes('HDMI') ? 'HDMI' : 
                                     item.model.includes('Ethernet') ? 'Ethernet' :
                                     item.model.includes('Speaker') ? 'Speaker Wire' : 
                                     item.model.includes('Optical') ? 'Optical' : 'Control'));
          doc.circle(xPos + 2, y - 1, 2, 'F');

          setColor(doc, theme.colors.dark);
          doc.setFont(undefined, 'normal');
          doc.setFontSize(8);
          doc.text(truncate(item.model, 28), xPos + 6, y);
          xPos += cableColWidths[0];

          // Note reference number
          const noteIndex = item.notes ? allNotes.indexOf(item.notes) + 1 : 0;
          if (noteIndex > 0) {
            setFill(doc, [100, 116, 139]);
            doc.circle(xPos + 5, y - 1, 4, 'F');
            setColor(doc, theme.colors.white);
            doc.setFont(undefined, 'bold');
            doc.setFontSize(6);
            doc.text(noteIndex.toString(), xPos + 5, y, { align: 'center' });
          }
          xPos += cableColWidths[1];

          setColor(doc, theme.colors.dark);
          doc.setFont(undefined, 'bold');
          doc.setFontSize(8);
          doc.text(item.quantity.toString(), xPos + 4, y);
          xPos += cableColWidths[2];

          doc.setFont(undefined, 'normal');
          const lengthMatch = item.model.match(/\((\d+ft|Kit)\)/);
          doc.text(lengthMatch ? lengthMatch[1] : '-', xPos, y);
          xPos += cableColWidths[3];

          // Unit price
          const unitPrice = cablePrices[item.model] || 0;
          doc.text(unitPrice > 0 ? `$${unitPrice}` : '-', xPos, y);
          xPos += cableColWidths[4];

          // Total price
          const lineTotal = unitPrice * item.quantity;
          cableTotal += lineTotal;
          doc.text(lineTotal > 0 ? `$${lineTotal}` : '-', xPos, y);

          y += 8;
        });

        // Cable subtotal
        y += 3;
        setFill(doc, [217, 179, 130]);
        doc.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F');
        setColor(doc, theme.colors.dark);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.text('Cables Subtotal', margin + 5, y);
        doc.text(`${cableItems.reduce((sum, c) => sum + c.quantity, 0)} cables`, margin + 100, y);
        if (cableTotal > 0) {
          doc.text(`$${cableTotal}`, pageWidth - margin - 5, y, { align: 'right' });
        }
        y += 12;
        grandTotal += cableTotal;
      }

      // HDMI EXTENDERS SECTION
      if (extenderItems.length > 0) {
        if (y > pageHeight - 60) {
          doc.addPage();
          y = 25;
        }

        setColor(doc, theme.colors.dark);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text('HDMI Extenders (Cross-Room)', margin, y);
        y += 8;

        // Extender table header
        const extColWidths = [70, 15, 15, 30, 30];
        const extHeaders = ['Equipment', 'Note', 'Qty', 'Unit $', 'Total $'];

        setFill(doc, [139, 92, 246]); // Purple for extenders
        doc.rect(margin, y - 6, pageWidth - margin * 2, 10, 'F');
        setColor(doc, theme.colors.white);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);

        xPos = margin + 3;
        extHeaders.forEach((header, i) => {
          doc.text(header, xPos, y);
          xPos += extColWidths[i];
        });
        y += 10;

        let extenderTotal = 0;

        extenderItems.forEach((item, i) => {
          // Zebra striping
          if (i % 2 === 0) {
            setFill(doc, [243, 232, 255]);
            doc.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F');
          }

          xPos = margin + 3;

          // Extender icon
          setFill(doc, [139, 92, 246]);
          doc.circle(xPos + 2, y - 1, 2, 'F');

          setColor(doc, theme.colors.dark);
          doc.setFont(undefined, 'normal');
          doc.setFontSize(8);
          doc.text(truncate(item.model, 32), xPos + 6, y);
          xPos += extColWidths[0];

          // Note reference number
          const noteIndex = item.notes ? allNotes.indexOf(item.notes) + 1 : 0;
          if (noteIndex > 0) {
            setFill(doc, [139, 92, 246]);
            doc.circle(xPos + 5, y - 1, 4, 'F');
            setColor(doc, theme.colors.white);
            doc.setFont(undefined, 'bold');
            doc.setFontSize(6);
            doc.text(noteIndex.toString(), xPos + 5, y, { align: 'center' });
          }
          xPos += extColWidths[1];

          setColor(doc, theme.colors.dark);
          doc.setFont(undefined, 'bold');
          doc.setFontSize(8);
          doc.text(item.quantity.toString(), xPos + 4, y);
          xPos += extColWidths[2];

          doc.setFont(undefined, 'normal');
          const unitPrice = cablePrices[item.model] || 450;
          doc.text(`$${unitPrice}`, xPos, y);
          xPos += extColWidths[3];

          const lineTotal = unitPrice * item.quantity;
          extenderTotal += lineTotal;
          doc.text(`$${lineTotal}`, xPos, y);

          y += 8;
        });

        // Extender subtotal
        y += 3;
        setFill(doc, [196, 181, 253]);
        doc.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F');
        setColor(doc, theme.colors.dark);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.text('Extenders Subtotal', margin + 5, y);
        doc.text(`${extenderItems.reduce((sum, c) => sum + c.quantity, 0)} kits`, margin + 100, y);
        if (extenderTotal > 0) {
          doc.text(`$${extenderTotal}`, pageWidth - margin - 5, y, { align: 'right' });
        }
        y += 12;
        grandTotal += extenderTotal;
      }

      // NOTES SECTION
      if (allNotes.length > 0) {
        if (y > pageHeight - 50) {
          doc.addPage();
          y = 25;
        }

        y += 5;
        setColor(doc, theme.colors.dark);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text('Notes', margin, y);
        y += 8;

        setFill(doc, [249, 250, 251]);
        const notesHeight = Math.max(allNotes.length * 8 + 8, 20);
        doc.rect(margin, y - 4, pageWidth - margin * 2, notesHeight, 'F');

        allNotes.forEach((note, i) => {
          // Note number badge
          setFill(doc, [100, 116, 139]);
          doc.circle(margin + 8, y + 1, 4, 'F');
          setColor(doc, theme.colors.white);
          doc.setFont(undefined, 'bold');
          doc.setFontSize(6);
          doc.text((i + 1).toString(), margin + 8, y + 2.5, { align: 'center' });

          // Note text in italic style
          setColor(doc, [55, 65, 81]);
          doc.setFont(undefined, 'italic');
          doc.setFontSize(8);
          doc.text(note, margin + 16, y + 2);
          y += 8;
        });
        y += 5;
      }

      // Grand Total row
      y += 8;
      setFill(doc, theme.colors.dark);
      doc.rect(margin, y - 5, pageWidth - margin * 2, 10, 'F');
      setColor(doc, theme.colors.white);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.text('GRAND TOTAL', margin + 5, y + 1);
      doc.text(`${devices.length} devices + ${cableItems.reduce((sum, c) => sum + c.quantity, 0)} cables`, margin + 80, y + 1);

      // Footer
      setColor(doc, theme.colors.muted);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);

      const pdfBase64 = doc.output('datauristring').split(',')[1];
      return Response.json({ pdf: pdfBase64 });
    }

    // Default: Full installation package
    // Allow export if we have floorplans even without devices
    if ((!canvasProducts || canvasProducts.length === 0) && (!floorplans || floorplans.length === 0)) {
      return Response.json({ error: 'No devices or floorplans on canvas' }, { status: 400 });
    }

    // Fetch fresh product data from database to get latest manual URLs
    const productIds = [...new Set(canvasProducts.map(cp => cp.product?.id).filter(Boolean))];
    let freshProducts = {};
    
    try {
      const allProducts = await base44.entities.AVProduct.list();
      allProducts.forEach(p => {
        freshProducts[p.id] = p;
      });
    } catch (e) {
      console.log('Could not fetch fresh product data:', e.message);
    }

    // Merge fresh product data (especially manual URLs) into canvas products
    const enrichedCanvasProducts = canvasProducts.map(cp => {
      const freshProduct = freshProducts[cp.product?.id];
      if (freshProduct) {
        return {
          ...cp,
          product: {
            ...cp.product,
            installation_manual_url: freshProduct.installation_manual_url || cp.product?.installation_manual_url,
            user_manual_url: freshProduct.user_manual_url || cp.product?.user_manual_url
          }
        };
      }
      return cp;
    });

    // Use enriched data for the rest of the export
    const canvasProductsToUse = enrichedCanvasProducts || [];

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const { width: pageWidth, height: pageHeight, marginX: margin } = theme.page;
    const contentWidth = pageWidth - (margin * 2);

    // Local helper for rounded rectangle, uses global setFill/setDraw
    const drawRoundedRect = (x, y, w, h, r, fill = true, stroke = false) => {
      doc.roundedRect(x, y, w, h, r, r, fill ? 'F' : stroke ? 'S' : '');
    };

    // Get unique rooms
    const uniqueRooms = [...new Set(canvasProductsToUse.map(cp => cp.room).filter(Boolean))];
    if (uniqueRooms.length === 0) uniqueRooms.push('Unassigned');

    // ==========================================
    // PAGE 1: COVER PAGE (Clean 3-Section Layout)
    // ==========================================
    
    // Section 1: Logo area (top ~22%)
    setFill(doc, theme.colors.dark);
    doc.rect(0, 0, pageWidth, pageHeight * 0.22, 'F');
    
    // Logo
    if (orgSettings?.logo_url) {
      try {
        const logoResponse = await fetch(orgSettings.logo_url);
        const logoBlob = await logoResponse.blob();
        const logoArrayBuffer = await logoBlob.arrayBuffer();
        const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoArrayBuffer)));
        const logoFormat = orgSettings.logo_url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
        
        const logoWidth = 55;
        const logoHeight = 28;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(`data:image/${logoFormat.toLowerCase()};base64,${logoBase64}`, logoFormat, logoX, pageHeight * 0.07, logoWidth, logoHeight);
      } catch (e) {
        console.log('Could not load logo:', e);
      }
    }
    
    // Section 2: Project/Client info (middle ~53%)
    setFill(doc, [15, 23, 42]); // Slightly lighter dark
    doc.rect(0, pageHeight * 0.22, pageWidth, pageHeight * 0.53, 'F');
    
    // Accent line at section top
    setFill(doc, theme.colors.accent);
    doc.rect(pageWidth * 0.25, pageHeight * 0.22, pageWidth * 0.5, 2, 'F');
    
    // Project name
    setColor(doc, theme.colors.white);
    doc.setFont(undefined, 'bold');
    centerText(doc, projectName || 'AV System Design', pageHeight * 0.32, 24);
    
    // Subtitle
    setColor(doc, theme.colors.accent);
    doc.setFont(undefined, 'normal');
    centerText(doc, 'Installation Package', pageHeight * 0.38, 11);
    
    // Client & Location info
    let detailY = pageHeight * 0.46;
    
    if (clientName) {
      setColor(doc, [100, 116, 139]);
      centerText(doc, 'PREPARED FOR', detailY, 8);
      detailY += 6;
      setColor(doc, theme.colors.white);
      doc.setFont(undefined, 'bold');
      centerText(doc, clientName, detailY, 12);
      detailY += 14;
    }
    
    if (location) {
      setColor(doc, [100, 116, 139]);
      doc.setFont(undefined, 'normal');
      centerText(doc, 'LOCATION', detailY, 8);
      detailY += 6;
      setColor(doc, theme.colors.white);
      doc.setFont(undefined, 'bold');
      centerText(doc, location, detailY, 12);
      detailY += 14;
    }
    
    setColor(doc, [100, 116, 139]);
    doc.setFont(undefined, 'normal');
    centerText(doc, 'DATE', detailY, 8);
    detailY += 6;
    setColor(doc, theme.colors.white);
    doc.setFont(undefined, 'bold');
    centerText(doc, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), detailY, 12);
    
    // Section 3: Stats & Footer (bottom ~25%)
    setFill(doc, theme.colors.dark);
    doc.rect(0, pageHeight * 0.75, pageWidth, pageHeight * 0.25, 'F');
    
    // Stats
    const statsY = pageHeight * 0.82;
    const statsWidth = contentWidth / 4;
    
    [
      { label: 'Devices', value: canvasProductsToUse.length, color: theme.colors.accent },
      { label: 'Connections', value: connections.length, color: theme.colors.success },
      { label: 'Rooms', value: uniqueRooms.length, color: theme.colors.warning },
      { label: 'Cable Runs', value: connections.length, color: [139, 92, 246] }
    ].forEach((stat, i) => {
      const x = margin + (statsWidth * i) + (statsWidth / 2);
      setColor(doc, stat.color);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(18);
      doc.text(stat.value.toString(), x, statsY, { align: 'center' });
      setColor(doc, [100, 116, 139]);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.text(stat.label, x, statsY + 6, { align: 'center' });
    });
    
    // Footer
    setColor(doc, [100, 116, 139]);
    centerText(doc, `Generated by ${user.full_name || user.email}`, pageHeight - 14, 8);
    setColor(doc, [75, 85, 99]);
    centerText(doc, 'Powered by AV System Designer', pageHeight - 8, 7);

    // ==========================================
    // PAGE 2: SYSTEM OVERVIEW & LEGEND
    // ==========================================
    doc.addPage();
    let yPos = margin;

    // Page header
    setFill(doc, theme.colors.dark);
    doc.rect(0, 0, pageWidth, 35, 'F');
    setColor(doc, theme.colors.white);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(18);
    doc.text('System Overview', margin, 23);
    setColor(doc, theme.colors.muted);
    doc.setFontSize(10);
    doc.text(projectName || 'AV System Design', pageWidth - margin, 23, { align: 'right' });

    yPos = 50;

    // System summary cards
    const cardWidth = (contentWidth - 10) / 3;
    const cardHeight = 45;

    [
      { title: 'Total Devices', value: canvasProductsToUse.length, color: theme.colors.accent },
      { title: 'Connections', value: connections.length, color: theme.colors.success },
      { title: 'Rooms', value: uniqueRooms.length, color: theme.colors.warning }
    ].forEach((card, i) => {
      const cardX = margin + (i * (cardWidth + 5));
      setFill(doc, [243, 244, 246]);
      drawRoundedRect(cardX, yPos, cardWidth, cardHeight, 3);
      
      setColor(doc, card.color);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(24);
      doc.text(card.value.toString(), cardX + cardWidth / 2, yPos + 22, { align: 'center' });
      
      setColor(doc, theme.colors.muted);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(card.title, cardX + cardWidth / 2, yPos + 35, { align: 'center' });
    });

    yPos += cardHeight + 15;

    // Connection Types Legend
    setColor(doc, theme.colors.dark);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text('Cable Type Legend', margin, yPos);
    yPos += 10;

    const connectionTypes = [...new Set(connections.map(c => c.type))];
    const legendCols = 3;
    const legendColWidth = contentWidth / legendCols;

    connectionTypes.forEach((type, i) => {
      const col = i % legendCols;
      const row = Math.floor(i / legendCols);
      const x = margin + (col * legendColWidth);
      const y = yPos + (row * 12);

      const color = getCableColor(type);
      setFill(doc, color);
      drawRoundedRect(x, y - 4, 12, 6, 1);
      
      setColor(doc, theme.colors.dark);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(type, x + 15, y);
    });

    yPos += Math.ceil(connectionTypes.length / legendCols) * 12 + 15;

    // Device Categories
    setColor(doc, theme.colors.dark);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text('Device Categories', margin, yPos);
    yPos += 10;

    const categories = [...new Set(canvasProductsToUse.map(cp => cp.product.category))];
    categories.forEach((cat, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + (col * (contentWidth / 2));
      const y = yPos + (row * 10);

      const count = canvasProductsToUse.filter(cp => cp.product.category === cat).length;
      setColor(doc, theme.colors.dark);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(`- ${cat.replace(/_/g, ' ')} (${count})`, x, y);
    });

    // ==========================================
    // PAGE 3+: DEVICE CARDS (Premium Layout)
    // ==========================================
    doc.addPage();
    yPos = margin;

    // Minimal header
    setColor(doc, theme.colors.dark);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(20);
    doc.text('Device Documentation', margin, yPos + 8);
    
    setColor(doc, theme.colors.muted);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`${projectName || 'AV System'} | ${canvasProductsToUse.length} Devices`, margin, yPos + 16);
    
    // Subtle divider
    setDraw(doc, [229, 231, 235]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos + 22, pageWidth - margin, yPos + 22);

    yPos = 48;

    const deviceCardWidth = (contentWidth - 10) / 2;
    const deviceCardHeight = 72;

    canvasProductsToUse.forEach((cp, index) => {
      const col = index % 2;
      const cardX = margin + (col * (deviceCardWidth + 10));

      if (col === 0 && yPos + deviceCardHeight > pageHeight - margin - 10) {
        doc.addPage();
        yPos = margin;
        
        // Minimal header on continuation pages
        setColor(doc, theme.colors.dark);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(16);
        doc.text('Device Documentation', margin, yPos + 8);
        setDraw(doc, [229, 231, 235]);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos + 14, pageWidth - margin, yPos + 14);
        yPos = 32;
      }

      const product = cp.product;
      const deviceConnections = connections.filter(c => c.from === cp.instanceId || c.to === cp.instanceId);
      const catColor = getCategoryColor(product.category);

      // Card background with subtle shadow effect
      setFill(doc, [248, 250, 252]); // Very light gray
      drawRoundedRect(cardX, yPos, deviceCardWidth, deviceCardHeight, 4);
      
      // Top accent bar (thin, color-coded)
      setFill(doc, catColor);
      doc.roundedRect(cardX, yPos, deviceCardWidth, 3, 4, 4, 'F');
      doc.rect(cardX, yPos + 2, deviceCardWidth, 2, 'F'); // Square bottom of accent

      // Category icon
      drawCategoryIcon(doc, cardX + 14, yPos + 18, product.category, 16);

      // Device name (bold, prominent)
      setColor(doc, theme.colors.dark);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      const displayName = cp.label || product.brand;
      doc.text(truncate(displayName, 14), cardX + 26, yPos + 16);

      // Category pill badge
      const catText = product.category.replace(/_/g, ' ');
      doc.setFontSize(7);
      const catWidth = doc.getTextWidth(catText) + 8;
      setFill(doc, [catColor[0], catColor[1], catColor[2]]);
      doc.setGState(new doc.GState({ opacity: 0.15 }));
      drawRoundedRect(cardX + 26, yPos + 20, catWidth, 9, 2);
      doc.setGState(new doc.GState({ opacity: 1 }));
      setColor(doc, catColor);
      doc.setFont(undefined, 'normal');
      doc.text(catText, cardX + 30, yPos + 26);

      // Device info section
      const infoStartY = yPos + 36;
      setColor(doc, theme.colors.muted);
      doc.setFontSize(8);

      // Model
      setColor(doc, [100, 116, 139]);
      doc.text('Model', cardX + 8, infoStartY);
      setColor(doc, theme.colors.dark);
      doc.setFont(undefined, 'medium');
      doc.text(truncate(product.model, 16), cardX + 8, infoStartY + 6);

      // Room (if assigned)
      if (cp.room) {
        setColor(doc, [100, 116, 139]);
        doc.setFont(undefined, 'normal');
        doc.text('Room', cardX + deviceCardWidth / 2, infoStartY);
        setColor(doc, theme.colors.dark);
        doc.text(truncate(cp.room, 14), cardX + deviceCardWidth / 2, infoStartY + 6);
      }

      // Network info (if available)
      if (cp.networkInfo && cp.networkInfo.ip && cp.networkInfo.ip !== '000.000.000.000') {
        setColor(doc, [100, 116, 139]);
        doc.setFont(undefined, 'normal');
        doc.text('IP Address', cardX + 8, infoStartY + 14);
        setColor(doc, theme.colors.dark);
        doc.text(cp.networkInfo.ip, cardX + 8, infoStartY + 20);
      }

      // Ports info (compact)
      const portsInUse = deviceConnections.map(c => {
        if (c.from === cp.instanceId) return c.fromPort;
        return c.toPort;
      }).filter(Boolean);

      if (portsInUse.length > 0) {
        setColor(doc, [100, 116, 139]);
        doc.setFont(undefined, 'normal');
        doc.text('Connectivity', cardX + deviceCardWidth / 2, infoStartY + 14);
        setColor(doc, theme.colors.dark);
        const portsText = portsInUse.slice(0, 3).join(', ') + (portsInUse.length > 3 ? '...' : '');
        doc.text(truncate(portsText, 14), cardX + deviceCardWidth / 2, infoStartY + 20);
      }

      // Connection count (subtle pill in corner)
      if (deviceConnections.length > 0) {
        setFill(doc, [229, 231, 235]);
        drawRoundedRect(cardX + deviceCardWidth - 22, yPos + 10, 16, 12, 3);
        setColor(doc, theme.colors.muted);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);
        doc.text(`${deviceConnections.length}`, cardX + deviceCardWidth - 14, yPos + 18, { align: 'center' });
      }

      if (col === 1) {
        yPos += deviceCardHeight + 8;
      }
    });
    
    // Handle odd number of devices
    if (canvasProductsToUse.length % 2 === 1) {
      yPos += deviceCardHeight + 8;
    }

    // ==========================================
    // CABLE SCHEDULE PAGE
    // ==========================================
    doc.addPage();
    yPos = margin;

    // Page header
    setFill(doc, theme.colors.dark);
    doc.rect(0, 0, pageWidth, 35, 'F');
    setColor(doc, theme.colors.white);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(18);
    doc.text('Cable Schedule', margin, 23);
    setColor(doc, theme.colors.muted);
    doc.setFontSize(10);
    doc.text(`${connections.length} Connections`, pageWidth - margin, 23, { align: 'right' });

    yPos = 50;

    // Table header
    const colWidths = [22, 38, 28, 38, 28, 26];
    const headers = ['Cable ID', 'From Device', 'From Port', 'To Device', 'To Port', 'Type'];

    setFill(doc, [31, 41, 55]);
    doc.rect(margin, yPos - 5, contentWidth, 12, 'F');

    setColor(doc, theme.colors.white);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    let xPos = margin + 3;
    headers.forEach((header, i) => {
      doc.text(header, xPos, yPos + 2);
      xPos += colWidths[i];
    });

    yPos += 12;

    // Table rows with zebra striping
    connections.forEach((conn, i) => {
      if (!conn) return;
      if (yPos > pageHeight - 25) {
        doc.addPage();
        yPos = margin;

        // Page header
        setFill(doc, theme.colors.dark);
        doc.rect(0, 0, pageWidth, 35, 'F');
        setColor(doc, theme.colors.white);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(18);
        doc.text('Cable Schedule (continued)', margin, 23);
        yPos = 50;

        // Redraw table header
        setFill(doc, [31, 41, 55]);
        doc.rect(margin, yPos - 5, contentWidth, 12, 'F');
        setColor(doc, theme.colors.white);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);
        xPos = margin + 3;
        headers.forEach((header, j) => {
          doc.text(header, xPos, yPos + 2);
          xPos += colWidths[j];
        });
        yPos += 12;
      }

      const fromDevice = canvasProductsToUse.find(cp => cp.instanceId === conn.from);
      const toDevice = canvasProductsToUse.find(cp => cp.instanceId === conn.to);

      if (!fromDevice || !toDevice) return;

      // Zebra striping
      if (i % 2 === 0) {
        setFill(doc, [249, 250, 251]);
        doc.rect(margin, yPos - 4, contentWidth, 10, 'F');
      }

      xPos = margin + 3;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);

      // Cable ID with color badge
      const cableColor = getCableColor(conn.type);
      setFill(doc, cableColor);
      drawRoundedRect(xPos, yPos - 3, 18, 7, 1);
      setColor(doc, theme.colors.white);
      doc.setFont(undefined, 'bold');
      doc.text(conn.wireId || `C${i + 1}`, xPos + 2, yPos + 1);
      xPos += colWidths[0];

      // Rest of row data
      setColor(doc, theme.colors.dark);
      doc.setFont(undefined, 'normal');

      const truncate = (str, maxLen) => str && str.length > maxLen ? str.substring(0, maxLen - 2) + '..' : (str || 'N/A');

      doc.text(truncate(fromDevice.label || fromDevice.product.brand, 18), xPos, yPos + 1);
      xPos += colWidths[1];

      doc.text(truncate(conn.fromPort, 14), xPos, yPos + 1);
      xPos += colWidths[2];

      doc.text(truncate(toDevice.label || toDevice.product.brand, 18), xPos, yPos + 1);
      xPos += colWidths[3];

      doc.text(truncate(conn.toPort, 14), xPos, yPos + 1);
      xPos += colWidths[4];

      setColor(doc, cableColor);
      doc.text(truncate(conn.type, 12), xPos, yPos + 1);

      yPos += 10;
    });

    // ==========================================
    // FLOORPLAN PAGES (if floorplans exist)
    // ==========================================
    if (floorplans && floorplans.length > 0) {
      for (const fp of floorplans.filter(f => f.visible)) {
        doc.addPage();
        yPos = margin;

        // Page header
        setFill(doc, theme.colors.dark);
        doc.rect(0, 0, pageWidth, 35, 'F');
        setColor(doc, theme.colors.white);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(18);
        doc.text(`Floorplan: ${fp.name}`, margin, 23);
        setColor(doc, theme.colors.muted);
        doc.setFontSize(10);
        doc.text(projectName || 'AV System', pageWidth - margin, 23, { align: 'right' });

        yPos = 45;

        // Load and add floorplan image
        try {
          const imgResponse = await fetch(fp.url);
          if (imgResponse.ok) {
            const imgBlob = await imgResponse.blob();
            const imgArrayBuffer = await imgBlob.arrayBuffer();
            const imgBase64 = btoa(String.fromCharCode(...new Uint8Array(imgArrayBuffer)));
            const imgFormat = fp.url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';

            // Calculate dimensions to fit page (maintain aspect ratio)
            const maxWidth = contentWidth;
            const maxHeight = pageHeight - yPos - 20;
            const aspectRatio = fp.imageWidth / fp.imageHeight;
            
            let imgWidth = maxWidth;
            let imgHeight = imgWidth / aspectRatio;
            
            if (imgHeight > maxHeight) {
              imgHeight = maxHeight;
              imgWidth = imgHeight * aspectRatio;
            }

            const imgX = margin + (contentWidth - imgWidth) / 2;
            
            doc.addImage(`data:image/${imgFormat.toLowerCase()};base64,${imgBase64}`, imgFormat, imgX, yPos, imgWidth, imgHeight);

            // Draw devices and connections on floorplan
            const fpPos = fp.position || { x: 0, y: 0 };
            const fpScale = fp.scale || 1;
            const pixelsPerInch = fp.pixelsPerInch || 1;
            
            // Canvas-to-image scale conversion
            const canvasToImageScale = pixelsPerInch / fpScale;
            
            // Device card center offset (devices are positioned by top-left corner, we need center)
            const DEVICE_CARD_WIDTH = 320;
            const DEVICE_CARD_HEIGHT = 280;

            canvasProductsToUse.forEach(cp => {
              // Device position in canvas is top-left, calculate center
              const deviceCenterX = cp.position.x + DEVICE_CARD_WIDTH / 2;
              const deviceCenterY = cp.position.y + DEVICE_CARD_HEIGHT / 2;
              
              // Convert device center to image pixels
              const imgPixelX = (deviceCenterX - fpPos.x) * canvasToImageScale;
              const imgPixelY = (deviceCenterY - fpPos.y) * canvasToImageScale;

              // Skip if device is outside floorplan bounds
              if (imgPixelX < 0 || imgPixelY < 0 || imgPixelX > fp.imageWidth || imgPixelY > fp.imageHeight) return;

              // Convert to PDF coordinates (proportional to rendered image size)
              const pdfX = imgX + (imgPixelX / fp.imageWidth) * imgWidth;
              const pdfY = yPos + (imgPixelY / fp.imageHeight) * imgHeight;

              // Draw device indicator
              const catColor = getCategoryColor(cp.product.category);
              setFill(doc, catColor);
              doc.circle(pdfX, pdfY, 3, 'F');
              
              // Device label with white background
              setFill(doc, theme.colors.white);
              setDraw(doc, catColor);
              doc.setLineWidth(0.3);
              doc.roundedRect(pdfX - 15, pdfY - 10, 30, 8, 2, 2, 'FD');
              setColor(doc, catColor);
              doc.setFont(undefined, 'bold');
              doc.setFontSize(6);
              doc.text(truncate(cp.label || cp.product.brand, 12), pdfX, pdfY - 5, { align: 'center' });
            });

            // Draw connection lines on floorplan
            connections.forEach(conn => {
              const fromDevice = canvasProductsToUse.find(cp => cp.instanceId === conn.from);
              const toDevice = canvasProductsToUse.find(cp => cp.instanceId === conn.to);
              if (!fromDevice || !toDevice) return;

              // Calculate device centers
              const fromCenterX = fromDevice.position.x + DEVICE_CARD_WIDTH / 2;
              const fromCenterY = fromDevice.position.y + DEVICE_CARD_HEIGHT / 2;
              const toCenterX = toDevice.position.x + DEVICE_CARD_WIDTH / 2;
              const toCenterY = toDevice.position.y + DEVICE_CARD_HEIGHT / 2;
              
              // Convert to image pixels
              const fromImgX = (fromCenterX - fpPos.x) * canvasToImageScale;
              const fromImgY = (fromCenterY - fpPos.y) * canvasToImageScale;
              const toImgX = (toCenterX - fpPos.x) * canvasToImageScale;
              const toImgY = (toCenterY - fpPos.y) * canvasToImageScale;

              // Skip if either device is outside floorplan
              if (fromImgX < 0 || fromImgY < 0 || fromImgX > fp.imageWidth || fromImgY > fp.imageHeight) return;
              if (toImgX < 0 || toImgY < 0 || toImgX > fp.imageWidth || toImgY > fp.imageHeight) return;

              // Convert to PDF coordinates
              const fromPdfX = imgX + (fromImgX / fp.imageWidth) * imgWidth;
              const fromPdfY = yPos + (fromImgY / fp.imageHeight) * imgHeight;
              const toPdfX = imgX + (toImgX / fp.imageWidth) * imgWidth;
              const toPdfY = yPos + (toImgY / fp.imageHeight) * imgHeight;

              // Draw connection line
              const cableColor = getCableColor(conn.type);
              setDraw(doc, cableColor);
              doc.setLineWidth(1);
              doc.line(fromPdfX, fromPdfY, toPdfX, toPdfY);
            });

          } catch (error) {
            console.error('Failed to add floorplan image:', error);
            setColor(doc, theme.colors.muted);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.text(`Could not load floorplan: ${fp.name}`, margin, yPos + 20);
          }
        } catch (error) {
          console.error('Failed to process floorplan:', error);
        }
      }
    }

    // ==========================================
    // ROOM-BY-ROOM PAGES
    // ==========================================
    uniqueRooms.forEach(room => {
      const roomDevices = canvasProductsToUse.filter(cp => cp.room === room || (!cp.room && room === 'Unassigned'));
      if (roomDevices.length === 0) return;

      doc.addPage();
      yPos = margin;

      // Page header with room accent
      setFill(doc, theme.colors.accent);
      doc.rect(0, 0, pageWidth, 40, 'F');
      setColor(doc, theme.colors.white);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(22);
      doc.text(room, margin, 27);
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(`${roomDevices.length} Devices`, pageWidth - margin, 27, { align: 'right' });

      yPos = 55;

      // Device list for this room
      for (let i = 0; i < roomDevices.length; i++) {
        const cp = roomDevices[i];
        const cardHeight = 55; // Increased card height for description
        
        if (yPos > pageHeight - cardHeight - 15) {
          doc.addPage();
          yPos = margin;
          setFill(doc, theme.colors.accent);
          doc.rect(0, 0, pageWidth, 35, 'F');
          setColor(doc, theme.colors.white);
          doc.setFont(undefined, 'bold');
          doc.setFontSize(18);
          doc.text(`${room} (continued)`, margin, 23);
          yPos = 50;
        }

        const product = cp.product;
        const deviceConnections = connections.filter(c => c.from === cp.instanceId || c.to === cp.instanceId);

        // Device card
        setFill(doc, theme.colors.cardBg);
        drawRoundedRect(margin, yPos, contentWidth, cardHeight, 3);

        // Try to load product image
        let imageLoaded = false;
        const imageSize = 28;
        const imageX = margin + 6;
        const imageY = yPos + 6;
        
        if (product.image_url && /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(product.image_url)) {
          try {
            const imgResponse = await fetch(product.image_url);
            if (imgResponse.ok) {
              const imgBlob = await imgResponse.blob();
              const imgArrayBuffer = await imgBlob.arrayBuffer();
              const imgBase64 = btoa(String.fromCharCode(...new Uint8Array(imgArrayBuffer)));
              const imgFormat = product.image_url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
              
              // Draw image with border
              setFill(doc, theme.colors.white);
              drawRoundedRect(imageX, imageY, imageSize, imageSize, 2);
              doc.addImage(`data:image/${imgFormat.toLowerCase()};base64,${imgBase64}`, imgFormat, imageX + 1, imageY + 1, imageSize - 2, imageSize - 2);
              imageLoaded = true;
            }
          } catch (e) {
            console.log('Could not load product image:', e);
          }
        }
        
        // Fallback to category icon if no image
        if (!imageLoaded) {
          drawCategoryIcon(doc, imageX + imageSize / 2, imageY + imageSize / 2, product.category, 20);
        }

        const textStartX = margin + imageSize + 14;

        // Device label
        setColor(doc, theme.colors.dark);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text(cp.label || product.brand, textStartX, yPos + 12);

        // Brand and Model
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        setColor(doc, theme.colors.muted);
        doc.text(`${product.brand} ${product.model}`, textStartX, yPos + 20);

        // Description (truncated to fit)
        if (product.description) {
          doc.setFontSize(8);
          setColor(doc, [100, 116, 139]);
          const maxDescLength = 60;
          const truncatedDesc = product.description.length > maxDescLength 
            ? product.description.substring(0, maxDescLength - 3) + '...' 
            : product.description;
          doc.text(truncatedDesc, textStartX, yPos + 28);
        }

        // Connection summary
        if (deviceConnections.length > 0) {
          const inputConns = deviceConnections.filter(c => c.to === cp.instanceId);
          const outputConns = deviceConnections.filter(c => c.from === cp.instanceId);
          doc.setFontSize(8);
          setColor(doc, theme.colors.muted);
          doc.text(`Inputs: ${inputConns.length} | Outputs: ${outputConns.length}`, textStartX, yPos + 38);
        }

        // Network info on right
        if (cp.networkInfo && cp.networkInfo.ip && cp.networkInfo.ip !== '000.000.000.000') {
          doc.setFontSize(8);
          setColor(doc, theme.colors.muted);
          doc.text(`IP: ${cp.networkInfo.ip}`, pageWidth - margin - 5, yPos + 15, { align: 'right' });
          if (cp.networkInfo.mac && cp.networkInfo.mac !== '00:00:00:00:00:00') {
            doc.text(`MAC: ${cp.networkInfo.mac}`, pageWidth - margin - 5, yPos + 22, { align: 'right' });
          }
        }

        // Category badge on right
        const catColor = getCategoryColor(product.category);
        const catText = product.category.replace(/_/g, ' ');
        doc.setFontSize(7);
        const catWidth = doc.getTextWidth(catText) + 6;
        setFill(doc, [catColor[0], catColor[1], catColor[2]]);
        doc.setGState(new doc.GState({ opacity: 0.15 }));
        drawRoundedRect(pageWidth - margin - catWidth - 3, yPos + 38, catWidth, 8, 2);
        doc.setGState(new doc.GState({ opacity: 1 }));
        setColor(doc, catColor);
        doc.text(catText, pageWidth - margin - catWidth, yPos + 44);

        yPos += cardHeight + 5;
      }

      // Room notes section
      yPos += 10;
      if (yPos < pageHeight - 60) {
        setFill(doc, [254, 249, 195]);
        drawRoundedRect(margin, yPos, contentWidth, 35, 3);
        
        setColor(doc, [161, 98, 7]);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text('Installation Notes', margin + 8, yPos + 12);
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text('- Verify all cable runs before closing walls', margin + 8, yPos + 22);
        doc.text('- Label all cables at both ends with wire IDs', margin + 8, yPos + 28);
      }
    });

    // ==========================================
    // INSTALLER NOTES PAGE
    // ==========================================
    doc.addPage();
    yPos = margin;

    setFill(doc, theme.colors.dark);
    doc.rect(0, 0, pageWidth, 35, 'F');
    setColor(doc, theme.colors.white);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(18);
    doc.text('Installation Guidelines', margin, 23);

    yPos = 50;

    const guidelines = [
      { icon: '!', title: 'HDMI Tips', points: ['Use certified cables for 4K/8K', 'Max 15ft passive, use active beyond', 'Test before closing walls'] },
      { icon: '+', title: 'Power Sequence', points: ['Power on: Source > Processing > Display', 'Power off: Display > Processing > Source', 'Use sequenced power when available'] },
      { icon: '*', title: 'Network Setup', points: ['Assign static IPs to all AV devices', 'Document all IP addresses', 'Configure VLANs if required'] },
      { icon: '#', title: 'Audio Leveling', points: ['Run room correction after install', 'Set reference level to 0dB', 'Document EQ settings'] }
    ];

    guidelines.forEach(guide => {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = margin + 20;
      }

      setFill(doc, theme.colors.cardBg);
      drawRoundedRect(margin, yPos, contentWidth, 45, 3);

      setColor(doc, theme.colors.dark);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text(guide.title, margin + 10, yPos + 12);

      doc.setFont(undefined, 'normal');
      setColor(doc, theme.colors.muted);
      doc.setFontSize(9);
      guide.points.forEach((point, i) => {
        doc.text(`- ${point}`, margin + 10, yPos + 22 + (i * 7));
      });

      yPos += 50;
    });

    // ==========================================
    // DEVICE MANUALS PAGE
    // ==========================================
    // Collect ALL unique products for manuals page (using enriched data with fresh manual URLs)
    const uniqueProducts = [];
    const seenProductIds2 = new Set();
    
    canvasProductsToUse.forEach(cp => {
      if (cp.product?.id && !seenProductIds2.has(cp.product.id)) {
        seenProductIds2.add(cp.product.id);
        uniqueProducts.push(cp.product);
      }
    });

    if (uniqueProducts.length > 0) {
      doc.addPage();
      yPos = margin;

      // Page header
      setFill(doc, theme.colors.dark);
      doc.rect(0, 0, pageWidth, 35, 'F');
      setColor(doc, theme.colors.white);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(18);
      doc.text('Device Manuals', margin, 23);
      setColor(doc, theme.colors.muted);
      doc.setFontSize(10);
      doc.text(`${uniqueProducts.length} Products`, pageWidth - margin, 23, { align: 'right' });

      yPos = 50;

      // Instructions
      setColor(doc, theme.colors.muted);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text('Click on the manual links below to download documentation for each device.', margin, yPos);
      yPos += 12;

      // Manual cards
      uniqueProducts.forEach((product, index) => {
        if (yPos > pageHeight - 45) {
          doc.addPage();
          yPos = margin;

          // Page header on continuation
          setFill(doc, theme.colors.dark);
          doc.rect(0, 0, pageWidth, 35, 'F');
          setColor(doc, theme.colors.white);
          doc.setFont(undefined, 'bold');
          doc.setFontSize(18);
          doc.text('Device Manuals (continued)', margin, 23);
          yPos = 50;
        }

        const cardHeight = 38;
        const catColor = getCategoryColor(product.category);

        // Card background
        setFill(doc, theme.colors.cardBg);
        doc.roundedRect(margin, yPos, contentWidth, cardHeight, 3, 3, 'F');

        // Left accent bar
        setFill(doc, catColor);
        doc.roundedRect(margin, yPos, 4, cardHeight, 3, 3, 'F');
        doc.rect(margin + 2, yPos, 2, cardHeight, 'F');

        // Device info
        setColor(doc, theme.colors.dark);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.text(`${product.brand} ${product.model}`, margin + 10, yPos + 12);

        // Category
        setColor(doc, theme.colors.muted);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text(product.category.replace(/_/g, ' '), margin + 10, yPos + 20);

        // Manual links
        let linkX = margin + 10;
        const linkY = yPos + 30;

        if (product.installation_manual_url) {
          // Installation Manual link - clickable button
          setFill(doc, [249, 115, 22]); // Orange
          const installText = 'Installation Manual';
          doc.setFontSize(8);
          const installWidth = doc.getTextWidth(installText) + 12;
          doc.roundedRect(linkX, linkY - 5, installWidth, 10, 2, 2, 'F');
          
          setColor(doc, theme.colors.white);
          doc.setFont(undefined, 'bold');
          doc.textWithLink(installText, linkX + 6, linkY + 1, { url: product.installation_manual_url });
          
          linkX += installWidth + 8;
        } else {
          // Show "Not available" for missing installation manual
          setColor(doc, theme.colors.muted);
          doc.setFont(undefined, 'normal');
          doc.setFontSize(8);
          doc.text('Install: N/A', linkX, linkY + 1);
          linkX += 35;
        }

        if (product.user_manual_url) {
          // User Manual link - clickable button
          setFill(doc, [34, 197, 94]); // Green
          const userText = 'User Manual';
          doc.setFontSize(8);
          const userWidth = doc.getTextWidth(userText) + 12;
          doc.roundedRect(linkX, linkY - 5, userWidth, 10, 2, 2, 'F');
          
          setColor(doc, theme.colors.white);
          doc.setFont(undefined, 'bold');
          doc.textWithLink(userText, linkX + 6, linkY + 1, { url: product.user_manual_url });
        } else {
          // Show "Not available" for missing user manual
          setColor(doc, theme.colors.muted);
          doc.setFont(undefined, 'normal');
          doc.setFontSize(8);
          doc.text('User: N/A', linkX, linkY + 1);
        }

        yPos += cardHeight + 6;
      });
    }

    // ==========================================
    // SIGN-OFF PAGE
    // ==========================================
    doc.addPage();
    yPos = margin;

    setFill(doc, theme.colors.dark);
    doc.rect(0, 0, pageWidth, 35, 'F');
    setColor(doc, theme.colors.white);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(18);
    doc.text('Project Sign-Off', margin, 23);

    yPos = 60;

    setColor(doc, theme.colors.dark);
    doc.setFontSize(11);
    doc.text('This document certifies that the AV system installation has been completed', margin, yPos);
    doc.text('according to specifications and has been tested and verified.', margin, yPos + 7);

    yPos += 30;

    // Sign-off fields
    const fields = [
      'Installer Name',
      'Installer Signature',
      'Client Name',
      'Client Signature',
      'Completion Date'
    ];

    fields.forEach(field => {
      setColor(doc, theme.colors.muted);
      doc.setFontSize(10);
      doc.text(`${field}:`, margin, yPos);
      
      setDraw(doc, theme.colors.muted);
      doc.setLineWidth(0.3);
      doc.line(margin + 45, yPos, pageWidth - margin, yPos);
      
      yPos += 20;
    });

    // Footer
    yPos = pageHeight - 30;
    setColor(doc, theme.colors.muted);
    doc.setFontSize(8);
    centerText(doc, `${projectName || 'AV System Design'} - Installation Package`, yPos, 8);
    centerText(doc, `Generated ${new Date().toLocaleDateString()}`, yPos + 6, 8);

    // Generate PDF as base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    return Response.json({ pdf: pdfBase64 });
  } catch (error) {
    console.error('PDF Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});