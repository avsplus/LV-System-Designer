import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Supabase config
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get unprocessed scan results
    const { data: scanResults, error: scanError } = await supabase
      .from('agent_scan_results')
      .select('*')
      .is('processed', null)
      .order('created_date', { ascending: true })
      .limit(100);

    if (scanError) throw scanError;

    let processed = 0;
    let created = 0;
    let updated = 0;

    for (const scanResult of scanResults || []) {
      try {
        // Parse result
        let result = scanResult.result;
        if (typeof result === 'string') {
          result = JSON.parse(result);
        }

        const hosts = result?.hosts || [];

        // Get existing devices for this organization
        const { data: existingDevices } = await supabase
          .from('devices')
          .select('*')
          .eq('organization_id', scanResult.organization_id);

        // Get device name mappings
        const nameMappings = await base44.entities.DeviceNameMapping.filter({ 
          organization_id: scanResult.organization_id 
        });

        // Process each discovered host
        for (const host of hosts) {
          if (!host.mac_address) continue;

          const normalizedMac = host.mac_address.toLowerCase().replace(/[:-]/g, '');
          
          // Find existing device
          const existingDevice = existingDevices?.find(d => {
            const deviceMac = d.mac_address?.toLowerCase().replace(/[:-]/g, '');
            return deviceMac === normalizedMac;
          });

          // Check for custom name
          const nameMapping = nameMappings.find(m => {
            const mappingMac = m.mac_address?.toLowerCase().replace(/[:-]/g, '');
            return mappingMac === normalizedMac;
          });

          if (existingDevice) {
            // Update existing device
            const updateData = {
              status: 'online',
              vendor: host.vendor,
              ip_address: host.ip_address,
              device_type: host.device_type,
              open_ports: host.open_ports || [],
              agent_id: scanResult.agent_id,
              updated_date: new Date().toISOString()
            };

            // Restore custom name if exists
            if (nameMapping?.custom_name) {
              updateData.name = nameMapping.custom_name;
            }

            await supabase
              .from('devices')
              .update(updateData)
              .eq('id', existingDevice.id);

            updated++;
          } else {
            // Create new device
            const deviceName = nameMapping?.custom_name || host.hostname || host.ip_address;

            await supabase
              .from('devices')
              .insert({
                organization_id: scanResult.organization_id,
                agent_id: scanResult.agent_id,
                name: deviceName,
                type: 'other',
                device_type: host.device_type,
                ip_address: host.ip_address,
                mac_address: host.mac_address,
                vendor: host.vendor,
                status: 'online',
                connected_to: [],
                open_ports: host.open_ports || [],
                created_date: new Date().toISOString(),
                updated_date: new Date().toISOString(),
                created_by: user.email
              });

            created++;
          }
        }

        // Mark scan result as processed
        await supabase
          .from('agent_scan_results')
          .update({ processed: true, processed_date: new Date().toISOString() })
          .eq('id', scanResult.id);

        processed++;
      } catch (error) {
        console.error('Error processing scan result:', scanResult.id, error);
      }
    }

    return Response.json({
      success: true,
      processed,
      created,
      updated
    });
  } catch (error) {
    console.error('processScanResults error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});