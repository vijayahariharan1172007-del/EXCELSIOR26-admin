# EXCELSIOR'26 Admin Portal

A separate React/Vite admin console for EXCELSIOR'26 using Supabase Database/Storage and Vercel Functions.

## Admin access

The portal uses a **login overlay**, not a separate login page. Ten operator accounts are defined by username + server-side SHA-256 password hashes. Successful login creates an 8-hour signed admin session. The first account is the owner and can access owner-only admin management and credential exports.

The password values are not bundled into browser code. Put the generated credential JSON into the server-only `ADMIN_CREDENTIALS_JSON` variable when you want the owner to download the credential PDF. Keep that variable private.

## Vercel deployment

1. Import the repository into Vercel.
2. Framework: Vite. Build command: `npm run vercel-build`. Output: `dist`.
3. Use Node.js 24.x.
4. Add these server environment variables in Vercel Project Settings → Environment Variables:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - SUPABASE_PUBLISHABLE_KEY
   - ADMIN_SESSION_SECRET
   - ADMIN_CREDENTIALS_JSON
   - GMAIL_SENDER
   - GMAIL_APP_PASSWORD
5. Redeploy after adding/changing variables.

The service-role key and Gmail password are server-only. They are never bundled into browser code.

## Admin API

Vercel Functions:
- `/api/admin-login` — overlay login
- `/api/admin-api` — admin operations and audit logging
- `/api/admin-credentials-pdf` — owner-only credential PDF
- `/api/send-qr-email` — QR email delivery

Every authenticated admin API action is recorded in `admin_audit` with the operator username/name.

## Included admin areas

Overview, Pre-Registration Review, Event Registration, Profiles, Abstract Review + secure download, Brochure, Contact/site content, QR Gmail, QR Scanner, and Admin Management.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill the local values. Do not commit real secrets.

## Security

- Passwords are accepted only by the login endpoint and compared against server-side hashes.
- Admin sessions are signed server-side and expire after 8 hours.
- Operator password values are not shipped to the browser.
- Every admin API action is audited with the logged-in operator.
- Service-role credentials stay server-side.
- Private abstract files are served through expiring signed URLs.
- Admin records remain available for operator metadata and audit trails.
