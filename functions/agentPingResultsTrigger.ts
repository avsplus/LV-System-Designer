import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This gets called by entity automation when agent_ping_results record is created
    const { event, data } = await req.json();
    
    if (event?.type !== 'create' || !data) {
      return Response.json({ error: 'Invalid trigger event' }, { status: 400 });
    }
    
    console.log('🔔 Ping result received for command:', data.command_id);
    
    // Process the ping result asynchronously
    base44.asServiceRole.functions.invoke('processPingResults', {
      command_id: data.command_id
    }).catch(err => console.error('Failed to process ping results:', err));
    
    return Response.json({ success: true, message: 'Processing ping results' });
    
  } catch (error) {
    console.error('Trigger error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});