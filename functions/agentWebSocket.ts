import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Store active agent connections (in production, use Redis or similar)
const agentConnections = new Map();
const commandQueues = new Map();

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Handle WebSocket upgrade for agents
  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    let agentId = null;
    let organizationId = null;

    socket.onopen = () => {
      console.log('[Agent WS] Connection opened');
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'agent_hello': {
            // Verify agent registration
            agentId = message.agent_id;
            
            const agents = await base44.asServiceRole.entities.Agent.filter({ 
              agent_id: agentId 
            });
            
            if (agents.length === 0) {
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Agent not registered'
              }));
              socket.close();
              return;
            }
            
            const agent = agents[0];
            organizationId = agent.organization_id;
            
            // TODO: Verify Ed25519 signature when agent sends public_key + signature
            // For now, trust agent_id lookup (agent will add crypto)
            
            // Update agent status
            await base44.asServiceRole.entities.Agent.update(agent.id, {
              status: 'online',
              last_seen: new Date().toISOString(),
              version: message.version
            });
            
            // Store connection
            agentConnections.set(agentId, { socket, organizationId });
            
            // Send ack
            socket.send(JSON.stringify({
              type: 'agent_ack',
              org_id: organizationId,
              agent_name: agent.name,
              heartbeat_interval: 30
            }));
            
            // Send any queued commands
            const queue = commandQueues.get(agentId) || [];
            queue.forEach(cmd => socket.send(JSON.stringify(cmd)));
            commandQueues.delete(agentId);
            
            console.log(`[Agent WS] Agent ${agentId} connected to org ${organizationId}`);
            break;
          }
          
          case 'event': {
            // Store event in database for frontend polling
            if (agentId && organizationId) {
              try {
                await base44.asServiceRole.entities.AgentEvent.create({
                  organization_id: organizationId,
                  agent_id: agentId,
                  command_id: message.command_id,
                  event_type: message.event,
                  data: message.data || {}
                });
                console.log(`[Agent WS] Event stored: ${message.event}`);
              } catch (error) {
                console.error('[Agent WS] Failed to store event:', error);
              }
            }
            break;
          }
          
          case 'heartbeat': {
            if (agentId) {
              await base44.asServiceRole.entities.Agent.filter({ agent_id: agentId })
                .then(agents => {
                  if (agents[0]) {
                    return base44.asServiceRole.entities.Agent.update(agents[0].id, {
                      last_seen: new Date().toISOString()
                    });
                  }
                })
                .catch(err => console.error('Failed to update heartbeat:', err));
            }
            
            socket.send(JSON.stringify({ type: 'heartbeat_ack' }));
            break;
          }
        }
      } catch (error) {
        console.error('[Agent WS] Message error:', error);
      }
    };

    socket.onclose = () => {
      console.log(`[Agent WS] Agent ${agentId} disconnected`);
      if (agentId) {
        agentConnections.delete(agentId);
        
        // Update agent status to offline
        base44.asServiceRole.entities.Agent.filter({ agent_id: agentId })
          .then(agents => {
            if (agents[0]) {
              return base44.asServiceRole.entities.Agent.update(agents[0].id, {
                status: 'offline',
                last_seen: new Date().toISOString()
              });
            }
          })
          .catch(err => console.error('Failed to update agent offline status:', err));
      }
    };

    socket.onerror = (error) => {
      console.error('[Agent WS] Error:', error);
    };

    return response;
  }

  return Response.json({ error: 'WebSocket upgrade required' }, { status: 400 });
});