# Itinerary Studio

A Vercel + Supabase-ready itinerary maker for planning a US-to-Iceland trip across devices.

## Features

- Multiple trips from the same account
- Locations, start/end dates and times, notes, and attachments
- Timeline, calendar, and infographic trip-board views
- Google Maps route/list opening for all stop locations
- Paired US/Iceland timezone displays
- Login/signup gate before trip access when Supabase is configured
- Supabase Auth email-link sign-in
- Cloud sync for shared devices
- Partner join links through trip share codes
- Supabase Storage-backed photos and files
- Local browser fallback when Supabase is not configured
- JSON import/export, `.ics` calendar export, and print

## Supabase Setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/01-create-tables.sql`.
3. Then run `supabase/02-security-policies.sql`.
4. Run `supabase/check-setup.sql`. You should see all four public tables with `rowsecurity = true`, plus the private `itinerary-attachments` bucket.
5. If you already ran an older version of the schema that used `duration_minutes`, run `supabase/migrate-start-end-times.sql`.
6. In Authentication > Providers, keep Email enabled and allow new users to sign up.
7. In Authentication > URL Configuration, set Site URL to your Vercel production URL and add your Vercel production and preview URLs to Redirect URLs.
8. Keep the `itinerary-attachments` bucket private. The SQL file creates RLS policies for trip members.

`supabase/schema.sql` is still available as a combined setup file, but the two-step setup is easier to debug in the Supabase SQL Editor.

The app uses these tables:

- `trips`
- `trip_members`
- `stops`
- `attachments`

The app uses this private storage bucket:

- `itinerary-attachments`

## Vercel Setup

1. Push this folder to a GitHub repository.
2. Import the repository in Vercel.
3. Add these environment variables in Vercel Project Settings:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
SUPABASE_STORAGE_BUCKET=itinerary-attachments
```

4. Deploy.

No build step is required. Vercel serves the static files and the `api/config.js` serverless function exposes only the public Supabase URL/key needed by the browser client.

After deployment, add the deployed Vercel URL to Supabase Auth redirect settings before testing email login. Magic links will not complete correctly unless the URL is allowed.

## Sharing With Your Partner

1. Sign in with your email.
2. Click **Sync now** to save the local trip to Supabase.
3. Click the share icon. The app copies a cloud join link.
4. Your partner opens the link, signs in, and joins the same shared trip.

Use the trip selector under **Cloud sync** to switch between multiple local/cloud trips.

## Local Mode

If Supabase env vars are missing, the app shows a setup screen with a local-only escape button. Once Supabase is configured, users must sign in before accessing trips.
