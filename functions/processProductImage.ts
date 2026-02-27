import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { imageUrl } = await req.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      return Response.json({ error: 'imageUrl required' }, { status: 400 });
    }

    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!imageResponse.ok) {
      return Response.json({ error: 'Failed to fetch image' }, { status: 400 });
    }

    const blob = await imageResponse.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)));
    const dataUrl = `data:${blob.type};base64,${base64}`;

    return Response.json({ dataUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});