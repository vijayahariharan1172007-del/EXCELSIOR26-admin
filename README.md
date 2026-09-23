# EXCELSIOR'26 Admin Portal

Fresh professional admin console for the EXCELSIOR'26 shared Supabase backend.

## Local setup
1. npm install
2. Copy .env.example to .env.local
3. Set the Vite Supabase URL and publishable key.
4. For local protected functions, also provide the server-only variables.
5. npm run dev

## Production
Deploy the repository to Netlify with:
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

Set the server-only variables in Netlify's Functions environment scope. Do not put service/secret keys in browser variables. Netlify documents that runtime function secrets are supplied through environment variables; they are not available from `netlify.toml`.

## Implemented
- Supabase Auth admin sign-in.
- Server-side admin authorization against `admin_accounts`.
- Protected registration, payment and abstract review actions.
- Shared Contact content editing.
- Event configuration editing.
- PDF-only brochure replacement in the existing `excelsior-brochure` bucket.
- QR credential preparation, bulk queueing and protected Gmail delivery.
- Real browser camera QR scanning with manual-token fallback.
- Owner-only admin invitations with a maximum of 10 enabled admins.
- Audit records in `admin_audit`.
- Responsive desktop/mobile admin shell.

Supabase recommends server-only use of secret/service keys and authenticated server functions for privileged work.

