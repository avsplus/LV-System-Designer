import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY'));

const PLANS = {
  pro: {
    name: 'Pro',
    priceId: 'price_1SZSFrJ8yo3KQRY06ryB1cZo',
    mode: 'subscription'
  },
  enterprise: {
    name: 'Enterprise', 
    priceId: 'price_1SZSMfJ8yo3KQRY0ZEkIVBWF',
    mode: 'subscription'
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, successUrl, cancelUrl } = await req.json();

    if (!plan || !PLANS[plan]) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const planConfig = PLANS[plan];

    // Check for existing customer
    let customerId = null;
    const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
      organization_id: user.organization_id
    });

    if (existingSubs.length > 0 && existingSubs[0].stripe_customer_id) {
      customerId = existingSubs[0].stripe_customer_id;
    }

    // Create checkout session
    const sessionParams = {
      mode: planConfig.mode,
      line_items: [{
        price: planConfig.priceId,
        quantity: 1
      }],
      success_url: successUrl || 'https://avsystemdesign.com/Billing?success=true',
      cancel_url: cancelUrl || 'https://avsystemdesign.com/Billing?canceled=true',
      metadata: {
        organization_id: user.organization_id,
        user_id: user.id,
        user_email: user.email,
        plan: plan
      },
      customer_email: customerId ? undefined : user.email,
      customer: customerId || undefined
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return Response.json({ 
      url: session.url,
      sessionId: session.id 
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});