import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const results = {
            supabase_url: supabaseUrl,
            tests: []
        };

        // Test each edge function
        const functions = [
            'exchange-registration-code',
            'register-agent', 
            'agent-post-event'
        ];

        for (const funcName of functions) {
            const url = `${supabaseUrl}/functions/v1/${funcName}`;
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ test: true })
                });
                
                const text = await response.text();
                results.tests.push({
                    function: funcName,
                    url,
                    status: response.status,
                    response: text,
                    exists: response.status !== 404
                });
            } catch (error) {
                results.tests.push({
                    function: funcName,
                    url,
                    error: error.message,
                    exists: false
                });
            }
        }

        return Response.json(results);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});