import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { returnUrl } = await req.json();

    // Get subscription to find customer ID
    const subs = await base44.asServiceRole.entities.Subscription.filter({
      organization_id: user.organization_id
    });

    if (subs.length === 0 || !subs[0].stripe_customer_id) {
      return Response.json({ error: 'No subscription found' }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subs[0].stripe_customer_id,
      return_url: returnUrl || 'https://avsystemdesign.com/Billing'
    });

    return Response.json({ url: session.url });

  } catch (error) {
    console.error('Portal session error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});