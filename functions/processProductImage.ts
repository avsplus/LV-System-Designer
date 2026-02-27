import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { imageUrl } = await req.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      return Response.json({ error: 'imageUrl required' }, { status: 400 });
    }

    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      return Response.json({ error: `Failed to fetch image: ${imageResponse.status}` }, { status: 400 });
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${base64}`;

    return Response.json({ dataUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});