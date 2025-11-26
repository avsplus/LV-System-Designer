import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

// Color constants
const COLORS = {
  primary: [30, 64, 175],      // Blue
  secondary: [107, 114, 128],  // Gray
  dark: [17, 24, 39],          // Dark gray
  light: [243, 244, 246],      // Light gray
  white: [255, 255, 255],
  accent: [59, 130, 246],      // Bright blue
  success: [34, 197, 94],      // Green
  warning: [251, 191, 36],     // Yellow
  // Cable colors
  hdmi: [231, 76, 60],         // Red
  optical: [42, 127, 219],     // Blue
  rca: [255, 179, 0],          // Yellow/Orange
  xlr: [26, 188, 156],         // Teal
  speaker: [142, 92, 44],      // Brown
  ethernet: [39, 174, 96],     // Green
  usb: [42, 127, 219],         // Blue
  coaxial: [42, 127, 219],     // Blue
  hdbaset: [233, 30, 99],      // Pink
  control: [127, 140, 141],    // Gray
  power: [255, 165, 0]         // Orange
};

const CONNECTION_COLORS = {
  'HDMI': COLORS.hdmi,
  'HDBaseT': COLORS.hdbaset,
  'Optical': COLORS.optical,
  'Optical/TOSLINK': COLORS.optical,
  'RCA': COLORS.rca,
  'XLR': COLORS.xlr,
  'Speaker Wire': COLORS.speaker,
  'Ethernet': COLORS.ethernet,
  'USB': COLORS.usb,
  'Coaxial': COLORS.coaxial,
  'Component': COLORS.hdmi,
  'Composite': COLORS.hdmi,
  'VGA': COLORS.hdmi,
  'RS232': COLORS.control,
  'Control': COLORS.control,
  'IR': COLORS.control,
  'Subwoofer': COLORS.speaker,
  '3.5mm Jack': COLORS.rca,
  'Power': COLORS.power
};

const CABLE_COLOR_NAMES = {
  'HDMI': 'Black w/ Red Label',
  'HDBaseT': 'Purple CAT6',
  'Optical': 'Blue Fiber',
  'Optical/TOSLINK': 'Blue Fiber',
  'RCA': 'Red/White',
  'XLR': 'Black 3-Pin',
  'Speaker Wire': 'CL2 Red/Black',
  'Ethernet': 'Blue CAT6',
  'USB': 'Gray USB',
  'Coaxial': 'Orange RG6',
  'Component': 'RGB Bundle',
  'Composite': 'Yellow RCA',
  'VGA': 'Blue VGA',
  'RS232': 'Gray DB9',
  'Control': 'Gray Control',
  'IR': 'IR Emitter',
  'Subwoofer': 'Purple RCA',
  '3.5mm Jack': 'Black 3.5mm',
  'Power': 'Black IEC'
};

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
    // PAGE 1: COVER PAGE
    // ==========================================
    setFillColor(COLORS.dark);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Decorative accent line
    setFillColor(COLORS.accent);
    doc.rect(0, pageHeight * 0.35, pageWidth, 3, 'F');
    doc.rect(0, pageHeight * 0.65, pageWidth, 1, 'F');

    // Project name
    setColor(COLORS.white);
    doc.setFont(undefined, 'bold');
    centerText(projectName || 'AV System Design', pageHeight * 0.42, 32);

    // Subtitle
    setColor(COLORS.secondary);
    doc.setFont(undefined, 'normal');
    centerText('AV System Installation Package', pageHeight * 0.48, 14);

    // Details section
    let detailY = pageHeight * 0.55;
    doc.setFontSize(11);
    
    if (clientName) {
      setColor(COLORS.secondary);
      centerText('Prepared for:', detailY, 10);
      detailY += 6;
      setColor(COLORS.white);
      centerText(clientName, detailY, 12);
      detailY += 12;
    }

    if (location) {
      setColor(COLORS.secondary);
      centerText('Location:', detailY, 10);
      detailY += 6;
      setColor(COLORS.white);
      centerText(location, detailY, 12);
      detailY += 12;
    }

    setColor(COLORS.secondary);
    centerText('Date:', detailY, 10);
    detailY += 6;
    setColor(COLORS.white);
    centerText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), detailY, 12);

    // Stats bar
    const statsY = pageHeight * 0.75;
    setFillColor([31, 41, 55]);
    drawRoundedRect(margin + 20, statsY - 5, contentWidth - 40, 25, 3);

    doc.setFontSize(10);
    const statsWidth = (contentWidth - 40) / 4;
    const statsX = margin + 20;

    [
      { label: 'Devices', value: canvasProducts.length },
      { label: 'Connections', value: connections.length },
      { label: 'Rooms', value: uniqueRooms.length },
      { label: 'Cable Runs', value: connections.length }
    ].forEach((stat, i) => {
      const x = statsX + (statsWidth * i) + (statsWidth / 2);
      setColor(COLORS.accent);
      doc.setFont(undefined, 'bold');
      doc.text(stat.value.toString(), x, statsY + 5, { align: 'center' });
      setColor(COLORS.secondary);
      doc.setFont(undefined, 'normal');
      doc.text(stat.label, x, statsY + 12, { align: 'center' });
    });

    // Powered by footer
    setColor([75, 85, 99]);
    doc.setFontSize(8);
    centerText(`Generated by ${user.full_name || user.email}`, pageHeight - 20, 8);
    centerText('Powered by AV System Designer', pageHeight - 14, 8);

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
    // PAGE 3+: DEVICE CARDS (Grid Layout)
    // ==========================================
    doc.addPage();
    yPos = margin;

    // Page header
    setFillColor(COLORS.dark);
    doc.rect(0, 0, pageWidth, 35, 'F');
    setColor(COLORS.white);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(18);
    doc.text('Device Documentation', margin, 23);
    setColor(COLORS.secondary);
    doc.setFontSize(10);
    doc.text(`${canvasProducts.length} Devices`, pageWidth - margin, 23, { align: 'right' });

    yPos = 45;

    const deviceCardWidth = (contentWidth - 5) / 2;
    const deviceCardHeight = 65;

    canvasProducts.forEach((cp, index) => {
      const col = index % 2;
      const cardX = margin + (col * (deviceCardWidth + 5));

      if (col === 0 && yPos + deviceCardHeight > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        
        // Page header
        setFillColor(COLORS.dark);
        doc.rect(0, 0, pageWidth, 35, 'F');
        setColor(COLORS.white);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(18);
        doc.text('Device Documentation', margin, 23);
        yPos = 45;
      }

      const product = cp.product;
      const deviceConnections = connections.filter(c => c.from === cp.instanceId || c.to === cp.instanceId);

      // Card background
      setFillColor(COLORS.light);
      drawRoundedRect(cardX, yPos, deviceCardWidth, deviceCardHeight, 3);

      // Category accent bar
      setFillColor(COLORS.accent);
      doc.rect(cardX, yPos, 4, deviceCardHeight, 'F');

      // Device label
      setColor(COLORS.dark);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text(cp.label || product.brand, cardX + 8, yPos + 10);

      // Category badge
      setFillColor([229, 231, 235]);
      const catText = product.category.replace(/_/g, ' ');
      const catWidth = doc.getTextWidth(catText) + 6;
      drawRoundedRect(cardX + deviceCardWidth - catWidth - 8, yPos + 4, catWidth, 10, 2);
      setColor(COLORS.secondary);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7);
      doc.text(catText, cardX + deviceCardWidth - catWidth - 5, yPos + 10);

      // Model
      setColor(COLORS.secondary);
      doc.setFontSize(9);
      doc.text(`Model: ${product.model}`, cardX + 8, yPos + 20);

      // Room
      if (cp.room) {
        doc.text(`Room: ${cp.room}`, cardX + 8, yPos + 28);
      }

      // Network info
      if (cp.networkInfo && cp.networkInfo.ip && cp.networkInfo.ip !== '000.000.000.000') {
        doc.text(`IP: ${cp.networkInfo.ip}`, cardX + 8, yPos + 36);
      }

      // Ports in use
      const portsInUse = deviceConnections.map(c => {
        if (c.from === cp.instanceId) return c.fromPort;
        return c.toPort;
      }).filter(Boolean);

      if (portsInUse.length > 0) {
        doc.setFontSize(8);
        const portsText = `Ports: ${portsInUse.slice(0, 4).join(' / ')}${portsInUse.length > 4 ? '...' : ''}`;
        doc.text(portsText, cardX + 8, yPos + 44);
      }

      // Connection count badge
      setFillColor(COLORS.accent);
      drawRoundedRect(cardX + deviceCardWidth - 25, yPos + deviceCardHeight - 18, 20, 12, 2);
      setColor(COLORS.white);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
      doc.text(`${deviceConnections.length}`, cardX + deviceCardWidth - 15, yPos + deviceCardHeight - 10, { align: 'center' });

      if (col === 1) {
        yPos += deviceCardHeight + 5;
      }
    });

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

    // Generate PDF
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${projectName || 'AV-System-Design'}-Installation-Package.pdf"`
      }
    });
  } catch (error) {
    console.error('PDF Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});