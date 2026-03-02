# Base44 Exit Migration Checklist (Code-Derived)

This checklist is based on the current code in this repository, not a generic template.

## 1) Migration Scope Inventory

## Frontend Base44 usage (from `src/`)
- `base44.entities.*` used for:
  - `AVProject`, `AVProduct`, `Organization`, `User`, `Subscription`
  - `WirePricing`, `PendingInvite`, `Activity`, `ProjectPresence`
  - `Network`, `DeviceNameMapping`, `PdfExport`
- `base44.functions.invoke(...)` directly used by UI:
  - `acceptInvitation`
  - `apiTemplateService`
  - `cleanupConnections`
  - `createCheckout`
  - `createOrganization`
  - `createPortalSession`
  - `createRegistrationToken`
  - `deleteUserAccount`
  - `enrichProductConnectionsV2`
  - `exportCanvasToPDF`
  - `exportUserData`
  - `generateUnregisterToken`
  - `getAgentInstallerUrl`
  - `getOrganizationUsers`
  - `getSupabaseConfig`
  - `getYouTubeVideos`
  - `migrateToOrganization`
  - `scrapeSnapAV`
  - `sendAgentCommand`
  - `sendInviteEmail`
  - `toggleAgentMonitoring`
  - `uploadToSupabase`
- Auth methods used by UI:
  - `base44.auth.me()`, `isAuthenticated()`, `updateMe()`, `logout()`, `redirectToLogin()`

## Backend function surface (from `functions/*.ts`)
- 63 function files.
- Highest-impact functions by size/complexity:
  - `exportCanvasToPDF.ts`
  - `apiTemplateService.ts`
  - `enrichProductConnectionsV2.ts`
  - `scrapeSnapAV.ts`
  - `stripeWebhook.ts`

## 2) Target Data Model (Minimum Needed to Match Current Behavior)

## Core tables
- `users`
  - `id`, `email`, `full_name`, `status`
  - `organization_id`, `organization_role`
  - plus identity-provider linkage columns
- `organizations`
  - `id`, `name`
  - `logo_url`, brand/settings fields
  - `org_signing_private_key`, `org_signing_public_key` (or external KMS reference)
- `av_projects`
  - `id`, `name`, `description`
  - `organization_id`, `owner_email`, `shared_with[]`
  - `canvas_products` (jsonb), `connections` (jsonb), `rooms` (jsonb)
  - `floorplans` (jsonb), `arrows` (jsonb), `annotations` (jsonb)
  - `created_at`, `updated_at`
- `av_products`
  - `id`, `organization_id`
  - `brand`, `model`, `category`, `description`, `price`
  - `input_connections` (jsonb), `output_connections` (jsonb)
  - manuals/spec/image fields
- `subscriptions`
  - `id`, `organization_id`
  - `plan`, `status`, `cancel_at_period_end`
  - `stripe_customer_id`, `stripe_subscription_id`
  - `current_period_start`, `current_period_end`
- `pending_invites`
  - `id`, `email`, `organization_id`, `organization_role`
  - `status`, `expires_at`
- `wire_pricing`
  - `id`, `organization_id`, `wire_type`, `wire_spec`
  - `material_price_per_foot`, `labor_price_per_run`, `termination_price`
- `activities`
  - `id`, `organization_id`, `project_id`, `action`, `metadata`, `created_at`
- `project_presence`
  - `id`, `project_id`, `user_email`, `status`, `last_seen`
- `pdf_exports`
  - `id`, `organization_id`, `project_id`, `user_email`, `export_type`, `created_at`
- `networks`
  - `id`, `organization_id`, `name`, `description`, `subnet`, `location`
- `device_name_mappings`
  - `id`, `organization_id`, `mac_address`, `custom_name`

## Agent/network tables (already Supabase-oriented in current code)
- `agents`, `agent_heartbeats`, `agent_commands`, `agent_events`
- `devices` (network inventory devices, separate from AV product library)
- `agent_ping_results`, scan result tables used by scanner pipeline
- `registration_tokens`, `agent_unregister_tokens`

## 3) API Contract Replacement Plan

Implement an adapter first so UI calls `apiClient.*` instead of `base44.*`.

## Suggested endpoint groups
- Auth/User
  - `GET /me`
  - `PATCH /me`
  - `POST /auth/login`
  - `POST /auth/logout`
- Organizations
  - `POST /organizations`
  - `GET /organizations/:id`
  - `PATCH /organizations/:id`
  - `POST /organizations/:id/invitations/accept`
- Projects
  - `GET /projects?organization_id=...`
  - `POST /projects`
  - `PATCH /projects/:id`
  - `DELETE /projects/:id`
  - `POST /projects/:id/share`
- Products
  - `GET /products`
  - `POST /products`
  - `PATCH /products/:id`
  - `DELETE /products/:id`
- Billing
  - `POST /billing/checkout-session`
  - `POST /billing/portal-session`
  - `POST /billing/webhooks/stripe`
- Export/AI
  - `POST /exports/canvas-pdf`
  - `POST /exports/template`
  - `POST /ai/enrich-connections`
  - `POST /ai/spec-extraction`
- Admin
  - `GET /admin/organization-users`
  - `POST /admin/migrate-to-organization`
- Network agents
  - `GET /agents`
  - `POST /agents/register-token`
  - `POST /agents/:id/commands`
  - `POST /agents/:id/toggle-monitoring`
  - `GET /agents/:id/installer-url`

## 4) Function Porting Priority

## Phase A (must-have for app continuity)
- `createOrganization.ts`
- `acceptInvitation.ts`
- `getOrganizationUsers.ts`
- `createCheckout.ts`
- `createPortalSession.ts`
- `stripeWebhook.ts`
- `exportCanvasToPDF.ts`
- `sendInviteEmail.ts`

## Phase B (core UX and automation)
- `enrichProductConnectionsV2.ts`
- `scrapeSnapAV.ts`
- `apiTemplateService.ts`
- `uploadToSupabase.ts`
- `getYouTubeVideos.ts`
- `cleanupConnections.ts`

## Phase C (network agent domain)
- `getSupabaseConfig.ts`
- `createRegistrationToken.ts`
- `registerAgent.ts`
- `exchangeRegistrationCode.ts`
- `sendAgentCommand.ts`
- `toggleAgentMonitoring.ts`
- `getAgentCommand.ts`, `getAgentEvents.ts`, `getPingResults.ts`, `getScanResults.ts`

## 5) Security and Secrets Matrix

Move these to your new secret manager/env configuration:
- `STRIPE_API_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY` or service-role equivalent
- `SUPABASE_BUCKET`
- `APITEMPLATE_API_KEY`
- `YOUTUBE_API_KEY`
- `YOUTUBE_CHANNEL_ID`

Also move org signing key material out of plain table storage if possible (KMS reference preferred).

## 6) Frontend Refactor Checklist

- Add `src/api/client.ts` abstraction.
- Replace direct `base44.entities.*` calls page-by-page:
  - `AVCanvas`, `ProjectManager`, `DeviceManager`, `Billing`, `Admin`, `NetworkMapping`.
- Replace `base44.auth.*` usages in:
  - `AuthContext`, `OrganizationGuard`, `useOrganization`, `usePermissions`.
- Replace `base44.functions.invoke(...)` with typed service methods.
- Keep response shapes backward-compatible during transition.

## 7) Data Migration Checklist

- Export all current Base44 entity data.
- Build SQL migrations for the target schema.
- Import organizations/users first.
- Import projects/products/wire pricing/activity next.
- Import subscriptions and verify Stripe IDs.
- Import invites/presence/export history.
- Validate row counts and sample-record parity.
- Run dry-run migration in staging before production cutover.

## 8) Cutover Strategy (Recommended)

- Step 1: Dual-read (new API read shadow mode, Base44 still source of truth).
- Step 2: Dual-write for projects/subscriptions.
- Step 3: Switch read path to new backend behind feature flag.
- Step 4: Monitor errors/latency/parity dashboards.
- Step 5: Disable Base44 writes.
- Step 6: Keep rollback window with reversible flag.

## 9) Acceptance Criteria

- Users can log in and pass org guard with correct roles.
- Full project lifecycle works: create/load/update/share/delete.
- Canvas autosave/sync remains functional.
- PDF export output is equivalent for installer/client/full docs.
- Billing flows work end-to-end including webhook status transitions.
- Invite flow works for existing and new users.
- Network agent registration + command dispatch + ping results work.
- No page in `pages.config.js` depends on Base44 client directly.

## 10) Immediate Next Actions (Execution Order)

- [ ] Create `apiClient` adapter and wire one pilot domain (`Billing`).
- [ ] Stand up DB schema for `organizations/users/subscriptions`.
- [ ] Port and verify Stripe trio: `createCheckout`, `createPortalSession`, `stripeWebhook`.
- [ ] Port and verify auth + org guard.
- [ ] Port `AVProject` APIs and migrate `ProjectManager` + autosave path.
- [ ] Port `exportCanvasToPDF` and regression-check generated docs.
- [ ] Port invites/admin endpoints.
- [ ] Port network agent endpoints and realtime subscriptions.
- [ ] Execute staged data migration and final cutover.

