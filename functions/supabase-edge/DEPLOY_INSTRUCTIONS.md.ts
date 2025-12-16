# Deploy Supabase Edge Functions

These functions need to be deployed to Supabase to handle agent registration without Base44 authentication.

## Prerequisites

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

## Deploy Functions

Deploy all three functions:

```bash
# From your project root
supabase functions deploy exchange_registration_code --no-verify-jwt
supabase functions deploy register_agent --no-verify-jwt
supabase functions deploy agent_post_event --no-verify-jwt
```

The `--no-verify-jwt` flag is critical - it allows these functions to be called without Supabase auth.

## Set Environment Variables

These functions need access to your Supabase credentials:

```bash
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set SUPABASE_ANON_KEY=your_anon_key
```

## Function URLs

After deployment, your functions will be available at:
- `https://[your-project-ref].supabase.co/functions/v1/exchange-registration-code`
- `https://[your-project-ref].supabase.co/functions/v1/register-agent`
- `https://[your-project-ref].supabase.co/functions/v1/agent-post-event`

## Update createRegistrationToken

After deploying, update the `createRegistrationToken` function in your Base44 app to return the Supabase Edge Function URLs instead of Base44 URLs.