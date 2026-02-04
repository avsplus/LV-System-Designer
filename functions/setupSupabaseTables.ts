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
-- Recreate devices table with all required columns
DROP TABLE IF EXISTS devices CASCADE;

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  agent_id TEXT,
  network_id TEXT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'other',
  device_type TEXT,
  ip_address TEXT,
  mac_address TEXT,
  vendor TEXT,
  status TEXT DEFAULT 'offline',
  location TEXT,
  notes TEXT,
  position_x NUMERIC DEFAULT 0,
  position_y NUMERIC DEFAULT 0,
  connected_to JSONB DEFAULT '[]'::jsonb,
  open_ports JSONB DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for devices
CREATE INDEX idx_devices_org ON devices(organization_id);
CREATE INDEX idx_devices_agent ON devices(agent_id);
CREATE INDEX idx_devices_mac ON devices(mac_address);

-- Enable RLS on devices
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- RLS Policy for devices (allow service role full access)
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