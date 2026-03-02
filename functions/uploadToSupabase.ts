import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
const bucketName = Deno.env.get('SUPABASE_BUCKET');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseUrl || !supabaseKey || !bucketName) {
      return Response.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { action, fileUrl, fileName, productId, fileData, contentType } = body;

    if (action === 'uploadFromUrl') {
      // Download the file from external URL
      const response = await fetch(fileUrl);
      if (!response.ok) {
        return Response.json({ error: 'Failed to fetch file from URL' }, { status: 400 });
      }

      const fileBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'application/pdf';
      
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = fileName || `manual_${productId}_${timestamp}.pdf`;
      const filePath = `manuals/${productId}/${sanitizedName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBuffer, {
          contentType,
          upsert: true
        });

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return Response.json({ 
        success: true, 
        file_url: urlData.publicUrl,
        path: filePath
      });
    }

    if (action === 'uploadFile') {
      // For direct file uploads, expect base64 data
      const actualContentType = contentType || 'application/pdf';
      
      const timestamp = Date.now();
      const sanitizedName = fileName || `manual_${productId}_${timestamp}.pdf`;
      const filePath = `manuals/${productId}/${sanitizedName}`;

      // Decode base64
      const binaryData = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, binaryData, {
          contentType: actualContentType,
          upsert: true
        });

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return Response.json({ 
        success: true, 
        file_url: urlData.publicUrl,
        path: filePath
      });
    }

    if (action === 'delete') {
      const filePath = body.filePath;
      
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});