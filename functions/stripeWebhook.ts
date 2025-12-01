import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, stripe-signature'
      }
    });
  }

  // Stripe webhooks are always POST
  if (req.method !== 'POST') {
    console.log('Received non-POST request:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed', method: req.method }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return Response.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    console.log('Stripe event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { organization_id, plan, user_email } = session.metadata;

        if (!organization_id) break;

        // Fetch the full subscription to get period dates
        let periodStart = null;
        let periodEnd = null;
        if (session.subscription) {
          const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
          periodStart = new Date(stripeSubscription.current_period_start * 1000).toISOString();
          periodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString();
        }

        // Get or create subscription record
        const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
          organization_id: organization_id
        });

        const subData = {
          organization_id: organization_id,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          plan: plan || 'pro',
          status: 'active',
          current_period_start: periodStart,
          current_period_end: periodEnd
        };

        if (existingSubs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, subData);
        } else {
          await base44.asServiceRole.entities.Subscription.create(subData);
        }

        // Send payment confirmation email
        if (user_email) {
          const planNames = { pro: 'Pro', enterprise: 'Enterprise' };
          const planPrices = { pro: '$34.99', enterprise: '$71.99' };
          const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
          const orgName = orgs[0]?.name || 'Your Organization';

          const emailBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111827; border-radius: 16px; border: 1px solid #1f2937;">
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 50%; margin: 0 auto 16px;">
                  <span style="font-size: 28px; line-height: 64px;">✓</span>
                </div>
                <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Payment Confirmed!</h1>
              </div>
              
              <div style="color: #9ca3af; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                <p style="margin: 0 0 16px;">Thank you for upgrading <strong style="color: #ffffff;">${orgName}</strong> to the <strong style="color: #3b82f6;">${planNames[plan] || 'Pro'}</strong> plan!</p>
              </div>
              
              <div style="background-color: #1f2937; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
                <table width="100%" style="color: #9ca3af; font-size: 14px;">
                  <tr><td style="padding: 8px 0; border-bottom: 1px solid #374151;">Plan</td><td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #374151; color: #ffffff;">${planNames[plan] || 'Pro'}</td></tr>
                  <tr><td style="padding: 8px 0; border-bottom: 1px solid #374151;">Amount</td><td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #374151; color: #ffffff;">${planPrices[plan] || '$34.99'}/month</td></tr>
                  <tr><td style="padding: 8px 0;">Next billing date</td><td style="text-align: right; padding: 8px 0; color: #ffffff;">${periodEnd ? new Date(periodEnd).toLocaleDateString() : 'N/A'}</td></tr>
                </table>
              </div>
              
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="https://avsystemdesign.com/Billing" style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">Manage Subscription</a>
              </div>
              
              <div style="border-top: 1px solid #1f2937; padding-top: 24px; text-align: center;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">Questions? Reply to this email or contact support.</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `.trim();

          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: user_email,
              subject: `Payment confirmed - ${planNames[plan] || 'Pro'} plan activated`,
              body: emailBody
            });
          } catch (emailError) {
            console.error('Failed to send payment confirmation email:', emailError);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        const subs = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: subscription.id
        });

        if (subs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        const subs = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: subscription.id
        });

        if (subs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            status: 'canceled',
            plan: 'free'
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        
        const subs = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: invoice.subscription
        });

        if (subs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            status: 'past_due'
          });
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        
        // Reactivate subscription after successful payment
        if (invoice.subscription) {
          const subs = await base44.asServiceRole.entities.Subscription.filter({
            stripe_subscription_id: invoice.subscription
          });

          if (subs.length > 0 && subs[0].status === 'past_due') {
            await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
              status: 'active'
            });
          }
        }
        break;
      }
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
});