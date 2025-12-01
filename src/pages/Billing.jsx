import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, Check, Zap, Building2, Crown, 
  Loader2, CreditCard, ExternalLink, AlertCircle
} from "lucide-react";
import { useOrganization } from "../components/auth/useOrganization";
import { toast } from "sonner";

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For individuals getting started',
    features: [
      'Up to 3 projects',
      'Limited device library (5 per category)',
      '12 PDF exports per day',
      'No support'
    ],
    icon: Zap,
    color: 'gray'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$34.99',
    period: '/month',
    description: 'For growing teams with advanced needs',
    features: [
      'Up to 25 projects',
      'Full device library',
      '48 PDF exports per day',
      'Standard support',
      'Custom branding'
    ],
    icon: Building2,
    color: 'blue',
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$71.99',
    period: '/month',
    description: 'For large organizations with custom requirements',
    features: [
      'Unlimited projects',
      'Full device library',
      'Unlimited PDF exports',
      'Live support',
      'SLA guarantee'
    ],
    icon: Crown,
    color: 'purple'
  }
];

export default function Billing() {
  const { organizationId, isLoading: orgLoading } = useOrganization();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  // Check URL params for success/cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success('Subscription activated successfully!');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('canceled') === 'true') {
      toast.info('Checkout canceled');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const { data: subscription, isLoading: subLoading, refetch } = useQuery({
    queryKey: ['subscription', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const subs = await base44.entities.Subscription.filter({ organization_id: organizationId });
      return subs[0] || null;
    },
    enabled: !!organizationId
  });

  const currentPlan = subscription?.plan || 'free';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  const handleSubscribe = async (planId) => {
    if (planId === 'free') return;
    
    setLoadingPlan(planId);
    try {
      const response = await base44.functions.invoke('createCheckout', {
        plan: planId,
        successUrl: window.location.origin + '/Billing?success=true',
        cancelUrl: window.location.origin + '/Billing?canceled=true'
      });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        toast.error('Failed to create checkout session');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to start checkout');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const response = await base44.functions.invoke('createPortalSession', {
        returnUrl: window.location.href
      });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        toast.error('Failed to open billing portal');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to open billing portal');
    } finally {
      setLoadingPortal(false);
    }
  };

  if (orgLoading || subLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("AVCanvas")}>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Billing & Plans</h1>
              <p className="text-sm text-gray-400">Manage your subscription</p>
            </div>
          </div>
          
          {subscription?.stripe_customer_id && (
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
              onClick={handleManageSubscription}
              disabled={loadingPortal}
            >
              {loadingPortal ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Manage Billing
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Current Plan Status */}
        {subscription && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium mb-1">Current Plan</h3>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-white capitalize">{currentPlan}</span>
                  <Badge className={
                    subscription.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    subscription.status === 'past_due' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  }>
                    {subscription.status}
                  </Badge>
                </div>
              </div>
              
              {subscription.current_period_end && (
                <div className="text-right">
                  <p className="text-sm text-gray-400">
                    {subscription.cancel_at_period_end ? 'Cancels on' : 'Renews on'}
                  </p>
                  <p className="text-white font-medium">
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            
            {subscription.cancel_at_period_end && (
              <div className="mt-4 flex items-center gap-2 text-yellow-400 bg-yellow-500/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Your subscription will be canceled at the end of the billing period</span>
              </div>
            )}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = currentPlan === plan.id && isActive;
            const isUpgrade = plan.id !== 'free' && (currentPlan === 'free' || 
              (currentPlan === 'pro' && plan.id === 'enterprise'));
            
            return (
              <div
                key={plan.id}
                className={`relative bg-gray-900 border rounded-xl p-6 flex flex-col ${
                  plan.popular ? 'border-blue-500' : 'border-gray-800'
                } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                  </div>
                )}
                
                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-green-500 text-white">Current Plan</Badge>
                  </div>
                )}

                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  plan.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                  plan.color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-gray-700 text-gray-400'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400">{plan.period}</span>
                </div>
                <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                <Button
                  className={`w-full ${
                    isCurrent ? 'bg-gray-700 text-gray-400 cursor-default' :
                    plan.id === 'free' ? 'bg-gray-700 hover:bg-gray-600' :
                    plan.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                    'bg-purple-600 hover:bg-purple-700'
                  }`}
                  disabled={isCurrent || loadingPlan === plan.id}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {loadingPlan === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : plan.id === 'free' ? (
                    'Free Forever'
                  ) : isUpgrade ? (
                    'Upgrade'
                  ) : (
                    'Subscribe'
                  )}
                </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ or Contact */}
        <div className="mt-12 text-center">
          <p className="text-gray-400">
            Need a custom plan or have questions?{' '}
            <a href="mailto:support@avsystemdesign.com" className="text-blue-400 hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}