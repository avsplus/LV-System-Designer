import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { agent_id, command_id, limit = 50 } = await req.json();
    
    if (!agent_id) {
      return Response.json({ error: 'agent_id required' }, { status: 400 });
    }
    
    // Verify agent belongs to user's org
    const agents = await base44.entities.Agent.filter({
      agent_id,
      organization_id: user.organization_id
    });
    
    if (agents.length === 0) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    // Fetch events
    const filter = {
      organization_id: user.organization_id,
      agent_id
    };
    
    if (command_id) {
      filter.command_id = command_id;
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