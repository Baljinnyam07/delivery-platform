# Deployment

Production setup for the Delivery Management Platform. Every step below needs
**your own accounts** (Supabase, Vercel, Expo, Google Play / Apple). Nothing here
is automated with stored credentials.

Order: **1 Supabase → 2 Admin (Vercel) → 3 Courier (EAS) → 4 Smoke test → 5 Pilot.**

---

## 1. Supabase (database, auth, functions)

1. Create a project at supabase.com. Region: the closest available to Mongolia
   (e.g. Northeast Asia — Seoul or Tokyo). Save the database password in a password manager.
2. Link and push the schema from the repo root:
   ```bash
   pnpm supabase login
   pnpm supabase link --project-ref <project-ref>
   pnpm supabase db push
   ```
   `seed.sql` is **not** applied in production (local test data only).
3. **Auth settings** (Dashboard → Authentication):
   - Disable **Allow new users to sign up** (accounts are created by the admin only).
   - Email confirmations: off (admin-created accounts are confirmed on creation).
   - Minimum password length: 8.
4. **Push function** (see ARCHITECTURE §9 "Production setup checklist"):
   ```bash
   pnpm supabase functions deploy send-push
   pnpm supabase secrets set PUSH_WEBHOOK_SECRET=<random 32+ characters>
   ```
   Then in the SQL editor:
   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-push', 'push_function_url');
   select vault.create_secret('<same PUSH_WEBHOOK_SECRET>', 'push_webhook_secret');
   ```
5. **First admin account.** Sign-up is disabled, so:
   - Dashboard → Authentication → Users → **Add user** (email + password, auto-confirm).
   - SQL editor:
     ```sql
     update auth.users
        set raw_app_meta_data = raw_app_meta_data || '{"role":"ADMIN"}',
            raw_user_meta_data = raw_user_meta_data || '{"full_name":"<Name>"}'
      where email = '<admin email>';
     -- the profile is created automatically by the on_auth_user_role_set trigger
     select id, role, full_name from public.profiles where role = 'ADMIN';
     ```
   - Couriers are then created from the admin app (**Курьерууд → Курьер нэмэх**).
6. Keys you will need next (Dashboard → Project Settings → API):
   - Project URL
   - **Publishable** key (safe for apps)
   - **Secret** key (server only — admin app on Vercel, never in the mobile app)
7. Backups: enable point-in-time recovery / daily backups on a paid plan before real data.

## 2. Admin web app (Vercel)

1. Import the GitHub repository in Vercel.
2. Project settings:
   - **Root Directory:** `apps/admin`
   - Framework: Next.js (auto-detected); install/build commands: defaults (pnpm workspace is detected).
   - Function region: close to the Supabase region (e.g. Seoul `icn1` / Tokyo `hnd1`).
3. Environment variables (Production + Preview):
   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key |
   | `SUPABASE_SECRET_KEY` | secret key (**not** `NEXT_PUBLIC_`) |
4. Deploy, open the URL, sign in with the first admin account.
5. Optional: a custom domain; keep the app unlisted (it already sends `X-Robots-Tag: noindex`).

## 3. Courier app (EAS)

1. From `apps/courier`:
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest init          # adds extra.eas.projectId to app config
   ```
2. **Choose permanent app identifiers** before the first build (cannot change after store release),
   e.g. `mn.<company>.courier`, and add them to `app.json`:
   ```json
   "android": { "package": "mn.<company>.courier" },
   "ios": { "bundleIdentifier": "mn.<company>.courier" }
   ```
3. Environment variables (public values only):
   ```bash
   npx eas-cli@latest env:create --environment preview    --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --visibility plaintext
   npx eas-cli@latest env:create --environment preview    --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value <publishable key> --visibility plaintext
   # repeat with --environment production
   ```
4. Push credentials: Android → FCM V1 service account (`eas credentials`); iOS → APNs key (paid Apple Developer account).
5. Test build (installable APK for pilot couriers):
   ```bash
   npx eas-cli@latest build --platform android --profile preview
   ```
   iOS internal builds need registered devices (`eas device:create`) or TestFlight.
6. Store release later: `--profile production`, then `eas submit`.

## 4. Production smoke test (15 minutes)

- [ ] Admin signs in; a courier account is rejected on the admin login.
- [ ] Admin creates a courier → courier signs in on the phone; an admin account is rejected in the courier app.
- [ ] Admin creates a delivery → courier gets "Шинэ хүргэлт нэмэгдлээ" push → claims it.
- [ ] Admin reassigns another delivery → old courier's list drops it, new courier gets a push.
- [ ] Courier: start → record cash → complete. Admin dashboard and payments show it.
- [ ] Courier returns an assigned delivery with a reason → appears unassigned; reason in the timeline.
- [ ] Reports CSV opens in Excel with Mongolian text.
- [ ] `select push_error, count(*) from notifications group by 1;` — no unexpected errors.

## 5. Pilot

Run 1–2 weeks with 2–3 couriers. Watch: unassigned queue age, `push_error` counts,
couriers' feedback on the Maps link and the number of taps per delivery.
