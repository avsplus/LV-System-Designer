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
import VideoTutorialsDialog from "../components/VideoTutorialsDialog";

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

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(null);
  const [showTutorials, setShowTutorials] = React.useState(false);

  React.useEffect(() => {
    base44.auth.isAuthenticated().then(async (authenticated) => {
      setIsAuthenticated(authenticated);
      if (authenticated) {
        // Redirect authenticated users to the canvas
        window.location.href = '/AVCanvas';
      }
    });
  }, []);

  const handleGetStarted = () => {
    base44.auth.redirectToLogin('/AVCanvas');
  };

  // Show nothing while checking auth to avoid flash
  if (isAuthenticated === null) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/5c0da9ba6_AVSystemDesignLogoSponsor.png" 
              alt="AV System Design Logo" 
              className="h-8 sm:h-10 w-auto"
            />
          </div>
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
            <a href="#features" className="text-gray-400 hover:text-white transition-colors hidden md:block text-xs sm:text-sm">Features</a>
            <a href="#pricing" className="text-gray-400 hover:text-white transition-colors hidden md:block text-xs sm:text-sm">Pricing</a>
            <Button onClick={handleGetStarted} variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800 text-xs sm:text-sm px-2 sm:px-3 hidden sm:inline-flex h-8 sm:h-9">
              Sign In
            </Button>
            <Button onClick={handleGetStarted} className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-9">
              <span className="hidden sm:inline">Start Free</span>
              <span className="sm:hidden">Try</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 sm:pt-24 md:pt-32 pb-8 sm:pb-12 md:pb-20 px-3 sm:px-4 md:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 mb-3 sm:mb-4 md:mb-6 text-[10px] sm:text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            Professional AV Design Tool
          </Badge>
          
          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-bold mb-3 sm:mb-4 md:mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent leading-tight">
            Professional AV<br />System Design Software
          </h1>
          
          <p className="text-sm sm:text-base md:text-xl text-gray-400 max-w-2xl mx-auto mb-6 sm:mb-8 md:mb-10 px-3 sm:px-4">
             Built for AV integrators, system designers, and low voltage installation professionals. 
             Design, document, and deliver stunning AV systems with drag-and-drop simplicity.
           </p>

           <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 justify-center px-3 sm:px-4">
             <Button 
               onClick={handleGetStarted}
               className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-6 h-10 sm:h-11 md:h-12"
             >
               Start Free
               <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ml-1.5 sm:ml-2" />
             </Button>
             <Button 
               variant="outline"
               className="border-gray-700 text-gray-300 hover:bg-gray-800 text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-6 h-10 sm:h-11 md:h-12"
               onClick={() => setShowTutorials(true)}
             >
               <Play className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2" />
               <span className="hidden sm:inline">See How</span>
               <span className="sm:hidden">Demo</span>
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
              <div className="aspect-video bg-gray-900 overflow-hidden">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/ea3705890_image.png"
                  alt="Sample AV System Design Project"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-8 sm:py-12 md:py-20 px-3 sm:px-4 md:px-6 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-10 md:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold mb-2 sm:mb-3 md:mb-4">Everything You Need</h2>
            <p className="text-gray-400 text-xs sm:text-sm md:text-lg max-w-2xl mx-auto px-3 sm:px-4">
              Powerful features designed specifically for AV professionals and integrators.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
             {FEATURES.map((feature, i) => (
               <div 
                 key={i}
                 className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 hover:border-gray-700 transition-colors"
               >
                 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3 sm:mb-4">
                   <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                 </div>
                 <h3 className="text-sm sm:text-lg font-semibold mb-2">{feature.title}</h3>
                 <p className="text-gray-400 text-xs sm:text-sm">{feature.description}</p>
               </div>
             ))}
           </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-8 sm:py-12 md:py-20 px-3 sm:px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 md:mb-6">
                Save Hours on Every Project
              </h2>
              <p className="text-gray-400 text-sm sm:text-base md:text-lg mb-4 sm:mb-6 md:mb-8">
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
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 md:p-8">
              <div className="space-y-3 sm:space-y-4">
                 {['Living Room', 'Media Room', 'Outdoor'].map((room, i) => (
                   <div key={i} className="bg-gray-800 rounded-lg p-3 sm:p-4 flex items-center justify-between gap-2">
                     <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                       <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                         <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                       </div>
                       <div className="min-w-0">
                         <p className="text-sm sm:text-base font-medium truncate">{room}</p>
                         <p className="text-xs sm:text-sm text-gray-500">{3 + i * 2} devices</p>
                       </div>
                     </div>
                     <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                   </div>
                 ))}
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-8 sm:py-12 md:py-20 px-3 sm:px-4 md:px-6 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-10 md:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold mb-2 sm:mb-3 md:mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-400 text-xs sm:text-sm md:text-lg">Start free, upgrade when you need more.</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan, i) => (
              <div 
                key={i}
                className={`relative bg-gray-900 border rounded-xl p-4 sm:p-6 ${
                    plan.popular ? 'border-blue-500' : 'border-gray-800'
                  }`}
                  >
                  {plan.popular && (
                    <div className="absolute -top-2 sm:-top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-blue-500 text-white text-xs">Most Popular</Badge>
                    </div>
                  )}

                  <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-3 sm:mb-4">
                    <span className="text-2xl sm:text-3xl font-bold">{plan.price}</span>
                    <span className="text-gray-400 text-xs sm:text-sm">{plan.period}</span>
                  </div>

                  <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
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
      <section className="py-8 sm:py-12 md:py-20 px-3 sm:px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-4 sm:p-6 md:p-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 md:mb-4">Ready to Transform Your Workflow?</h2>
            <p className="text-gray-400 text-xs sm:text-sm md:text-lg mb-4 sm:mb-6 md:mb-8">
              Join AV professionals who are designing better systems, faster.
            </p>
            <Button 
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-6 h-10 sm:h-11 md:h-12"
            >
              Start Free
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ml-1.5 sm:ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 sm:py-12 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
           <div className="flex items-center gap-2 sm:gap-3">
             <img 
               src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69220e1df953a2fd292e8b12/5c0da9ba6_AVSystemDesignLogoSponsor.png" 
               alt="AV System Design Logo" 
               className="h-6 sm:h-8 w-auto"
             />
           </div>
           <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-xs sm:text-sm text-gray-400">
             <a href="mailto:support@avsystemdesign.com" className="hover:text-white transition-colors">Support</a>
             <span>© {new Date().getFullYear()} AV System Design</span>
           </div>
         </div>
      </footer>

      <VideoTutorialsDialog open={showTutorials} onOpenChange={setShowTutorials} />
    </div>
  );
}