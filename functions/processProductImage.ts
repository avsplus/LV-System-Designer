Deno.serve(async (req) => {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      return Response.json({ error: 'imageUrl required' }, { status: 400 });
    }

    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!imageResponse.ok) {
      return Response.json({ error: `Failed to fetch image: ${imageResponse.status}` }, { status: 400 });
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let base64 = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      base64 += String.fromCharCode(...bytes.slice(i, i + 8192));
    }
    const base64Final = btoa(base64);
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${base64Final}`;

    return Response.json({ dataUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});