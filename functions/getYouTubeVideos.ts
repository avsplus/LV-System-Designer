import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    const channelId = Deno.env.get('YOUTUBE_CHANNEL_ID');
    
    if (!apiKey || !channelId) {
      return Response.json({ 
        error: 'YouTube API credentials not configured' 
      }, { status: 500 });
    }

    // Fetch videos from the channel
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&order=date&maxResults=50&type=video`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();

    const videos = data.items.map(item => ({
      youtubeId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium.url,
      publishedAt: item.snippet.publishedAt
    }));

    return Response.json({ videos });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});