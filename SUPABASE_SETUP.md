# Hamza Fragrance — database and admin setup

The admin dashboard and database integration are prepared in this repository. They become live only after a Supabase project is connected and the setup below is completed.

## 1. Supabase project
- Create a Supabase project for Hamza Fragrance.
- In Project Settings → API, copy the Project URL and publishable/anon key.
- Put those public values in `supabase-config.js`.
- Never put the `service_role` key in browser code or GitHub.

## 2. Create the database
- Open Supabase → SQL Editor.
- Run the complete script in `supabase/schema.sql`.
- This creates products, orders and order_items, row-level security, a secure order-creation RPC and the current catalogue.
- Initial stock is deliberately zero. Enter actual stock quantities in Admin before accepting orders.

## 3. Create the administrator
- In Supabase → Authentication → Users, create the owner's user with a strong password.
- In SQL Editor, replace the email below with that exact admin email and run:
  `update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb where email = 'YOUR_ADMIN_EMAIL';`
- Sign out and sign in again so the refreshed JWT includes the admin role.
- Only a user with `app_metadata.role = admin` can access admin data. Do not assign this role to customers.

## 4. Admin dashboard
- Open `https://YOUR-VERCEL-DOMAIN/admin.html`.
- Sign in with the administrator email/password.
- Add/edit products and set real stock counts.
- Update order statuses from the dashboard.

## Current limits
- Orders are stored in Supabase after the project URL/key are configured and the schema is applied; WhatsApp remains the customer confirmation channel.
- Track Order still requests a manual update via WhatsApp; automated courier tracking is not connected.
- No card payment gateway is configured.
