import React from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { Button } from "@/components/ui/button";
import { Crown, Zap } from "lucide-react";

export default function UpgradePrompt({ 
  title = "Upgrade Required",
  message = "This feature requires a paid plan.",
  feature,
  inline = false 
}) {
  if (inline) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Zap className="w-4 h-4 text-yellow-500" />
        <span className="text-gray-400">{message}</span>
        <Link to={createPageUrl("Billing")}>
          <Button size="sm" variant="outline" className="h-7 text-xs border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10">
            Upgrade
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
        <Crown className="w-6 h-6 text-yellow-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 mb-4">{message}</p>
      {feature && (
        <p className="text-sm text-yellow-500/80 mb-4">
          Feature: <span className="font-medium">{feature}</span>
        </p>
      )}
      <Link to={createPageUrl("Billing")}>
        <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
          <Crown className="w-4 h-4 mr-2" />
          View Plans
        </Button>
      </Link>
    </div>
  );
}