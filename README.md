# EXCELSIOR'26 Admin Portal

A separate, secure React/Vite admin console for EXCELSIOR'26 using Supabase Auth + Supabase Database/Storage and Vercel Functions.

## Vercel deployment

1. Import `vijayahariharan1172007-del/EXCELSIOR26-admin` into Vercel.
2. Framework: Vite. Build command: `npm run vercel-build`. Output: `dist`.
3. Use Node.js 24.x. Vercel currently supports Node.js 24 for builds and Functions. 
4. Add these environment variables in **Vercel → Project → Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `GMAIL_SENDER`
   - `GMAIL_APP_PASSWORD`
   - `ADMIN_INVITE_REDIRECT_URL`
5. Redeploy after adding/changing variables.

Only `VITE_*` values are bundled into the browser. The service-role key and Gmail password are read only by Vercel Functions.

## Admin API

Vercel Functions:
- `/api/admin-api` — authenticated admin operations
- `/api/send-qr-email` — authenticated QR email delivery

The browser sends the Supabase access token to these functions. Each function verifies the user server-side and checks `admin_accounts`.

## Abstract downloads

Abstract files are stored in the private Supabase `abstract-submissions` bucket. The admin UI now shows **Download PDF** for submissions with a file. The server verifies the admin session and creates a short-lived signed Storage URL (5 minutes), so the private bucket is never exposed publicly.

## Included admin areas

Overview, Pre-Registration Review, Event Registration, Profiles, Abstract Review + secure download, Brochure, Contact/site content, QR Gmail, QR Scanner, and owner-only Admin Management.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill the local values. Do not commit real secrets.

## Security

- Supabase Auth for administrator identity.
- Server-side authorization through Vercel Functions.
- Service-role credentials stay server-side.
- Private abstract files are served through expiring signed URLs.
- Owner-only administrator management.
- Audit records are written for privileged actions.
