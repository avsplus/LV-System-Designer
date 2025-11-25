import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { image_url } = await req.json();
    
    if (!image_url) {
      return Response.json({ error: 'image_url is required' }, { status: 400 });
    }

    // Use the free ClipDrop/Photoroom alternative - imgly background removal
    // Or use the free tier of removal.ai
    const imageResponse = await fetch(image_url);
    if (!imageResponse.ok) {
      return Response.json({ error: 'Failed to fetch image' }, { status: 400 });
    }
    
    const imageBlob = await imageResponse.blob();
    
    // Try using the free PhotoRoom API (no key required for basic usage)
    const formData = new FormData();
    formData.append('image_file', imageBlob, 'image.png');
    
    // Use Hugging Face's free rembg API
    const hfResponse = await fetch(
      'https://api-inference.huggingface.co/models/briaai/RMBG-1.4',
      {
        method: 'POST',
        headers: {
          'Content-Type': imageBlob.type || 'image/png'
        },
        body: imageBlob
      }
    );

    if (hfResponse.ok) {
      const processedBlob = await hfResponse.blob();
      const processedFile = new File([processedBlob], 'processed.png', { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: processedFile });
      
      return Response.json({ 
        processed_url: file_url, 
        success: true 
      });
    }

    // Fallback: return original image
    console.error('Background removal failed:', await hfResponse.text());
    return Response.json({ 
      processed_url: image_url, 
      success: false,
      message: 'Background removal service unavailable'
    });

  } catch (error) {
    console.error('Background removal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});