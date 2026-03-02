import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  FolderPlus, Edit, Monitor, Link2, Users, UserMinus, 
  Home, Trash2, Clock, Activity
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const actionIcons = {
  created_project: { icon: FolderPlus, color: "text-green-400", bg: "bg-green-500/20" },
  updated_project: { icon: Edit, color: "text-blue-400", bg: "bg-blue-500/20" },
  added_device: { icon: Monitor, color: "text-cyan-400", bg: "bg-cyan-500/20" },
  removed_device: { icon: Trash2, color: "text-red-400", bg: "bg-red-500/20" },
  added_connection: { icon: Link2, color: "text-purple-400", bg: "bg-purple-500/20" },
  removed_connection: { icon: Link2, color: "text-orange-400", bg: "bg-orange-500/20" },
  shared_project: { icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/20" },
  unshared_project: { icon: UserMinus, color: "text-yellow-400", bg: "bg-yellow-500/20" },
  added_room: { icon: Home, color: "text-emerald-400", bg: "bg-emerald-500/20" },
  removed_room: { icon: Trash2, color: "text-rose-400", bg: "bg-rose-500/20" },
};

const actionLabels = {
  created_project: "created project",
  updated_project: "updated project",
  added_device: "added device",
  removed_device: "removed device",
  added_connection: "added connection",
  removed_connection: "removed connection",
  shared_project: "shared project with",
  unshared_project: "removed access for",
  added_room: "added room",
  removed_room: "removed room",
};

function ActivityItem({ activity }) {
  const config = actionIcons[activity.action] || { icon: Activity, color: "text-gray-400", bg: "bg-gray-500/20" };
  const Icon = config.icon;
  
  const getDetailText = () => {
    const details = activity.details || {};
    switch (activity.action) {
      case 'added_device':
      case 'removed_device':
        return details.device_name ? `"${details.device_name}"` : '';
      case 'added_connection':
      case 'removed_connection':
        return details.connection_type ? `(${details.connection_type})` : '';
      case 'shared_project':
      case 'unshared_project':
        return details.shared_with || '';
      case 'added_room':
      case 'removed_room':
        return details.room_name ? `"${details.room_name}"` : '';
      default:
        return '';
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-gray-800/50 rounded-lg transition-colors">
      <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-300">
          <span className="font-medium text-white">
            {activity.user_name || activity.user_email?.split('@')[0]}
          </span>
          {' '}{actionLabels[activity.action]}{' '}
          <span className="text-gray-400">{getDetailText()}</span>
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-blue-400 font-medium truncate">
            {activity.project_name}
          </span>
          <span className="text-xs text-gray-500">•</span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {(() => {
              // Ensure the date is parsed as UTC
              let dateStr = activity.created_date;
              if (dateStr && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
                dateStr = dateStr + 'Z';
              }
              const date = new Date(dateStr);
              // Prevent future dates from showing "in X hours"
              const now = new Date();
              const safeDate = date > now ? now : date;
              return formatDistanceToNow(safeDate, { addSuffix: true });
            })()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ActivityFeed({ userEmail, limit = 20, projectIds = null }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities', userEmail, projectIds],
    queryFn: async () => {
      const allActivities = await base44.entities.Activity.list('-created_date', limit * 2);
      
      // Filter activities for projects user has access to
      if (projectIds) {
        return allActivities.filter(a => projectIds.includes(a.project_id)).slice(0, limit);
      }
      
      // Get user's projects to filter activities
      const [ownProjects, allProjects] = await Promise.all([
        base44.entities.AVProject.filter({ owner_email: userEmail }),
        base44.entities.AVProject.list()
      ]);
      
      const sharedProjects = allProjects.filter(p => p.shared_with?.includes(userEmail));
      const accessibleProjectIds = new Set([
        ...ownProjects.map(p => p.id),
        ...sharedProjects.map(p => p.id)
      ]);
      
      return allActivities
        .filter(a => accessibleProjectIds.has(a.project_id))
        .slice(0, limit);
    },
    enabled: !!userEmail,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}