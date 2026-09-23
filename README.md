# EXCELSIOR'26 Admin Portal

Fresh professional admin console for the shared Supabase backend.

## Local setup
npm install
copy .env.example to .env.local
set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev

The browser uses only the Supabase publishable key. Privileged operations belong in protected Netlify Functions and must independently verify the Supabase session and admin_accounts authorization.

Contact edits target the shared site_content records consumed by the participant portal. QR Gmail provides bulk selection, Select All/Clear All, templates and QR preview; final delivery belongs in a protected server function.
