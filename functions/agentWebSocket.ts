import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Store active agent connections (in production, use Redis or similar)
const agentConnections = new Map();
const commandQueues = new Map();

Deno.serve(async (req) => {
  try {
    console.log("🔥 WS HANDLER FILE HIT 🔥");
    console.log("[WS] Request URL:", req.url);
    console.log("[WS] Upgrade header:", req.headers.get("upgrade"));

    // DEBUG: Check client creation via POST (for test_backend_function)
    if (req.method === "POST") {
        try {
            const clone = req.clone();
            const body = await clone.json().catch(() => ({}));
            if (body.debug_client) {
                console.log("[DEBUG] Testing client creation...");
                const base44 = createClientFromRequest(req);
                const isServiceRoleAvailable = !!base44.asServiceRole;
                console.log("[DEBUG] Client created. Service role available:", isServiceRoleAvailable);
                return Response.json({ 
                    success: true, 
                    service_role: isServiceRoleAvailable,
                    env_check: {
                        BASE44_API_URL: !!Deno.env.get("BASE44_API_URL"),
                        // Don't log the actual key, just existence
                        // BASE44_SERVICE_ROLE_KEY might not be in env directly if injected differently
                    }
                });
            }
        } catch (e) {
            console.log("[DEBUG] Error checking body:", e);
        }
    }

    // Handle WebSocket upgrade for agents
    if (req.headers.get("upgrade") === "websocket") {
      console.log("[WS] Starting WebSocket upgrade...");

      const { socket, response } = Deno.upgradeWebSocket(req);

      // Create service-role client for agent operations (agents don't have user auth)
      const base44 = createClientFromRequest(req);

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
            await base44.asServiceRole.entities.Agent.update(agent.id, {
              status: 'online',
              last_seen: new Date().toISOString(),
              version: message.version,
              capabilities: message.capabilities || agent.capabilities
            });
            
            // Store connection
            agentConnections.set(agentId, { socket, organizationId });
            
            // Get org for signing ack
            const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organizationId });
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
        
        // Update agent status to offline (reuse existing base44 client with service role)
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
  } catch (error) {
    console.error('[Agent WS] Fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});