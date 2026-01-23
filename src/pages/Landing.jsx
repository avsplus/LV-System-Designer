import React from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, Check, ArrowRight, Monitor, Cable, FileText, 
  Users, Shield, Sparkles, Play, ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

const FEATURES = [
  {
    icon: Monitor,
    title: "Interactive Canvas Design",
    description: "Drag-and-drop AV equipment onto an infinite canvas with drag-and-drop. See your entire system at a glance."
  },
  {
    icon: Cable,
    title: "Comprehensive Product Library",
    description: "Access 1000+ devices from top AV brands. Pre-configured with real specifications and connections."
  },
  {
    icon: FileText,
    title: "Automated Wire Management & Pricing",
    description: "Intelligent routing with automatic wire IDs, cable scheduling, and real-time cost calculations."
  },
  {
    icon: Users,
    title: "Professional PDF Proposals",
    description: "Export client proposals, installer documentation, and system diagrams in a few clicks."
  }
];

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['Up to 3 projects', 'Limited device library', '12 PDF exports/day'],
    color: 'gray'
  },
  {
    name: 'Pro',
    price: '$34.99',
    period: '/month',
    features: ['Up to 25 projects', 'Full device library', '48 PDF exports/day', 'Custom branding'],
    color: 'blue',
    popular: true
  },
  {
    name: 'Enterprise',
    price: '$71.99',
    period: '/month',
    features: ['Unlimited projects', 'Unlimited exports', 'Priority support', 'SLA guarantee'],
    color: 'purple'
  }
];

export default function Landing() {
  const handleGetStarted = () => {
    base44.auth.redirectToLogin('/AVCanvas');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">AV System Design</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-gray-400 hover:text-white transition-colors hidden sm:block">Features</a>
            <a href="#pricing" className="text-gray-400 hover:text-white transition-colors hidden sm:block">Pricing</a>
            <Button onClick={handleGetStarted} variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
              Sign In
            </Button>
            <Button onClick={handleGetStarted} className="bg-blue-600 hover:bg-blue-700">
              Start Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 mb-6">
            <Sparkles className="w-3 h-3 mr-1" />
            Professional AV Design Tool
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
            Professional AV<br />System Design Software
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Built for AV integrators, system designers, and low voltage installation professionals. 
            Design, document, and deliver stunning AV systems with drag-and-drop simplicity.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6"
            >
              Start Designing Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 text-lg px-8 py-6"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Play className="w-5 h-5 mr-2" />
              See How It Works
            </Button>
          </div>

          {/* Hero Image/Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/10">
              <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-4 text-sm text-gray-400">AV System Design - Living Room Project</span>
              </div>
              <div className="aspect-video bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
                <div className="grid grid-cols-3 gap-8 p-12 opacity-60">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="w-32 h-24 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center">
                      <Monitor className="w-8 h-8 text-gray-600" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Powerful features designed specifically for AV professionals and integrators.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <div 
                key={i}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Save Hours on Every Project
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Stop wrestling with generic drawing tools. AV System Design is purpose-built 
                for audio-visual professionals, with device libraries, smart connections, 
                and instant documentation.
              </p>
              <ul className="space-y-4">
                {[
                  '1000+ pre-configured AV devices from top brands',
                  'Automatic wire scheduling and pricing calculations',
                  'Export professional PDFs in seconds',
                  'Room-based organization for multi-zone projects',
                  'Network mapping and real-time agent monitoring'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-green-400" />
                    </div>
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
              <div className="space-y-4">
                {['Living Room', 'Media Room', 'Outdoor'].map((room, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">{room}</p>
                        <p className="text-sm text-gray-500">{3 + i * 2} devices</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-400 text-lg">Start free, upgrade when you need more.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan, i) => (
              <div 
                key={i}
                className={`relative bg-gray-900 border rounded-xl p-6 ${
                  plan.popular ? 'border-blue-500' : 'border-gray-800'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                  </div>
                )}
                
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-gray-400">{plan.period}</span>
                </div>
                
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${
                    plan.popular ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                  onClick={handleGetStarted}
                >
                  Get Started
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-12">
            <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Workflow?</h2>
            <p className="text-gray-400 text-lg mb-8">
              Join AV professionals who are designing better systems, faster.
            </p>
            <Button 
              size="lg"
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6"
            >
              Start Your Free Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">AV System Design</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="mailto:support@avsystemdesign.com" className="hover:text-white transition-colors">Support</a>
            <span>© {new Date().getFullYear()} AV System Design</span>
          </div>
        </div>
      </footer>
    </div>
  );
}