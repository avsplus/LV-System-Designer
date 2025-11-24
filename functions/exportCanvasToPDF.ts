import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { canvasProducts, connections, projectName } = await req.json();

    if (!canvasProducts || canvasProducts.length === 0) {
      return Response.json({ error: 'No devices on canvas' }, { status: 400 });
    }

    const doc = new jsPDF();
    let yPos = 20;

    // Title Page
    doc.setFontSize(24);
    doc.text(projectName || 'AV System Design', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
    yPos += 5;
    doc.text(`Created by: ${user.full_name || user.email}`, 20, yPos);
    yPos += 15;

    doc.setFontSize(14);
    doc.text(`System Overview`, 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.text(`Total Devices: ${canvasProducts.length}`, 20, yPos);
    yPos += 6;
    doc.text(`Total Connections: ${connections.length}`, 20, yPos);
    yPos += 15;

    // Detailed Device Documentation
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.text('Device Documentation', 20, yPos);
    yPos += 10;

    canvasProducts.forEach((cp) => {
      const product = cp.product;
      
      // Check if we need a new page
      const inputs = product.input_connections || [];
      const outputs = product.output_connections || [];
      const totalPorts = inputs.reduce((sum, i) => sum + i.ports.length, 0) + 
                        outputs.reduce((sum, o) => sum + o.ports.length, 0);
      const estimatedHeight = 40 + (totalPorts * 5);
      
      if (yPos + estimatedHeight > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Device: ${cp.label || product.brand}`, 20, yPos);
      yPos += 6;
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(`Type: ${product.category.replace(/_/g, ' ')}`, 20, yPos);
      yPos += 5;
      doc.text(`Model: ${product.model}`, 20, yPos);
      yPos += 5;
      
      if (product.description) {
        doc.text(`Description: ${product.description}`, 20, yPos);
        yPos += 5;
      }

      if (cp.networkInfo) {
        doc.text(`MAC: ${cp.networkInfo.mac || '00:00:00:00:00:00'}`, 20, yPos);
        yPos += 5;
        doc.text(`IP Address: ${cp.networkInfo.ip || '000.000.000.000'}`, 20, yPos);
        yPos += 5;
        doc.text(`Firmware: SW#: ${cp.networkInfo.sw || 'N/A'}`, 20, yPos);
        yPos += 5;
      }

      doc.text(`Ports: ${totalPorts} total`, 20, yPos);
      yPos += 8;

      doc.setFont(undefined, 'bold');
      doc.text('Ports:', 20, yPos);
      yPos += 5;
      doc.setFont(undefined, 'normal');

      // List all input ports
      inputs.forEach(input => {
        input.ports.forEach(port => {
          doc.text(`  ${port} (${input.type} Input)`, 25, yPos);
          yPos += 4;
        });
      });

      // List all output ports
      outputs.forEach(output => {
        output.ports.forEach(port => {
          doc.text(`  ${port} (${output.type} Output)`, 25, yPos);
          yPos += 4;
        });
      });

      yPos += 8;
    });

    // As-Built Table
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.text('As-Built Table', 20, yPos);
    yPos += 10;

    // Connection type to color mapping
    const colorCodes = {
      'HDMI': 'Black',
      'Optical': 'Blue',
      'RCA': 'Red/White',
      'XLR': 'Black',
      'Speaker Wire': 'Red/Black',
      'Ethernet': 'Blue',
      'USB': 'Gray',
      'Coaxial': 'Orange',
      'HDBaseT': 'Purple',
      'Component': 'Red/Green/Blue',
      'Composite': 'Yellow',
      'VGA': 'Blue',
      'RS232': 'Gray',
      'Subwoofer': 'Purple'
    };

    // Table headers
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    const colWidths = [15, 40, 30, 40, 30, 25, 25];
    const headers = ['Cable ID', 'From Device', 'From Port', 'To Device', 'To Port', 'Signal Type', 'Color Code'];
    let xPos = 10;
    
    headers.forEach((header, i) => {
      doc.text(header, xPos, yPos);
      xPos += colWidths[i];
    });
    
    yPos += 2;
    doc.line(10, yPos, 200, yPos);
    yPos += 5;

    // Table rows
    doc.setFont(undefined, 'normal');
    connections.forEach((conn) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
        
        // Redraw headers on new page
        doc.setFont(undefined, 'bold');
        xPos = 10;
        headers.forEach((header, i) => {
          doc.text(header, xPos, yPos);
          xPos += colWidths[i];
        });
        yPos += 2;
        doc.line(10, yPos, 200, yPos);
        yPos += 5;
        doc.setFont(undefined, 'normal');
      }

      const fromDevice = canvasProducts.find(cp => cp.instanceId === conn.from);
      const toDevice = canvasProducts.find(cp => cp.instanceId === conn.to);

      if (!fromDevice || !toDevice) return;

      xPos = 10;
      const rowData = [
        conn.wireId || `C${connections.indexOf(conn) + 1}`,
        fromDevice.label || fromDevice.product.brand,
        conn.fromPort || 'N/A',
        toDevice.label || toDevice.product.brand,
        conn.toPort || 'N/A',
        conn.type,
        colorCodes[conn.type] || 'Various'
      ];

      rowData.forEach((data, i) => {
        const maxWidth = colWidths[i] - 2;
        const text = doc.splitTextToSize(data.toString(), maxWidth);
        doc.text(text, xPos, yPos);
        xPos += colWidths[i];
      });

      yPos += 6;
    });



    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${projectName || 'AV-System-Design'}.pdf"`
      }
    });
  } catch (error) {
    console.error('PDF Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});