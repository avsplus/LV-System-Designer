# Backend (Fastify)

Initial migration backend slice replacing Base44 for:
- `GET /api/me`
- `PATCH /api/me`
- `GET /api/bootstrap`
- `GET /api/organizations/current`
- `POST /api/organizations`
- `POST /api/invitations/accept`
- `POST /api/invitations/send`
- `GET /api/billing/subscription`
- `POST /api/billing/checkout-session`
- `POST /api/billing/portal-session`
- `POST /api/billing/webhook`
- `GET /api/products`
- `POST /api/products`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`
- `POST /api/exports/pdf`

## Run

0. Create/align Supabase schema:
   - Open Supabase SQL Editor for your project.
   - Run `supabase/schema.sql` from repository root.
   - This creates canonical tables used by the migrated backend (`users`, `organizations`, `av_projects`, `av_products`, `subscriptions`, `pending_invites`).

1. Copy `.env.example` to `.env` and fill values.
   - For invite emails, configure `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS`.
   - For APITemplate cloud PDF export, configure:
     - `APITEMPLATE_API_KEY`
     - `APITEMPLATE_TEMPLATE_ID` (single shared template, recommended)
     - Optional per-type overrides:
       - `APITEMPLATE_TEMPLATE_INSTALLER`
       - `APITEMPLATE_TEMPLATE_CLIENT`
       - `APITEMPLATE_TEMPLATE_DOCUMENTATION`
2. Install backend deps:
   - `npm --prefix backend install`
3. Start backend:
   - `npm run backend:dev`
4. In frontend env, set:
   - `VITE_API_BASE_URL=http://localhost:4000`

## Notes

- Auth uses Supabase JWT from `Authorization: Bearer <token>`.
- User profile resolution reads from `public.users` by `id`, then falls back to `email`.
- Billing subscription persistence expects a `subscriptions` table compatible with current app fields.
