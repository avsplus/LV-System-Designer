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

    // Device List
    doc.setFontSize(16);
    doc.text('Device List', 20, yPos);
    yPos += 10;

    canvasProducts.forEach((cp, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      const product = cp.product;
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`${index + 1}. ${cp.label || product.brand}`, 20, yPos);
      yPos += 6;
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(`Brand: ${product.brand}`, 25, yPos);
      yPos += 5;
      doc.text(`Model: ${product.model}`, 25, yPos);
      yPos += 5;
      doc.text(`Category: ${product.category.replace(/_/g, ' ')}`, 25, yPos);
      yPos += 5;

      if (product.price) {
        doc.text(`Price: $${product.price.toLocaleString()}`, 25, yPos);
        yPos += 5;
      }

      if (cp.networkInfo && cp.networkInfo.ip && cp.networkInfo.ip !== '000.000.000.000') {
        doc.text(`Network: IP ${cp.networkInfo.ip} | SW# ${cp.networkInfo.sw || 'N/A'} | Port ${cp.networkInfo.port || 'N/A'}`, 25, yPos);
        yPos += 5;
      }

      // Device connections
      const deviceConnections = connections.filter(c => c.from === cp.instanceId || c.to === cp.instanceId);
      if (deviceConnections.length > 0) {
        doc.text(`Connections: ${deviceConnections.length}`, 25, yPos);
        yPos += 5;
      }

      yPos += 5;
    });

    // Connection Details
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.text('Connection Details', 20, yPos);
    yPos += 10;

    connections.forEach((conn, index) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      const fromDevice = canvasProducts.find(cp => cp.instanceId === conn.from);
      const toDevice = canvasProducts.find(cp => cp.instanceId === conn.to);

      if (!fromDevice || !toDevice) return;

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`${conn.wireId || `C${index + 1}`}: ${conn.type}`, 20, yPos);
      yPos += 6;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(`From: ${fromDevice.label || fromDevice.product.brand} (${conn.fromPort || 'N/A'})`, 25, yPos);
      yPos += 5;
      doc.text(`To: ${toDevice.label || toDevice.product.brand} (${conn.toPort || 'N/A'})`, 25, yPos);
      yPos += 8;
    });

    // Input/Output Summary per Device
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.text('Device Port Summary', 20, yPos);
    yPos += 10;

    canvasProducts.forEach((cp) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      const product = cp.product;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`${cp.label || product.brand}`, 20, yPos);
      yPos += 6;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);

      // Inputs
      if (product.input_connections && product.input_connections.length > 0) {
        doc.text('Inputs:', 25, yPos);
        yPos += 5;
        product.input_connections.forEach(input => {
          doc.text(`  • ${input.type}: ${input.ports.length} port(s)`, 30, yPos);
          yPos += 4;
        });
        yPos += 2;
      }

      // Outputs
      if (product.output_connections && product.output_connections.length > 0) {
        doc.text('Outputs:', 25, yPos);
        yPos += 5;
        product.output_connections.forEach(output => {
          doc.text(`  • ${output.type}: ${output.ports.length} port(s)`, 30, yPos);
          yPos += 4;
        });
      }

      yPos += 8;
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