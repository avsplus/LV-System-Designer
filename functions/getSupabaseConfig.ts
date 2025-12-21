import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return Response.json({ error: 'Supabase configuration not found' }, { status: 500 });
    }

    return Response.json({
      url: supabaseUrl,
      anonKey: supabaseAnonKey
    });
  } catch (error) {
    console.error('Error getting Supabase config:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});