import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
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
          org_public_key: org.org_signing_public_key,
          message: 'Agent re-registered successfully'
        });
      }

      // Different org - require unregister first
      return Response.json({ 
        error: 'Agent already registered to another organization. Unregister first.' 
      }, { status: 409 });
    }
    
    // Get organization public key from Base44 (without auth since this is called by external agent)
    const baseUrl = new URL(req.url);
    const base44Url = `${baseUrl.protocol}//${baseUrl.host}`;
    const appId = Deno.env.get('BASE44_APP_ID');

    const orgResponse = await fetch(`${base44Url}/api/data/Organization/${tokens.organization_id}`, {
      headers: {
        'Base44-App-Id': appId
      }
    });

    if (!orgResponse.ok) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const org = await orgResponse.json();
    
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
      org_public_key: org.org_signing_public_key,
      message: 'Agent registered successfully'
    });
  } catch (error) {
    console.error('Register agent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});