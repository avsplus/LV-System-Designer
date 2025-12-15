import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    // Allow CORS for external agent access
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    const { reg_token, agent_id, agent_public_key, machine_info } = await req.json();
    
    if (!reg_token || !agent_id || !agent_public_key) {
      return Response.json({ 
        error: 'Missing required fields: reg_token, agent_id, agent_public_key' 
      }, { status: 400 });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Validate registration token
    const { data: tokens, error: tokenError } = await supabase
      .from('registration_tokens')
      .select('*')
      .eq('token', reg_token)
      .eq('status', 'active')
      .single();
    
    if (tokenError || !tokens) {
      return Response.json({ error: 'Invalid or expired registration token' }, { status: 401 });
    }
    
    // Check token expiration
    if (new Date(tokens.expires_at) < new Date()) {
      await supabase
        .from('registration_tokens')
        .update({ status: 'expired' })
        .eq('id', tokens.id);
      return Response.json({ error: 'Registration token expired' }, { status: 401 });
    }
    
    // Check if agent already registered in THIS organization
    const { data: existingAgents } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agent_id);

    if (existingAgents && existingAgents.length > 0) {
      const existingAgent = existingAgents[0];

      // If already in this org, allow re-registration (update)
      if (existingAgent.organization_id === tokens.organization_id) {
        const { error: updateError } = await supabase
          .from('agents')
          .update({
            agent_public_key,
            name: machine_info?.hostname || existingAgent.name,
            status: 'registered',
            capabilities: machine_info?.capabilities || existingAgent.capabilities,
            location: machine_info?.location || existingAgent.location
          })
          .eq('agent_id', agent_id);

        if (updateError) {
          console.error('Update agent error:', updateError);
          return Response.json({ error: 'Failed to update agent' }, { status: 500 });
        }

        // Mark token as used
        await supabase
          .from('registration_tokens')
          .update({ status: 'used', used_by_agent_id: agent_id })
          .eq('id', tokens.id);

        return Response.json({
          success: true,
          org_id: tokens.organization_id,
          org_public_key: orgPublicKey,
          message: 'Agent re-registered successfully'
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Different org - require unregister first
      return Response.json({ 
        error: 'Agent already registered to another organization. Unregister first.' 
      }, { status: 409 });
    }
    
    // Get org public key from registration token (no Base44 dependency)
    const orgPublicKey = tokens.org_signing_public_key;

    if (!orgPublicKey) {
      return Response.json({ error: 'Invalid registration token configuration' }, { status: 500 });
    }
    
    // Register agent in Supabase
    const { error: insertError } = await supabase
      .from('agents')
      .insert({
        organization_id: tokens.organization_id,
        agent_id,
        agent_public_key,
        name: machine_info?.hostname || `Agent ${agent_id.substring(0, 8)}`,
        status: 'registered',
        capabilities: machine_info?.capabilities || ['scan'],
        location: machine_info?.location || ''
      });
    
    if (insertError) {
      console.error('Insert agent error:', insertError);
      return Response.json({ error: 'Failed to register agent' }, { status: 500 });
    }
    
    // Mark token as used
    await supabase
      .from('registration_tokens')
      .update({
        status: 'used',
        used_by_agent_id: agent_id
      })
      .eq('id', tokens.id);
    
    return Response.json({
      success: true,
      org_id: tokens.organization_id,
      org_public_key: orgPublicKey,
      message: 'Agent registered successfully'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Register agent error:', error);
    return Response.json({ error: error.message }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});