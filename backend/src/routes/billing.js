import Stripe from 'stripe';
import { config, requireConfig } from '../config.js';
import { requireAuth } from '../lib/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';

requireConfig('STRIPE_API_KEY', config.stripeApiKey);

const stripe = new Stripe(config.stripeApiKey);

const getPlanConfig = () => {
  const plans = {
    pro: {
      name: 'Pro',
      priceId: config.stripePricePro
    },
    enterprise: {
      name: 'Enterprise',
      priceId: config.stripePriceEnterprise
    }
  };
  return plans;
};

const getSubscriptionByOrgId = async (organizationId) => {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('organization_id', organizationId)
    .limit(1);

  if (error) {
    throw new Error(`Failed to load subscription: ${error.message}`);
  }

  return data?.[0] || null;
};

const upsertSubscriptionByStripeId = async (stripeSubscriptionId, update) => {
  const { data: existing, error: findError } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .limit(1);

  if (findError) {
    throw new Error(`Failed to find subscription by stripe id: ${findError.message}`);
  }

  if (existing?.length) {
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update(update)
      .eq('id', existing[0].id);

    if (updateError) {
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }
    return;
  }

  const { error: createError } = await supabaseAdmin
    .from('subscriptions')
    .insert(update);

  if (createError) {
    throw new Error(`Failed to create subscription: ${createError.message}`);
  }
};

export default async function billingRoutes(fastify) {
  fastify.get('/billing/subscription', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    const organizationId = auth.user.organization_id;
    if (!organizationId) {
      return { subscription: null };
    }

    const subscription = await getSubscriptionByOrgId(organizationId);
    return { subscription };
  });

  fastify.post('/billing/checkout-session', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    const { plan, successUrl, cancelUrl } = request.body || {};
    const plans = getPlanConfig();
    const selected = plans[plan];

    if (!selected) {
      return reply.code(400).send({ error: 'Invalid plan' });
    }

    if (!selected.priceId) {
      return reply.code(500).send({ error: `Missing Stripe price id for plan ${plan}` });
    }

    if (!auth.user.organization_id) {
      return reply.code(400).send({ error: 'User must belong to an organization' });
    }

    const currentSubscription = await getSubscriptionByOrgId(auth.user.organization_id);
    const customerId = currentSubscription?.stripe_customer_id || null;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: selected.priceId, quantity: 1 }],
      success_url: successUrl || `${config.appBaseUrl}/Billing?success=true`,
      cancel_url: cancelUrl || `${config.appBaseUrl}/Billing?canceled=true`,
      metadata: {
        organization_id: auth.user.organization_id,
        user_id: auth.user.id,
        user_email: auth.user.email,
        plan
      },
      subscription_data: {
        metadata: {
          organization_id: auth.user.organization_id,
          plan
        }
      },
      customer: customerId || undefined,
      customer_email: customerId ? undefined : auth.user.email
    });

    return { url: session.url, sessionId: session.id };
  });

  fastify.post('/billing/portal-session', async (request, reply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

    if (!auth.user.organization_id) {
      return reply.code(400).send({ error: 'User must belong to an organization' });
    }

    const { returnUrl } = request.body || {};
    const subscription = await getSubscriptionByOrgId(auth.user.organization_id);
    if (!subscription?.stripe_customer_id) {
      return reply.code(404).send({ error: 'No Stripe customer found for organization' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl || `${config.appBaseUrl}/Billing`
    });

    return { url: session.url };
  });

  fastify.post('/billing/webhook', async (request, reply) => {
    requireConfig('STRIPE_WEBHOOK_SECRET', config.stripeWebhookSecret);

    const signature = request.headers['stripe-signature'];
    if (!signature) {
      return reply.code(400).send({ error: 'Missing stripe-signature header' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(request.rawBody, signature, config.stripeWebhookSecret);
    } catch (error) {
      return reply.code(400).send({ error: `Invalid webhook signature: ${error.message}` });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const organizationId = session.metadata?.organization_id;
          const plan = session.metadata?.plan || 'pro';

          if (!organizationId) {
            break;
          }

          let periodStart = null;
          let periodEnd = null;
          if (session.subscription) {
            const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
            periodStart = new Date(stripeSubscription.current_period_start * 1000).toISOString();
            periodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString();
          }

          const payload = {
            organization_id: organizationId,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            plan,
            status: 'active',
            current_period_start: periodStart,
            current_period_end: periodEnd
          };

          const existing = await getSubscriptionByOrgId(organizationId);
          if (existing?.id) {
            const { error } = await supabaseAdmin
              .from('subscriptions')
              .update(payload)
              .eq('id', existing.id);
            if (error) {
              throw new Error(`Failed to update subscription on checkout complete: ${error.message}`);
            }
          } else {
            const { error } = await supabaseAdmin.from('subscriptions').insert(payload);
            if (error) {
              throw new Error(`Failed to create subscription on checkout complete: ${error.message}`);
            }
          }
          break;
        }
        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          await upsertSubscriptionByStripeId(subscription.id, {
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          });
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          await upsertSubscriptionByStripeId(subscription.id, {
            status: 'canceled',
            plan: 'free'
          });
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          if (invoice.subscription) {
            await upsertSubscriptionByStripeId(invoice.subscription, {
              status: 'past_due'
            });
          }
          break;
        }
        case 'invoice.paid': {
          const invoice = event.data.object;
          if (invoice.subscription) {
            await upsertSubscriptionByStripeId(invoice.subscription, {
              status: 'active'
            });
          }
          break;
        }
        default:
          break;
      }

      return { received: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });
}

