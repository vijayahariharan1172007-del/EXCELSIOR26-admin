# EXCELSIOR'26 Admin Portal

A separate React/Vite admin console for EXCELSIOR'26 using Supabase Database/Storage and Vercel Functions.

## Important: no interactive admin login

This portal intentionally has **no login page, password field, Supabase Auth sign-in flow, or server-issued admin session**.

The browser opens the admin console directly. Vercel Functions use the configured server-side Supabase service-role key for database operations. The `admin_accounts` table is retained as the admin-record/owner metadata source used by the console.

Because there is no interactive authentication, this deployment must not be treated as a public internet-facing security boundary. Use Vercel project/access protection or another network-level restriction if the admin URL needs to be private.

## Vercel deployment

1. Import the repository into Vercel.
2. Framework: Vite. Build command: `npm run vercel-build`. Output: `dist`.
3. Use Node.js 24.x.
4. Add these server environment variables in Vercel Project Settings → Environment Variables:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - SUPABASE_PUBLISHABLE_KEY
   - GMAIL_SENDER
   - GMAIL_APP_PASSWORD
5. Redeploy after adding/changing variables.

The service-role key and Gmail password are server-only. They are never bundled into browser code.

## Admin API

Vercel Functions:
- `/api/admin-api` — admin operations
- `/api/send-qr-email` — QR email delivery

There is no `/api/admin-login` endpoint.

## Included admin areas

Overview, Pre-Registration Review, Event Registration, Profiles, Abstract Review + secure download, Brochure, Contact/site content, QR Gmail, QR Scanner, and Admin Management.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill the local values. Do not commit real secrets.

## Security

- No passwords are collected or stored by this portal.
- No admin login/session-token flow is used.
- Service-role credentials stay server-side.
- Private abstract files are served through expiring signed URLs.
- Admin records remain available for operator metadata and audit trails.
