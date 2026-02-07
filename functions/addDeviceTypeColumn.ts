import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Add device_type column if it doesn't exist
    const { error: alterError } = await supabase.rpc('exec', {
      sql: `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'devices' AND column_name = 'device_type'
          ) THEN
            ALTER TABLE devices ADD COLUMN device_type TEXT;
          END IF;
        END $$;
      `
    });

    if (alterError) {
      return Response.json({ 
        error: 'Could not add column via RPC',
        details: alterError.message,
        sql: `ALTER TABLE devices ADD COLUMN device_type TEXT;`,
        instructions: 'Run this SQL manually in Supabase SQL Editor'
      }, { status: 500 });
    }

    // Reload schema cache
    await supabase.rpc('exec', {
      sql: `NOTIFY pgrst, 'reload schema';`
    });

    return Response.json({ 
      success: true,
      message: 'device_type column added successfully'
    });
  } catch (error) {
    return Response.json({ 
      error: error.message,
      sql: `ALTER TABLE devices ADD COLUMN device_type TEXT;`,
      instructions: 'Run this SQL manually in Supabase SQL Editor if the function fails'
    }, { status: 500 });
  }
});