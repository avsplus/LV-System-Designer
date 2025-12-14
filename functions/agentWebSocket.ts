import { createClient } from 'npm:@base44/sdk@0.8.4';

// Store active agent connections (in production, use Redis or similar)
const agentConnections = new Map();
const commandQueues = new Map();

Deno.serve(async (req) => {
  // Handle WebSocket upgrade for agents
  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    // Create service-role SDK client AFTER upgrade (agents have no user auth)
    const base44 = createClient({
      baseUrl: Deno.env.get('BASE44_API_URL'),
      serviceRoleKey: Deno.env.get('BASE44_SERVICE_ROLE_KEY')
    });
    
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
            const publicKey = message.public_key;
            const timestamp = message.timestamp;
            const signature = message.signature;
            
            const agents = await base44.entities.Agent.filter({ 
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
            
            // Verify Ed25519 signature
            if (signature && publicKey && timestamp) {
              try {
                // Verify timestamp freshness (within 2 minutes)
                const now = Math.floor(Date.now() / 1000);
                if (Math.abs(now - timestamp) > 120) {
                  socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Timestamp too old or in future'
                  }));
                  socket.close();
                  return;
                }
                
                // Verify public key matches stored key
                if (agent.agent_public_key !== publicKey) {
                  socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Public key mismatch'
                  }));
                  socket.close();
                  return;
                }
                
                // Verify signature
                const messageToVerify = `${agentId}:${timestamp}`;
                const publicKeyBytes = Uint8Array.from(atob(publicKey), c => c.charCodeAt(0));
                const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
                const messageBytes = new TextEncoder().encode(messageToVerify);
                
                const cryptoKey = await crypto.subtle.importKey(
                  "raw",
                  publicKeyBytes,
                  { name: "Ed25519" },
                  false,
                  ["verify"]
                );
                
                const isValid = await crypto.subtle.verify(
                  "Ed25519",
                  cryptoKey,
                  signatureBytes,
                  messageBytes
                );
                
                if (!isValid) {
                  socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Invalid signature'
                  }));
                  socket.close();
                  return;
                }
              } catch (error) {
                console.error('[Agent WS] Signature verification failed:', error);
                socket.send(JSON.stringify({
                  type: 'error',
                  message: 'Signature verification failed'
                }));
                socket.close();
                return;
              }
            }
            
            // Update agent status
            await base44.entities.Agent.update(agent.id, {
              status: 'online',
              last_seen: new Date().toISOString(),
              version: message.version,
              capabilities: message.capabilities || agent.capabilities
            });
            
            // Store connection
            agentConnections.set(agentId, { socket, organizationId });
            
            // Get org for signing ack
            const orgs = await base44.entities.Organization.filter({ id: organizationId });
            const org = orgs[0];
            
            // Sign ack using JSON-based signing
            let ackSignature = null;
            let sigInputB64 = null;
            const ts = new Date().toISOString();
            const nonce = crypto.randomUUID();
            
            if (org?.org_signing_private_key) {
              try {
                const sigInputJson = JSON.stringify({
                  type: "agent_ack",
                  agent_id: agentId,
                  org_id: organizationId,
                  ts,
                  nonce
                });
                
                const messageBytes = new TextEncoder().encode(sigInputJson);
                sigInputB64 = btoa(String.fromCharCode(...messageBytes));
                
                const privateKeyBytes = Uint8Array.from(atob(org.org_signing_private_key), c => c.charCodeAt(0));
                const cryptoKey = await crypto.subtle.importKey(
                  "pkcs8",
                  privateKeyBytes,
                  { name: "Ed25519" },
                  false,
                  ["sign"]
                );
                
                const signatureBytes = await crypto.subtle.sign(
                  "Ed25519",
                  cryptoKey,
                  messageBytes
                );
                
                ackSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
              } catch (error) {
                console.error('[Agent WS] Failed to sign ack:', error);
              }
            }
            
            // Send ack
            socket.send(JSON.stringify({
              type: 'agent_ack',
              org_id: organizationId,
              agent_name: agent.name,
              heartbeat_interval: 30,
              ts,
              nonce,
              sig_alg: 'ed25519',
              sig_input_b64: sigInputB64,
              signature: ackSignature
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
                await base44.entities.AgentEvent.create({
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
              await base44.entities.Agent.filter({ agent_id: agentId })
                .then(agents => {
                  if (agents[0]) {
                    return base44.entities.Agent.update(agents[0].id, {
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
        const base44 = createClient({
          baseUrl: Deno.env.get('BASE44_API_URL'),
          serviceRoleKey: Deno.env.get('BASE44_SERVICE_ROLE_KEY')
        });
        
        base44.entities.Agent.filter({ agent_id: agentId })
          .then(agents => {
            if (agents[0]) {
              return base44.entities.Agent.update(agents[0].id, {
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