import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { appClient } from "@/api/appClient";
import { useOrganization } from "../auth/useOrganization";
import { useSubscription, PLAN_LIMITS } from "./useSubscription";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { FolderOpen, FileText, Box, Zap, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function UsageStats({ compact = false }) {
  const { organizationId } = useOrganization();
  const { currentPlan, limits, isFree } = useSubscription();

  // Fetch project count
  const { data: projects = [] } = useQuery({
    queryKey: ['projectCount', organizationId],
    queryFn: async () => {
      const { user } = await appClient.getMe();
      return base44.entities.AVProject.filter({ 
        owner_email: user.email,
        organization_id: organizationId 
      });
    },
    enabled: !!organizationId
  });

  // Fetch today's PDF exports
  const { data: todayExports = [] } = useQuery({
    queryKey: ['todayExports', organizationId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const exports = await base44.entities.PdfExport.filter({ 
        organization_id: organizationId 
      });
      return exports.filter(exp => new Date(exp.created_date) >= today);
    },
    enabled: !!organizationId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch device counts per category
  const { data: products = [] } = useQuery({
    queryKey: ['productCounts', organizationId],
    queryFn: async () => {
      const allProducts = await appClient.listProducts({ include_global: true });
      return allProducts.filter((p) => p.organization_id === organizationId);
    },
    enabled: !!organizationId
  });

  const projectCount = projects.length;
  const exportCount = todayExports.length;
  const maxProjects = limits.maxProjects === Infinity ? '∞' : limits.maxProjects;
  const maxExports = limits.maxPdfExportsPerDay === Infinity ? '∞' : limits.maxPdfExportsPerDay;

  const projectPercent = limits.maxProjects === Infinity ? 0 : (projectCount / limits.maxProjects) * 100;
  const exportPercent = limits.maxPdfExportsPerDay === Infinity ? 0 : (exportCount / limits.maxPdfExportsPerDay) * 100;

  // Get category with most devices for free tier warning
  const categoryCounts = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  const maxCategoryCount = Math.max(...Object.values(categoryCounts), 0);
  const categoriesAtLimit = isFree ? Object.entries(categoryCounts).filter(([_, count]) => count >= 5).length : 0;

  if (compact) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Plan Usage</span>
          <span className="text-xs font-medium text-gray-300 capitalize">{currentPlan}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-3 h-3 text-blue-400" />
            <div className="flex-1">
              <Progress value={projectPercent} className="h-1.5" />
            </div>
            <span className="text-xs text-gray-400">{projectCount}/{maxProjects}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-3 h-3 text-green-400" />
            <div className="flex-1">
              <Progress value={exportPercent} className="h-1.5" />
            </div>
            <span className="text-xs text-gray-400">{exportCount}/{maxExports}</span>
          </div>
          {isFree && categoriesAtLimit > 0 && (
            <div className="flex items-center gap-2">
              <Box className="w-3 h-3 text-orange-400" />
              <span className="text-xs text-orange-400">{categoriesAtLimit} categories at limit</span>
            </div>
          )}
        </div>
        {isFree && (projectPercent >= 80 || exportPercent >= 80) && (
          <Link 
            to={createPageUrl("Billing")} 
            className="mt-2 flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300"
          >
            <Zap className="w-3 h-3" />
            Upgrade for more
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Usage</h3>
        <span className="text-sm font-medium text-gray-400 capitalize">{currentPlan} Plan</span>
      </div>

      <div className="space-y-4">
        {/* Projects */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">Projects</span>
            </div>
            <span className="text-sm text-gray-400">
              {projectCount} / {maxProjects}
            </span>
          </div>
          <Progress 
            value={projectPercent} 
            className={`h-2 ${projectPercent >= 90 ? '[&>div]:bg-red-500' : projectPercent >= 70 ? '[&>div]:bg-yellow-500' : ''}`} 
          />
          {isFree && projectPercent >= 100 && (
            <p className="text-xs text-red-400 mt-1">Project limit reached</p>
          )}
        </div>

        {/* PDF Exports */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">PDF Exports Today</span>
            </div>
            <span className="text-sm text-gray-400">
              {exportCount} / {maxExports}
            </span>
          </div>
          <Progress 
            value={exportPercent} 
            className={`h-2 ${exportPercent >= 90 ? '[&>div]:bg-red-500' : exportPercent >= 70 ? '[&>div]:bg-yellow-500' : ''}`} 
          />
          {limits.maxPdfExportsPerDay !== Infinity && exportPercent >= 100 && (
            <p className="text-xs text-red-400 mt-1">Daily export limit reached</p>
          )}
        </div>

        {/* Device Library */}
        {isFree && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-gray-300">Device Library</span>
              </div>
              <span className="text-sm text-gray-400">5 per category</span>
            </div>
            {categoriesAtLimit > 0 ? (
              <p className="text-xs text-orange-400">
                {categoriesAtLimit} {categoriesAtLimit === 1 ? 'category' : 'categories'} at limit
              </p>
            ) : (
              <p className="text-xs text-gray-500">Limited to 5 devices per category</p>
            )}
          </div>
        )}
      </div>

      {isFree && (
        <Link to={createPageUrl("Billing")}>
          <div className="mt-4 p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30 hover:border-blue-500/50 transition-all cursor-pointer">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">Upgrade to Pro</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Get 25 projects, unlimited devices, and 48 daily exports
            </p>
          </div>
        </Link>
      )}
    </div>
  );
}
