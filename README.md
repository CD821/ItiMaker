# Itinerary Studio

A Vercel + Supabase-ready itinerary maker for planning shared trips across devices.

## Features

- Multiple trips from the same account
- Archive or delete trips from the trip selector area
- Stop names, optional locations, start/end dates and times, notes, and attachments
- Popup add/edit stop window
- Timeline with optional end-time display, calendar, and map-based trip-board views
- Month, week, day, and custom range calendar modes
- Google Maps route/list opening for all stop locations
- Flexible paired timezone displays using browser-supported time zones
- Login/signup gate before trip access when Supabase is configured
- Supabase Auth username/password sign-in
- Cloud sync for shared devices
- Partner join links through trip share codes
- Supabase Storage-backed photos and files
- Local browser fallback when Supabase is not configured
- JSON import/export, `.ics` calendar export, and print

## Supabase Setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/01-create-tables.sql`.
3. Then run `supabase/02-security-policies.sql`.
4. If Supabase reports `syntax error at end of input`, clear the editor and run these smaller files instead, in this order:
   - `supabase/02a-functions.sql`
   - `supabase/02b-table-policies.sql`
   - `supabase/02c-storage-policies.sql`
5. Run `supabase/check-setup.sql`. You should see all four public tables with `rowsecurity = true`, plus the private `itinerary-attachments` bucket.
6. If you already ran an older version of the schema that used `duration_minutes`, run `supabase/migrate-start-end-times.sql`.
7. If your Supabase project already existed before the `Waiting` stop type was added, run `supabase/migrate-waiting-stop-type.sql`.
8. If your Supabase project already existed before the trip-members upsert fix, run `supabase/migrate-trip-members-upsert-policy.sql`.
9. If your Supabase project already existed before trip archiving was added, run `supabase/migrate-archive-trips.sql`.
10. If your Supabase project already existed before stop locations were added, run `supabase/migrate-stop-location.sql`.
11. In Authentication > Providers, keep Email enabled, allow new users to sign up, and turn off Confirm email for username/password login without email verification.
12. In Authentication > URL Configuration, set Site URL to your Vercel production URL and add your Vercel production and preview URLs to Redirect URLs.
13. Keep the `itinerary-attachments` bucket private. The SQL file creates RLS policies for trip members.

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

After deployment, add the deployed Vercel URL to Supabase Auth redirect settings. The app uses username/password in the UI; internally each username is stored in Supabase Auth as `username@itinerary.local`.

## Sharing With Your Partner

1. Sign in with your username and password.
2. Click **Sync now** to save the local trip to Supabase.
3. Click the share icon. The app copies a cloud join link.
4. Your partner opens the link, signs in, and joins the same shared trip.

Use the trip selector under **Cloud sync** to switch between multiple local/cloud trips.

Cloud changes autosave about one second after a change once the trip has been synced to Supabase. Another open device should reload the trip or refresh the page to pull the latest version; the app does not use live realtime presence yet.

Archiving a cloud trip hides it from the active selector by setting `archived_at`. Deleting a cloud trip removes the database row when the signed-in user is the trip owner.

## Local Mode

If Supabase env vars are missing, the app shows a setup screen with a local-only escape button. Once Supabase is configured, users must sign in before accessing trips.
