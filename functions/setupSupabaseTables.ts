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
-- Drop existing tables (clean slate)
DROP TABLE IF EXISTS agent_events CASCADE;
DROP TABLE IF EXISTS registration_tokens CASCADE;
DROP TABLE IF EXISTS agents CASCADE;

-- Agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  agent_id TEXT UNIQUE NOT NULL,
  agent_public_key TEXT,
  name TEXT NOT NULL,
  version TEXT,
  status TEXT DEFAULT 'registered',
  last_seen TIMESTAMP WITH TIME ZONE,
  location TEXT,
  assigned_network_id TEXT,
  capabilities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Registration tokens table
CREATE TABLE registration_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  org_signing_public_key TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by TEXT,
  used_by_agent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent events table
CREATE TABLE agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  command_id TEXT,
  event_type TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agents_org ON agents(organization_id);
CREATE INDEX idx_agents_agent_id ON agents(agent_id);
CREATE INDEX idx_tokens_token ON registration_tokens(token);
CREATE INDEX idx_tokens_org ON registration_tokens(organization_id);
CREATE INDEX idx_events_agent ON agent_events(agent_id);
CREATE INDEX idx_events_org ON agent_events(organization_id);

-- Enable RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow service role full access)
CREATE POLICY "Service role full access" ON agents FOR ALL USING (true);
CREATE POLICY "Service role full access" ON registration_tokens FOR ALL USING (true);
CREATE POLICY "Service role full access" ON agent_events FOR ALL USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
ALTER PUBLICATION supabase_realtime ADD TABLE registration_tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_events;
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