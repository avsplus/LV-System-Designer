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

// Category icons (2-letter abbreviations)
const categoryIcons = {
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

const truncate = (str, maxLen) => 
  str && str.length > maxLen ? str.substring(0, maxLen - 1) + '..' : (str || '');

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
  
  // Category icon circle
  const circleRadius = 5;
  const circleCx = x + cardPaddingX + circleRadius;
  const circleCy = y + topBarHeight + cardPaddingY + circleRadius;
  
  setFill(doc, categoryColor);
  doc.circle(circleCx, circleCy, circleRadius, 'F');
  
  setColor(doc, theme.colors.white);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(theme.fonts.tiny);
  const iconText = categoryIcons[device.product.category] || 'DV';
  doc.text(iconText, circleCx, circleCy + 1.5, { align: 'center' });
  
  // Device name
  const titleX = circleCx + circleRadius + 3;
  setColor(doc, theme.colors.text);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(theme.fonts.heading);
  doc.text(truncate(device.label || device.product.brand, 14), titleX, circleCy + 1);
  
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

    const { canvasProducts, connections, projectName, rooms = [], clientName, location, orgSettings } = await req.json();

    if (!canvasProducts || canvasProducts.length === 0) {
      return Response.json({ error: 'No devices on canvas' }, { status: 400 });
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // Helper functions
    const setColor = (color) => {
      doc.setTextColor(color[0], color[1], color[2]);
    };

    const setFillColor = (color) => {
      doc.setFillColor(color[0], color[1], color[2]);
    };

    const setDrawColor = (color) => {
      doc.setDrawColor(color[0], color[1], color[2]);
    };

    const drawRoundedRect = (x, y, w, h, r, fill = true, stroke = false) => {
      doc.roundedRect(x, y, w, h, r, r, fill ? 'F' : stroke ? 'S' : '');
    };

    const centerText = (text, y, fontSize = 12) => {
      doc.setFontSize(fontSize);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    // Get unique rooms
    const uniqueRooms = [...new Set(canvasProducts.map(cp => cp.room).filter(Boolean))];
    if (uniqueRooms.length === 0) uniqueRooms.push('Unassigned');

    // ==========================================
    // PAGE 1: COVER PAGE (Premium Design)
    // ==========================================
    setFillColor(COLORS.dark);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Subtle gradient effect with rectangles
    for (let i = 0; i < 5; i++) {
      const opacity = 0.02 * (5 - i);
      setFillColor([59, 130, 246]);
      doc.setGState(new doc.GState({ opacity: opacity }));
      doc.rect(0, pageHeight * (0.3 + i * 0.02), pageWidth, pageHeight * 0.4, 'F');
    }
    doc.setGState(new doc.GState({ opacity: 1 }));

    // Thin accent line
    setFillColor(COLORS.accent);
    doc.rect(pageWidth * 0.3, pageHeight * 0.38, pageWidth * 0.4, 2, 'F');

    // Logo (if available) - centered at top
    if (orgSettings?.logo_url) {
      try {
        const logoResponse = await fetch(orgSettings.logo_url);
        const logoBlob = await logoResponse.blob();
        const logoArrayBuffer = await logoBlob.arrayBuffer();
        const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoArrayBuffer)));
        const logoFormat = orgSettings.logo_url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
        
        const logoWidth = 60;
        const logoHeight = 30;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(`data:image/${logoFormat.toLowerCase()};base64,${logoBase64}`, logoFormat, logoX, pageHeight * 0.15, logoWidth, logoHeight);
      } catch (e) {
        console.log('Could not load logo:', e);
      }
    }

    // Project name (large, elegant)
    setColor(COLORS.white);
    doc.setFont(undefined, 'bold');
    centerText(projectName || 'AV System Design', pageHeight * 0.44, 28);

    // Subtitle (subtle)
    setColor([156, 163, 175]);
    doc.setFont(undefined, 'normal');
    centerText('Installation Package', pageHeight * 0.50, 12);

    // Details section with better spacing
    let detailY = pageHeight * 0.58;
    
    if (clientName) {
      setColor([100, 116, 139]);
      doc.setFontSize(9);
      centerText('PREPARED FOR', detailY, 9);
      detailY += 8;
      setColor(COLORS.white);
      doc.setFont(undefined, 'bold');
      centerText(clientName, detailY, 14);
      detailY += 18;
    }

    if (location) {
      setColor([100, 116, 139]);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      centerText('LOCATION', detailY, 9);
      detailY += 8;
      setColor(COLORS.white);
      doc.setFont(undefined, 'bold');
      centerText(location, detailY, 14);
      detailY += 18;
    }

    setColor([100, 116, 139]);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    centerText('DATE', detailY, 9);
    detailY += 8;
    setColor(COLORS.white);
    doc.setFont(undefined, 'bold');
    centerText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), detailY, 14);

    // Stats bar - cleaner design
    const statsY = pageHeight * 0.82;
    const statsWidth = contentWidth / 4;

    [
      { label: 'Devices', value: canvasProducts.length, color: [59, 130, 246] },
      { label: 'Connections', value: connections.length, color: [34, 197, 94] },
      { label: 'Rooms', value: uniqueRooms.length, color: [251, 191, 36] },
      { label: 'Cable Runs', value: connections.length, color: [139, 92, 246] }
    ].forEach((stat, i) => {
      const x = margin + (statsWidth * i) + (statsWidth / 2);
      
      // Value
      setColor(stat.color);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(20);
      doc.text(stat.value.toString(), x, statsY, { align: 'center' });
      
      // Label
      setColor([100, 116, 139]);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(stat.label, x, statsY + 8, { align: 'center' });
    });

    // Footer
    setColor([75, 85, 99]);
    doc.setFontSize(8);
    centerText(`Generated by ${user.full_name || user.email}`, pageHeight - 18, 8);
    setColor([55, 65, 81]);
    centerText('Powered by AV System Designer', pageHeight - 12, 7);

    // ==========================================
    // PAGE 2: SYSTEM OVERVIEW & LEGEND
    // ==========================================
    doc.addPage();
    let yPos = margin;

    // Page header
    setFillColor(COLORS.dark);
    doc.rect(0, 0, pageWidth, 35, 'F');
    setColor(COLORS.white);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(18);
    doc.text('System Overview', margin, 23);
    setColor(COLORS.secondary);
    doc.setFontSize(10);
    doc.text(projectName || 'AV System Design', pageWidth - margin, 23, { align: 'right' });

    yPos = 50;

    // System summary cards
    const cardWidth = (contentWidth - 10) / 3;
    const cardHeight = 45;

    [
      { title: 'Total Devices', value: canvasProducts.length, color: COLORS.accent },
      { title: 'Connections', value: connections.length, color: COLORS.success },
      { title: 'Rooms', value: uniqueRooms.length, color: COLORS.warning }
    ].forEach((card, i) => {
      const cardX = margin + (i * (cardWidth + 5));
      setFillColor([243, 244, 246]);
      drawRoundedRect(cardX, yPos, cardWidth, cardHeight, 3);
      
      setColor(card.color);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(24);
      doc.text(card.value.toString(), cardX + cardWidth / 2, yPos + 22, { align: 'center' });
      
      setColor(COLORS.secondary);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(card.title, cardX + cardWidth / 2, yPos + 35, { align: 'center' });
    });

    yPos += cardHeight + 15;

    // Connection Types Legend
    setColor(COLORS.dark);
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

      const color = CONNECTION_COLORS[type] || COLORS.secondary;
      setFillColor(color);
      drawRoundedRect(x, y - 4, 12, 6, 1);
      
      setColor(COLORS.dark);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(type, x + 15, y);
    });

    yPos += Math.ceil(connectionTypes.length / legendCols) * 12 + 15;

    // Device Categories
    setColor(COLORS.dark);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text('Device Categories', margin, yPos);
    yPos += 10;

    const categories = [...new Set(canvasProducts.map(cp => cp.product.category))];
    categories.forEach((cat, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + (col * (contentWidth / 2));
      const y = yPos + (row * 10);

      const count = canvasProducts.filter(cp => cp.product.category === cat).length;
      setColor(COLORS.dark);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(`- ${cat.replace(/_/g, ' ')} (${count})`, x, y);
    });

    // ==========================================
    // PAGE 3+: DEVICE CARDS (Premium Layout)
    // ==========================================
    doc.addPage();
    yPos = margin;

    // Category colors for visual coding
    const categoryColors = {
      televisions: [59, 130, 246],       // Blue
      projectors: [139, 92, 246],        // Purple
      projector_screens: [217, 70, 239], // Fuchsia
      video_distribution: [6, 182, 212], // Cyan
      matrix_switchers: [20, 184, 166],  // Teal
      audio_streamers: [236, 72, 153],   // Pink
      media_streamers: [244, 63, 94],    // Rose
      speakers: [34, 197, 94],           // Green
      soundbars: [132, 204, 22],         // Lime
      subwoofers: [239, 68, 68],         // Red
      stereo_amps: [249, 115, 22],       // Orange
      multizone_amps: [245, 158, 11],    // Amber
      surround_processors: [234, 179, 8],// Yellow
      av_receivers: [16, 185, 129],      // Emerald
      network_switches: [100, 116, 139], // Slate
      control_processors: [139, 92, 246] // Violet
    };

    // Category icons (2-letter abbreviations)
    const categoryIcons = {
      televisions: 'TV',
      projectors: 'PJ',
      projector_screens: 'SC',
      video_distribution: 'VD',
      matrix_switchers: 'MX',
      audio_streamers: 'AS',
      media_streamers: 'MS',
      speakers: 'SP',
      soundbars: 'SB',
      subwoofers: 'SW',
      stereo_amps: 'SA',
      multizone_amps: 'MA',
      surround_processors: 'SR',
      av_receivers: 'AV',
      network_switches: 'NS',
      control_processors: 'CP'
    };

    // Minimal header
    setColor(COLORS.dark);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(20);
    doc.text('Device Documentation', margin, yPos + 8);
    
    setColor(COLORS.secondary);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`${projectName || 'AV System'} | ${canvasProducts.length} Devices`, margin, yPos + 16);
    
    // Subtle divider
    setDrawColor([229, 231, 235]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos + 22, pageWidth - margin, yPos + 22);

    yPos = 48;

    const deviceCardWidth = (contentWidth - 10) / 2;
    const deviceCardHeight = 72;

    canvasProducts.forEach((cp, index) => {
      const col = index % 2;
      const cardX = margin + (col * (deviceCardWidth + 10));

      if (col === 0 && yPos + deviceCardHeight > pageHeight - margin - 10) {
        doc.addPage();
        yPos = margin;
        
        // Minimal header on continuation pages
        setColor(COLORS.dark);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(16);
        doc.text('Device Documentation', margin, yPos + 8);
        setDrawColor([229, 231, 235]);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos + 14, pageWidth - margin, yPos + 14);
        yPos = 32;
      }

      const product = cp.product;
      const deviceConnections = connections.filter(c => c.from === cp.instanceId || c.to === cp.instanceId);
      const catColor = categoryColors[product.category] || COLORS.accent;

      // Card background with subtle shadow effect
      setFillColor([248, 250, 252]); // Very light gray
      drawRoundedRect(cardX, yPos, deviceCardWidth, deviceCardHeight, 4);
      
      // Top accent bar (thin, color-coded)
      setFillColor(catColor);
      doc.roundedRect(cardX, yPos, deviceCardWidth, 3, 4, 4, 'F');
      doc.rect(cardX, yPos + 2, deviceCardWidth, 2, 'F'); // Square bottom of accent

      // Category icon circle
      setFillColor(catColor);
      doc.circle(cardX + 14, yPos + 18, 8, 'F');
      setColor(COLORS.white);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(7);
      const iconText = categoryIcons[product.category] || 'DV';
      doc.text(iconText, cardX + 14, yPos + 20, { align: 'center' });

      // Device name (bold, prominent)
      setColor(COLORS.dark);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      const displayName = cp.label || product.brand;
      doc.text(displayName, cardX + 26, yPos + 16);

      // Category pill badge
      const catText = product.category.replace(/_/g, ' ');
      doc.setFontSize(7);
      const catWidth = doc.getTextWidth(catText) + 8;
      setFillColor([catColor[0], catColor[1], catColor[2]]);
      doc.setGState(new doc.GState({ opacity: 0.15 }));
      drawRoundedRect(cardX + 26, yPos + 20, catWidth, 9, 2);
      doc.setGState(new doc.GState({ opacity: 1 }));
      setColor(catColor);
      doc.setFont(undefined, 'normal');
      doc.text(catText, cardX + 30, yPos + 26);

      // Device info section
      const infoStartY = yPos + 36;
      setColor(COLORS.secondary);
      doc.setFontSize(8);

      // Model
      setColor([100, 116, 139]);
      doc.text('Model', cardX + 8, infoStartY);
      setColor(COLORS.dark);
      doc.setFont(undefined, 'medium');
      doc.text(product.model, cardX + 8, infoStartY + 6);

      // Room (if assigned)
      if (cp.room) {
        setColor([100, 116, 139]);
        doc.setFont(undefined, 'normal');
        doc.text('Room', cardX + deviceCardWidth / 2, infoStartY);
        setColor(COLORS.dark);
        doc.text(cp.room, cardX + deviceCardWidth / 2, infoStartY + 6);
      }

      // Network info (if available)
      if (cp.networkInfo && cp.networkInfo.ip && cp.networkInfo.ip !== '000.000.000.000') {
        setColor([100, 116, 139]);
        doc.setFont(undefined, 'normal');
        doc.text('IP Address', cardX + 8, infoStartY + 14);
        setColor(COLORS.dark);
        doc.text(cp.networkInfo.ip, cardX + 8, infoStartY + 20);
      }

      // Ports info (compact)
      const portsInUse = deviceConnections.map(c => {
        if (c.from === cp.instanceId) return c.fromPort;
        return c.toPort;
      }).filter(Boolean);

      if (portsInUse.length > 0) {
        setColor([100, 116, 139]);
        doc.setFont(undefined, 'normal');
        doc.text('Connectivity', cardX + deviceCardWidth / 2, infoStartY + 14);
        setColor(COLORS.dark);
        const portsText = portsInUse.slice(0, 3).join(', ') + (portsInUse.length > 3 ? '...' : '');
        doc.text(portsText, cardX + deviceCardWidth / 2, infoStartY + 20);
      }

      // Connection count (subtle pill in corner)
      if (deviceConnections.length > 0) {
        setFillColor([229, 231, 235]);
        drawRoundedRect(cardX + deviceCardWidth - 22, yPos + 10, 16, 12, 3);
        setColor(COLORS.secondary);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);
        doc.text(`${deviceConnections.length}`, cardX + deviceCardWidth - 14, yPos + 18, { align: 'center' });
      }

      if (col === 1) {
        yPos += deviceCardHeight + 8;
      }
    });
    
    // Handle odd number of devices
    if (canvasProducts.length % 2 === 1) {
      yPos += deviceCardHeight + 8;
    }

    // ==========================================
    // CABLE SCHEDULE PAGE
    // ==========================================
    doc.addPage();
    yPos = margin;

    // Page header
    setFillColor(COLORS.dark);
    doc.rect(0, 0, pageWidth, 35, 'F');
    setColor(COLORS.white);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(18);
    doc.text('Cable Schedule', margin, 23);
    setColor(COLORS.secondary);
    doc.setFontSize(10);
    doc.text(`${connections.length} Connections`, pageWidth - margin, 23, { align: 'right' });

    yPos = 50;

    // Table header
    const colWidths = [22, 38, 28, 38, 28, 26];
    const headers = ['Cable ID', 'From Device', 'From Port', 'To Device', 'To Port', 'Type'];

    setFillColor([31, 41, 55]);
    doc.rect(margin, yPos - 5, contentWidth, 12, 'F');

    setColor(COLORS.white);
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
      if (yPos > pageHeight - 25) {
        doc.addPage();
        yPos = margin;

        // Page header
        setFillColor(COLORS.dark);
        doc.rect(0, 0, pageWidth, 35, 'F');
        setColor(COLORS.white);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(18);
        doc.text('Cable Schedule (continued)', margin, 23);
        yPos = 50;

        // Redraw table header
        setFillColor([31, 41, 55]);
        doc.rect(margin, yPos - 5, contentWidth, 12, 'F');
        setColor(COLORS.white);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);
        xPos = margin + 3;
        headers.forEach((header, j) => {
          doc.text(header, xPos, yPos + 2);
          xPos += colWidths[j];
        });
        yPos += 12;
      }

      const fromDevice = canvasProducts.find(cp => cp.instanceId === conn.from);
      const toDevice = canvasProducts.find(cp => cp.instanceId === conn.to);

      if (!fromDevice || !toDevice) return;

      // Zebra striping
      if (i % 2 === 0) {
        setFillColor([249, 250, 251]);
        doc.rect(margin, yPos - 4, contentWidth, 10, 'F');
      }

      xPos = margin + 3;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);

      // Cable ID with color badge
      const cableColor = CONNECTION_COLORS[conn.type] || COLORS.secondary;
      setFillColor(cableColor);
      drawRoundedRect(xPos, yPos - 3, 18, 7, 1);
      setColor(COLORS.white);
      doc.setFont(undefined, 'bold');
      doc.text(conn.wireId || `C${i + 1}`, xPos + 2, yPos + 1);
      xPos += colWidths[0];

      // Rest of row data
      setColor(COLORS.dark);
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

      setColor(cableColor);
      doc.text(truncate(conn.type, 12), xPos, yPos + 1);

      yPos += 10;
    });

    // ==========================================
    // ROOM-BY-ROOM PAGES
    // ==========================================
    uniqueRooms.forEach(room => {
      const roomDevices = canvasProducts.filter(cp => cp.room === room || (!cp.room && room === 'Unassigned'));
      if (roomDevices.length === 0) return;

      doc.addPage();
      yPos = margin;

      // Page header with room accent
      setFillColor(COLORS.accent);
      doc.rect(0, 0, pageWidth, 40, 'F');
      setColor(COLORS.white);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(22);
      doc.text(room, margin, 27);
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(`${roomDevices.length} Devices`, pageWidth - margin, 27, { align: 'right' });

      yPos = 55;

      // Device list for this room
      roomDevices.forEach((cp, i) => {
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = margin;
          setFillColor(COLORS.accent);
          doc.rect(0, 0, pageWidth, 35, 'F');
          setColor(COLORS.white);
          doc.setFont(undefined, 'bold');
          doc.setFontSize(18);
          doc.text(`${room} (continued)`, margin, 23);
          yPos = 50;
        }

        const product = cp.product;
        const deviceConnections = connections.filter(c => c.from === cp.instanceId || c.to === cp.instanceId);

        // Device card
        setFillColor(COLORS.light);
        drawRoundedRect(margin, yPos, contentWidth, 40, 3);

        // Icon placeholder
        setFillColor(COLORS.accent);
        drawRoundedRect(margin + 5, yPos + 5, 30, 30, 2);
        setColor(COLORS.white);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(14);
        const iconText = product.category.substring(0, 2).toUpperCase();
        doc.text(iconText, margin + 12, yPos + 24);

        // Device info
        setColor(COLORS.dark);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text(cp.label || product.brand, margin + 42, yPos + 12);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        setColor(COLORS.secondary);
        doc.text(`${product.brand} ${product.model}`, margin + 42, yPos + 20);

        // Connection summary
        if (deviceConnections.length > 0) {
          const inputConns = deviceConnections.filter(c => c.to === cp.instanceId);
          const outputConns = deviceConnections.filter(c => c.from === cp.instanceId);
          doc.text(`Inputs: ${inputConns.length} | Outputs: ${outputConns.length}`, margin + 42, yPos + 28);
        }

        // Network info on right
        if (cp.networkInfo && cp.networkInfo.ip && cp.networkInfo.ip !== '000.000.000.000') {
          doc.setFontSize(8);
          doc.text(`IP: ${cp.networkInfo.ip}`, pageWidth - margin - 5, yPos + 15, { align: 'right' });
          if (cp.networkInfo.mac && cp.networkInfo.mac !== '00:00:00:00:00:00') {
            doc.text(`MAC: ${cp.networkInfo.mac}`, pageWidth - margin - 5, yPos + 22, { align: 'right' });
          }
        }

        yPos += 45;
      });

      // Room notes section
      yPos += 10;
      if (yPos < pageHeight - 60) {
        setFillColor([254, 249, 195]);
        drawRoundedRect(margin, yPos, contentWidth, 35, 3);
        
        setColor([161, 98, 7]);
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

    setFillColor(COLORS.dark);
    doc.rect(0, 0, pageWidth, 35, 'F');
    setColor(COLORS.white);
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

      setFillColor(COLORS.light);
      drawRoundedRect(margin, yPos, contentWidth, 45, 3);

      setColor(COLORS.dark);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text(guide.title, margin + 10, yPos + 12);

      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      setColor(COLORS.secondary);
      guide.points.forEach((point, i) => {
        doc.text(`- ${point}`, margin + 10, yPos + 22 + (i * 7));
      });

      yPos += 50;
    });

    // ==========================================
    // SIGN-OFF PAGE
    // ==========================================
    doc.addPage();
    yPos = margin;

    setFillColor(COLORS.dark);
    doc.rect(0, 0, pageWidth, 35, 'F');
    setColor(COLORS.white);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(18);
    doc.text('Project Sign-Off', margin, 23);

    yPos = 60;

    setColor(COLORS.dark);
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
      setColor(COLORS.secondary);
      doc.setFontSize(10);
      doc.text(`${field}:`, margin, yPos);
      
      setDrawColor(COLORS.secondary);
      doc.setLineWidth(0.3);
      doc.line(margin + 45, yPos, pageWidth - margin, yPos);
      
      yPos += 20;
    });

    // Footer
    yPos = pageHeight - 30;
    setColor(COLORS.secondary);
    doc.setFontSize(8);
    centerText(`${projectName || 'AV System Design'} - Installation Package`, yPos, 8);
    centerText(`Generated ${new Date().toLocaleDateString()}`, yPos + 6, 8);

    // Generate PDF as base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    return Response.json({ pdf: pdfBase64 });
  } catch (error) {
    console.error('PDF Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});