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

    // Fetch the original image
    const imageResponse = await fetch(image_url);
    if (!imageResponse.ok) {
      return Response.json({ error: 'Failed to fetch image' }, { status: 400 });
    }
    
    const imageBlob = await imageResponse.blob();
    
    // Use remove.bg API (free tier available)
    const formData = new FormData();
    formData.append('image_file', imageBlob);
    formData.append('size', 'auto');
    
    const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': Deno.env.get('REMOVE_BG_API_KEY') || ''
      },
      body: formData
    });

    if (!removeBgResponse.ok) {
      // Fallback: return original image if remove.bg fails
      console.error('remove.bg failed:', await removeBgResponse.text());
      return Response.json({ 
        processed_url: image_url, 
        success: false,
        message: 'Background removal service unavailable, using original image'
      });
    }

    // Get the processed image
    const processedBlob = await removeBgResponse.blob();
    
    // Convert blob to File for upload
    const processedFile = new File([processedBlob], 'processed.png', { type: 'image/png' });
    
    // Upload processed image
    const { file_url } = await base44.integrations.Core.UploadFile({ file: processedFile });

    return Response.json({ 
      processed_url: file_url, 
      success: true 
    });

  } catch (error) {
    console.error('Background removal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});