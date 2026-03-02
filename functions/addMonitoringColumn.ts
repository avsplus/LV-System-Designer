import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Add monitoring_enabled column to agents table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE agents 
        ADD COLUMN IF NOT EXISTS monitoring_enabled BOOLEAN DEFAULT FALSE;
      `
    });
    
    if (error) {
      console.error('Migration error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }
    
    return Response.json({ 
      success: true, 
      message: 'monitoring_enabled column added to agents table' 
    });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});