# EXCELSIOR'26 Admin Portal

A separate React/Vite admin console for EXCELSIOR'26 using a server-validated admin credentials table, Supabase Database/Storage, and Vercel Functions.

## Vercel deployment

1. Import the repository into Vercel.
2. Framework: Vite. Build command: npm run vercel-build. Output: dist.
3. Use Node.js 24.x. Vercel supports Node.js 24 for builds and Functions. citeturn1search1
4. Add these server environment variables in Vercel Project Settings → Environment Variables:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - SUPABASE_PUBLISHABLE_KEY
   - GMAIL_SENDER
   - GMAIL_APP_PASSWORD
5. Redeploy after adding/changing variables.

The service-role key and Gmail password are server-only. They are never bundled into browser code.

## Admin authentication

The admin portal does not use Supabase Auth for administrator login.

Login flow: Login form → Vercel /api/admin-login → admin_login_credentials → PostgreSQL password verification → short-lived server-issued session token → protected admin APIs.

Passwords are stored as password hashes, not plaintext. Supabase documents bcrypt as a strong password hashing approach and recommends password protection practices rather than storing raw passwords. citeturn0search0

The admin_accounts table remains the authorization/role source. The oldest enabled admin is treated as the owner for owner-only management.

## Admin API

Vercel Functions:
- /api/admin-login — table-backed login/logout and session issuance
- /api/admin-api — protected admin operations
- /api/send-qr-email — protected QR email delivery

Every privileged API request requires the server-issued admin session token. Session tokens are stored only as SHA-256 hashes in the database and expire after 8 hours.

## Included admin areas

Overview, Pre-Registration Review, Event Registration, Profiles, Abstract Review + secure download, Brochure, Contact/site content, QR Gmail, QR Scanner, and owner-only Admin Management.

## Local development

npm install
npm run dev

Copy .env.example to .env and fill the local values. Do not commit real secrets.

## Security

- Administrator credentials are stored in the dedicated admin_login_credentials table.
- Passwords are hashed and verified server-side.
- Session tokens are hashed before storage and expire.
- Service-role credentials stay server-side.
- Private abstract files are served through expiring signed URLs.
- Owner-only administrator management.
- Audit records are written for privileged actions.
