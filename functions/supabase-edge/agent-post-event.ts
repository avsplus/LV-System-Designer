// Supabase Edge Function: agent-post-event
// Purpose: Receive and store agent events (scan progress, device found, etc.)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type AgentEvent = {
  agent_id: string;
  org_id: string;
  command_id?: string;
  event_type: string;
  data: unknown;
};

serve(async (req) => {
  if (req.method !== "POST") {
    return json({ code: "METHOD_NOT_ALLOWED" }, 405);
  }

  let body: AgentEvent;
  try {
    body = await req.json();
  } catch {
    return json({ code: "BAD_REQUEST", message: "Invalid JSON" }, 400);
  }

  const { agent_id, org_id, event_type, data, command_id } = body;

  if (!agent_id || !org_id || !event_type) {
    return json({ code: "BAD_REQUEST", message: "Missing required fields" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Store event
  const resp = await fetch(
    `${supabaseUrl}/rest/v1/agent_events`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        agent_id,
        org_id,
        command_id: command_id || null,
        event_type,
        data,
        created_at: new Date().toISOString()
      })
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    console.error("Failed to store event:", err);
    return json({ code: "DB_ERROR", message: err }, 500);
  }

  return json({ ok: true }, 201);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}