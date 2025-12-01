
import { base44 } from "@/api/base44Client";

export async function trackActivity(action, projectId, projectName, details = {}, organizationId = null) {
  try {
    const user = await base44.auth.me();
    await base44.entities.Activity.create({
      organization_id: organizationId || user.organization_id,
      project_id: projectId,
      project_name: projectName,
      user_email: user.email,
      user_name: user.display_name || user.full_name || user.email.split('@')[0],
      action,
      details
    });
  } catch (error) {
    console.error('Failed to track activity:', error);
  }
}

export const ActivityActions = {
  CREATED_PROJECT: 'created_project',
  UPDATED_PROJECT: 'updated_project',
  ADDED_DEVICE: 'added_device',
  REMOVED_DEVICE: 'removed_device',
  ADDED_CONNECTION: 'added_connection',
  REMOVED_CONNECTION: 'removED_connection',
  SHARED_PROJECT: 'shared_project',
  UNSHARED_PROJECT: 'unshared_project',
  ADDED_ROOM: 'added_room',
  REMOVED_ROOM: 'removed_room',
};
