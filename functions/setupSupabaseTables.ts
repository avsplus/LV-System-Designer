import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

    const sqlStatements = `
-- Add missing columns to existing devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS agent_id TEXT;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_devices_org ON devices(organization_id);
CREATE INDEX IF NOT EXISTS idx_devices_agent ON devices(agent_id);

-- Enable RLS if not already enabled
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Service role full access" ON devices;
CREATE POLICY "Service role full access" ON devices FOR ALL USING (true);

-- Enable Realtime for devices
ALTER PUBLICATION supabase_realtime ADD TABLE devices;
`;

    return Response.json({ 
      success: true,
      message: 'Execute these SQL statements in your Supabase SQL editor',
      sql: sqlStatements
    });
  } catch (error) {
    console.error('Setup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});