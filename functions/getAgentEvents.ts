import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agentId');
    const commandId = url.searchParams.get('commandId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    if (!agentId) {
      return Response.json({ error: 'agentId required' }, { status: 400 });
    }
    
    // Verify agent belongs to user's org
    const agents = await base44.entities.Agent.filter({
      agent_id: agentId,
      organization_id: user.organization_id
    });
    
    if (agents.length === 0) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    // Fetch events
    const filter = {
      organization_id: user.organization_id,
      agent_id: agentId
    };
    
    if (commandId) {
      filter.command_id = commandId;
    }
    
    const events = await base44.entities.AgentEvent.filter(filter);
    
    // Sort by created_date descending and limit
    const sortedEvents = events
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, limit);
    
    return Response.json(sortedEvents);
  } catch (error) {
    console.error('Get events error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});