# Architecture

Status: **APPROVED** (2026-11-05). See [Approved Decisions](#approved-decisions).

Currency: **MNT** · Time zone: **Asia/Ulaanbaatar** (stored as `timestamptz`, displayed in this zone).

Related: [PROJECT_BRIEF.md](PROJECT_BRIEF.md) · [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)

---

## 1. System Architecture

```
┌──────────────────────────┐        ┌──────────────────────────┐
│  apps/admin (Next.js)    │        │  apps/courier (Expo)     │
│  Vercel                  │        │  iOS / Android (EAS)     │
│                          │        │                          │
│  Server Components ──┐   │        │  supabase-js (anon key + │
│  Server Actions ─────┤   │        │  user session in         │
│  (user session,      │   │        │  SecureStore)            │
│   anon key + RLS)    │   │        │                          │
│  server-only admin   │   │        │                          │
│  client (service     │   │        │                          │
│  role, 1 use-case)   │   │        │                          │
└──────────────┬───────┘   │        └─────────────┬────────────┘
               │  @delivery/shared (types, enums, zod schemas)
               ▼                                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase                                                    │
│  Auth ── profiles (role: ADMIN | COURIER)                   │
│  Postgres ── tables + RLS + SECURITY DEFINER RPC functions  │
│           └─ triggers: status history, updated_at           │
│  Realtime ── deliveries / notifications change feeds        │
│  Storage ── payment-receipts (private bucket)               │
│  Edge Function send-push ◄── DB webhook on notifications    │
└──────────────────────────────────┬──────────────────────────┘
                                   ▼
                          Expo Push Service → couriers' devices
```

### Key decisions

| # | Decision | Why |
|---|----------|-----|
| A1 | **The database is the source of truth for all business rules.** Every state change (assign, claim, start, deliver, cancel, payment) is a Postgres RPC function. | Admin web and courier app cannot diverge; a buggy or malicious client cannot break invariants. |
| A2 | **No custom backend server.** Admin uses Next.js Server Actions; courier calls Supabase directly. | Fewer moving parts. RLS + RPC already enforce authorization. |
| A3 | **Clients use the user's session (anon key + JWT), never the service role.** Service role is used only in one server-only module of admin (creating courier auth accounts). | Keeps RLS active for 99% of traffic; service role never leaves the server. |
| A4 | **Status/courier columns cannot be updated directly** (column-level `GRANT`). Only RPCs change them. | Rules 1–4 are enforced even if RLS has a mistake. |
| A5 | **Status history is written by a trigger**, not by application code. | Rule 3 holds for every code path, including future ones. |
| A6 | **One active assignment enforced by a partial unique index** in addition to atomic UPDATE. | Two independent layers against duplicate assignment. |
| A7 | **No offline write queue in courier app (MVP).** | Offline queued claims would create conflicts; reliability > offline convenience. |

---

## 2. Folder Structure (final proposal)

```
delivery-platform/
├── apps/
│   ├── admin/                         # Next.js App Router
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/login/
│   │   │   │   └── (app)/             # authenticated shell (sidebar layout)
│   │   │   │       ├── page.tsx       # Dashboard
│   │   │   │       ├── deliveries/
│   │   │   │       │   └── [id]/
│   │   │   │       ├── couriers/
│   │   │   │       │   └── [id]/
│   │   │   │       ├── payments/
│   │   │   │       ├── reports/
│   │   │   │       └── settings/
│   │   │   ├── components/
│   │   │   │   ├── ui/                # shadcn/ui primitives (generated)
│   │   │   │   └── layout/            # sidebar, topbar, page header
│   │   │   ├── features/              # one folder per domain
│   │   │   │   ├── deliveries/        # actions.ts, queries.ts, components/
│   │   │   │   ├── couriers/
│   │   │   │   ├── payments/
│   │   │   │   └── dashboard/
│   │   │   ├── lib/
│   │   │   │   └── supabase/
│   │   │   │       ├── server.ts      # SSR client (user session)
│   │   │   │       ├── browser.ts     # browser client (realtime only)
│   │   │   │       └── admin.ts       # service role — `import "server-only"`
│   │   │   └── proxy.ts               # Next 16 proxy (was middleware): session refresh + sign-in redirect
│   │   └── package.json               # name: "admin"
│   │
│   └── courier/                       # Expo + Expo Router
│       ├── app/
│       │   ├── _layout.tsx            # auth gate
│       │   ├── login.tsx
│       │   ├── (tabs)/
│       │   │   ├── _layout.tsx
│       │   │   ├── index.tsx          # My deliveries
│       │   │   ├── available.tsx      # Unassigned / claim
│       │   │   ├── history.tsx
│       │   │   └── profile.tsx
│       │   └── delivery/[id].tsx      # Detail + actions
│       ├── src/
│       │   ├── components/
│       │   ├── features/              # deliveries, payments (api + hooks)
│       │   ├── lib/supabase.ts
│       │   ├── lib/maps.ts            # Google Maps URL builder
│       │   └── theme/                 # tokens from DESIGN_SYSTEM.md
│       ├── app.json
│       ├── eas.json
│       └── package.json               # name: "courier"
│
├── packages/
│   └── shared/                        # @delivery/shared — no runtime deps on React
│       └── src/
│           ├── database.types.ts      # generated by `supabase gen types`
│           ├── enums.ts               # DeliveryStatus, PaymentMethod, ...
│           ├── status.ts              # labels, colors, allowed transitions (UI mirror)
│           ├── errors.ts              # RPC error codes → user messages
│           ├── schemas/               # zod: delivery, payment, courier forms
│           └── index.ts
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_enums_profiles.sql
│   │   ├── 0002_deliveries.sql
│   │   ├── 0003_assignments_history.sql
│   │   ├── 0004_payments.sql
│   │   ├── 0005_notifications.sql
│   │   ├── 0006_rls.sql
│   │   ├── 0007_rpc_assignment.sql
│   │   ├── 0008_rpc_status_payment.sql
│   │   └── 0009_storage.sql
│   ├── functions/send-push/index.ts   # Edge Function
│   ├── tests/                         # pgTAP: RLS + RPC + concurrency
│   └── seed.sql
│
├── docs/
├── .npmrc                             # node-linker=hoisted (Expo + pnpm)
├── tsconfig.base.json
├── package.json
└── pnpm-workspace.yaml
```

Rules:
- `admin` and `courier` never import from each other. Only `@delivery/shared`.
- `shared` contains only plain TS + zod. No React, no Supabase client.
- Domain code lives in `features/<domain>`; `app/` routes stay thin.

---

## 3. Database Schema

### Enums

```sql
user_role        : ADMIN | COURIER
delivery_status  : UNASSIGNED | ASSIGNED | IN_PROGRESS | DELIVERED | CANCELLED
payment_method   : CASH | BANK_TRANSFER
payment_status   : PAID | UNPAID
assignment_start : ASSIGNED | CLAIMED | REASSIGNED
assignment_end   : REASSIGNED | UNASSIGNED | RETURNED | CANCELLED | COMPLETED
```

### profiles
| column | type | notes |
|---|---|---|
| id | uuid PK | FK → `auth.users.id`, on delete cascade |
| role | user_role | not null |
| full_name | text | not null |
| phone | text | |
| is_active | boolean | default true; inactive users are blocked in RPCs |
| expo_push_token | text | courier device token (one device in MVP) |
| created_at / updated_at | timestamptz | |

### deliveries
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| code | text unique | human ID, e.g. `D-000123` (sequence) |
| customer_name | text | not null |
| customer_phone | text | not null |
| address | text | not null |
| address_note | text | entrance, floor, landmark |
| latitude / longitude | double precision | optional, improves Maps accuracy |
| package_description | text | |
| notes | text | admin → courier instructions |
| amount_due | numeric(12,2) | MNT, ≥ 0, default 0 |
| status | delivery_status | default `UNASSIGNED` |
| courier_id | uuid FK → profiles | null when unassigned |
| payment_status | payment_status | default `UNPAID` — independent of `status` (rule 6) |
| payment_method | payment_method | set when paid |
| scheduled_date | date | optional planned day |
| assigned_at, started_at, delivered_at, cancelled_at | timestamptz | |
| cancel_reason | text | |
| created_by | uuid FK → profiles | default `auth.uid()` |
| created_at / updated_at | timestamptz | |

Constraints:
```sql
CHECK (
  (status = 'UNASSIGNED' AND courier_id IS NULL) OR
  (status IN ('ASSIGNED','IN_PROGRESS','DELIVERED') AND courier_id IS NOT NULL) OR
  (status = 'CANCELLED')
)
```
Indexes: `(status, created_at desc)`, `(courier_id, status)`, `(payment_status)`, `(scheduled_date)`.

### delivery_assignments (audit of who owned a delivery, rule 4)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| delivery_id | uuid FK | |
| courier_id | uuid FK | |
| start_action | assignment_start | how this assignment began |
| previous_courier_id | uuid | for REASSIGNED |
| start_note | text | reason, required for REASSIGNED |
| started_by | uuid FK | admin or the courier (CLAIMED) |
| started_at | timestamptz | |
| ended_at | timestamptz | null = active |
| end_reason | assignment_end | REASSIGNED / UNASSIGNED / RETURNED / CANCELLED / COMPLETED |
| end_note | text | reason, required for UNASSIGNED / RETURNED / CANCELLED |
| ended_by | uuid FK | |

Invariant: a delivery has an active assignment **iff** its status is ASSIGNED or IN_PROGRESS.

```sql
CREATE UNIQUE INDEX one_active_assignment
  ON delivery_assignments (delivery_id) WHERE ended_at IS NULL;
```

### delivery_status_history (rule 3)
| column | type |
|---|---|
| id | bigint identity PK |
| delivery_id | uuid FK |
| from_status | delivery_status (null on creation) |
| to_status | delivery_status |
| changed_by | uuid (`auth.uid()`) |
| note | text |
| created_at | timestamptz |

Written by `AFTER INSERT OR UPDATE OF status ON deliveries` trigger.

### payment_records
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| delivery_id | uuid FK | |
| amount | numeric(12,2) | MNT, > 0, must equal `deliveries.amount_due` (full payment only) |
| method | payment_method | |
| recorded_by | uuid FK | courier or admin |
| recorded_at | timestamptz | |
| receipt_path | text | Storage path (optional, for BANK_TRANSFER) |
| note | text | |
| voided_at / voided_by / void_reason | | admin correction, never hard-delete |

```sql
CREATE UNIQUE INDEX one_active_payment
  ON payment_records (delivery_id) WHERE voided_at IS NULL;
```
MVP = one full payment per delivery (no partial payments). `record_payment` rejects amounts different from `amount_due`. The index prevents double recording.

### notifications
| column | type |
|---|---|
| id | uuid PK |
| recipient_id | uuid FK → profiles |
| type | text (`DELIVERY_ASSIGNED`, `DELIVERY_REASSIGNED_AWAY`, `DELIVERY_CANCELLED`, `DELIVERY_AVAILABLE`) |
| title / body | text |
| delivery_id | uuid FK, nullable |
| read_at | timestamptz |
| push_sent_at / push_error | timestamptz / text |
| created_at | timestamptz |

### Relationships
```
auth.users 1─1 profiles
profiles   1─* deliveries (courier_id, created_by)
deliveries 1─* delivery_assignments (≤1 active)
deliveries 1─* delivery_status_history
deliveries 1─* payment_records (≤1 non-voided)
profiles   1─* notifications
```

---

## 4. Row Level Security

Helper functions (`SECURITY DEFINER`, `STABLE`, `search_path = ''`):
- `is_admin()` → caller is active ADMIN
- `is_active_courier()` → caller is active COURIER

RLS is enabled on every table. **No table allows DELETE to `authenticated`.**

| Table | SELECT | INSERT | UPDATE | 
|---|---|---|---|
| profiles | own row, or admin | — (server/trigger) | admin: all; self: only `full_name, phone, expo_push_token` (column grant) |
| deliveries | admin: all; courier: `courier_id = auth.uid()` | admin | admin: descriptive columns only* |
| delivery_assignments | admin; courier: own rows | RPC only | RPC only |
| delivery_status_history | admin; courier: for own deliveries | trigger only | — |
| payment_records | admin; courier: for own deliveries | RPC only | RPC only |
| notifications | own | RPC/trigger only | own, `read_at` only |

\* Column-level privileges:
```sql
REVOKE UPDATE ON deliveries FROM authenticated;
GRANT UPDATE (customer_name, customer_phone, address, address_note,
              latitude, longitude, package_description, notes,
              amount_due, scheduled_date) ON deliveries TO authenticated;
```
So `status`, `courier_id`, `payment_status` can be changed **only** by RPC functions.

Role escalation is impossible: `role` and `is_active` are not updatable by `authenticated`.

**Available (unassigned) deliveries** are *not* exposed to couriers via table SELECT. They are read through `list_available_deliveries()` which returns only what is needed to decide (code, address, address_note, scheduled_date, amount_due) — customer phone is revealed only after claim.

Storage bucket `payment-receipts` (private), path `{delivery_id}/{uuid}.jpg`:
- insert/select: admin, or the courier currently assigned to `delivery_id`.

---

## 5. Atomic Assignment Design

All RPCs: `SECURITY DEFINER`, `SET search_path = ''`, `REVOKE EXECUTE FROM public, anon`, `GRANT EXECUTE TO authenticated`, role check as first statement. Each function call is one transaction.

### claim_delivery(p_delivery_id) — courier
```sql
-- 1. caller must be active courier
UPDATE deliveries
   SET status = 'ASSIGNED', courier_id = auth.uid(), assigned_at = now()
 WHERE id = p_delivery_id
   AND status = 'UNASSIGNED'
RETURNING * INTO v_delivery;

IF NOT FOUND THEN
  RAISE EXCEPTION 'DELIVERY_NOT_AVAILABLE';
END IF;

INSERT INTO delivery_assignments (delivery_id, courier_id, start_action, started_by)
VALUES (p_delivery_id, auth.uid(), 'CLAIMED', auth.uid());
```

**Why this is safe:** two couriers claim at the same moment → both UPDATEs target the same row; Postgres row lock makes the second wait; after the first commits, the second re-checks `status = 'UNASSIGNED'`, finds `ASSIGNED`, updates 0 rows → `DELIVERY_NOT_AVAILABLE`. No `SELECT … then UPDATE` gap. The partial unique index `one_active_assignment` is a second safety net.

### assign_delivery(p_delivery_id, p_courier_id) — admin
Same conditional UPDATE (`WHERE status = 'UNASSIGNED'`), target courier must be active COURIER. Action `ASSIGNED`. Notifies courier.

### reassign_delivery(p_delivery_id, p_new_courier_id, p_reason) — admin
```sql
SELECT … FROM deliveries WHERE id = p_delivery_id FOR UPDATE;
-- must be ASSIGNED (IN_PROGRESS → 'INVALID_TRANSITION'), reason required,
-- new courier ≠ current courier
UPDATE delivery_assignments SET ended_at = now(), end_reason = 'REASSIGNED'
 WHERE delivery_id = p_delivery_id AND ended_at IS NULL;
UPDATE deliveries SET courier_id = p_new_courier_id, assigned_at = now() …;
INSERT INTO delivery_assignments (…, start_action='REASSIGNED', previous_courier_id, start_note, …);
-- notify old courier (removed) and new courier (assigned)
```

### unassign_delivery(p_delivery_id, p_reason) — admin
ASSIGNED → UNASSIGNED, reason required, ends active assignment (`UNASSIGNED`), notifies courier.

### return_delivery(p_delivery_id, p_reason) — courier
Courier returns own delivery to the pool. **Only while ASSIGNED** (IN_PROGRESS → `INVALID_TRANSITION`). Reason is mandatory.
```sql
UPDATE deliveries SET status = 'UNASSIGNED', courier_id = NULL, assigned_at = NULL
 WHERE id = p_delivery_id AND status = 'ASSIGNED' AND courier_id = auth.uid();
-- 0 rows → INVALID_TRANSITION
UPDATE delivery_assignments
   SET ended_at = now(), end_reason = 'RETURNED', end_note = p_reason, ended_by = auth.uid()
 WHERE delivery_id = p_delivery_id AND ended_at IS NULL;
-- status history row (ASSIGNED → UNASSIGNED, note = reason) is written by trigger
```
The delivery becomes visible as Unassigned (dashboard queue + couriers' Available list).

### Assignment history is never lost
`delivery_assignments` rows are **never updated except to close them** (`ended_at`, `end_reason`, `end_note`, `ended_by`) and never deleted. Together with `delivery_status_history` this gives the full chain: who had it, how they got it, when and why it ended.

### Status transitions (authoritative in DB, mirrored in `shared/status.ts` for UI)

| From | To | Who | RPC |
|---|---|---|---|
| UNASSIGNED | ASSIGNED | admin / courier | `assign_delivery` / `claim_delivery` |
| ASSIGNED | ASSIGNED (other courier) | admin | `reassign_delivery` |
| ASSIGNED | UNASSIGNED | admin / courier | `unassign_delivery` / `return_delivery` (reason required) |
| ASSIGNED | IN_PROGRESS | assigned courier | `start_delivery` |
| IN_PROGRESS | DELIVERED | assigned courier | `complete_delivery` |
| any except DELIVERED | CANCELLED | admin | `cancel_delivery(reason)` |

Every transition: `UPDATE … WHERE id = $1 AND status = <expected> AND courier_id = <expected>` → 0 rows = `INVALID_TRANSITION`. History row is added by trigger.

---

## 6. Admin Web — Page Structure

Layout follows `design-references/01` (shell) and `02` (tables), using our tokens.

| Route | Content |
|---|---|
| `/login` | Email + password. Non-admin accounts are rejected. |
| `/` Dashboard | KPI strip: Today total · **Unassigned** · In progress · Delivered · Unpaid amount. **Unassigned queue** panel with inline Assign (rule 5). Courier workload list (active count per courier). Recent activity (status history feed). |
| `/deliveries` | Segmented status filter (All / Unassigned / Assigned / In progress / Delivered / Cancelled) with counts. Search (code, customer, phone, address). Filters: courier, payment status, date. Table: code, customer, address, courier, status badge, payment badge, amount, created. Row menu: Assign / Reassign / Unassign / Cancel. **"New delivery"** opens a side sheet (quick create, no page change). Pagination. |
| `/deliveries/[id]` | Details (editable), assignment card, payment card (record / void), **timeline** merging status history + assignments + payments. |
| `/couriers` | List: name, phone, active/inactive, current load, delivered today. Add courier (dialog), deactivate. |
| `/couriers/[id]` | Profile, current deliveries, history, simple performance (delivered count, avg delivery time, cash collected). |
| `/payments` | Payment records, filters (paid/unpaid, method, courier, date). **Cash held per courier** summary for reconciliation. |
| `/reports` | Basic: deliveries per day, per courier, status breakdown, payments by method. CSV export. |
| `/settings` | Own profile, admin users list. |

Data flow: Server Components fetch via RLS; mutations via Server Actions → RPC → `revalidatePath`. Dashboard and deliveries list subscribe to Realtime and call `router.refresh()` on change.

---

## 7. Courier Mobile — Screen Structure

Layout follows `design-references/03`, using our tokens.

| Screen | Content |
|---|---|
| Login | Email + password. Non-courier / inactive accounts rejected. |
| **My deliveries** (tab) | Cards grouped: In progress → Assigned. Card: code, address, customer, amount + payment badge. Two large buttons on card: **Call**, **Navigate**. Pull-to-refresh. |
| **Available** (tab) | Unassigned list (limited info). Large **Claim** button. On `DELIVERY_NOT_AVAILABLE` → toast "Already taken by another courier" + list refresh. |
| History (tab) | Delivered / cancelled, by date. |
| Profile (tab) | Name, phone, notification permission state, logout. |
| Delivery detail | Key/value rows (customer, phone, address, note, amount, payment). Call · Navigate. **One contextual primary button**: `Start delivery` → `Mark as delivered`. **Record payment** bottom sheet: method (Cash / Bank transfer), amount prefilled, optional receipt photo. Confirmation dialog for irreversible actions. |

Google Maps: `https://www.google.com/maps/dir/?api=1&destination=<lat,lng | encoded address>` via `Linking.openURL` — opens the Google Maps app if installed, browser otherwise. No Maps SDK, no API key needed.

---

## 8. API & RPC Design

### Reads (direct `select`, protected by RLS)
| Consumer | Query |
|---|---|
| admin | deliveries list/detail, couriers, payments, history, notifications |
| courier | own deliveries, own history, own payment records, own notifications |

### RPC functions
| Function | Caller | Returns |
|---|---|---|
| `list_available_deliveries()` | courier | limited rows |
| `claim_delivery(delivery_id)` | courier | delivery |
| `return_delivery(delivery_id, reason)` | courier (own, ASSIGNED only) | delivery |
| `start_delivery(delivery_id)` | courier | delivery |
| `complete_delivery(delivery_id, note?)` | courier | delivery |
| `record_payment(delivery_id, method, amount, receipt_path?, note?)` | courier (assigned, IN_PROGRESS/DELIVERED) or admin | payment_record |
| `assign_delivery(delivery_id, courier_id)` | admin | delivery |
| `reassign_delivery(delivery_id, courier_id, reason)` | admin | delivery |
| `unassign_delivery(delivery_id, reason)` | admin | delivery |
| `cancel_delivery(delivery_id, reason)` | admin | delivery |
| `void_payment(payment_id, reason)` | admin | payment_record |
| `set_courier_active(courier_id, active)` | admin | profile (blocks deactivation while courier has active deliveries) |
| `get_dashboard_stats(from, to)` | admin | KPI json (period counts, current snapshot, outstanding unpaid, collections) |
| `get_courier_stats(from, to)` | admin | per-courier load, delivered, avg time, cash / transfer collected |
| `get_daily_report(from_date, to_date)` | admin | one row per Ulaanbaatar calendar day (≤ 366 days) |

Direct writes allowed: admin `insert`/`update` (descriptive columns) on `deliveries`; own profile fields (`full_name`, `phone`, `expo_push_token`); own notifications (`read_at` only).

Server-only (admin, service role): **create courier account** → `auth.admin.createUser({ email, password, app_metadata: { role: "COURIER" }, user_metadata: { full_name, phone } })`. The `on_auth_user_created` trigger creates the profile; users without `app_metadata.role` get no profile and no access. Public sign-up is disabled (`enable_signup = false`). Called only from a Server Action after verifying the caller is admin.

### Error contract
RPCs raise stable codes; `shared/errors.ts` maps them to UI messages:
`NOT_AUTHORIZED`, `USER_INACTIVE`, `DELIVERY_NOT_FOUND`, `DELIVERY_NOT_AVAILABLE`, `INVALID_TRANSITION`, `REASON_REQUIRED`, `SAME_COURIER`, `COURIER_NOT_FOUND`, `COURIER_INACTIVE`, `HAS_ACTIVE_DELIVERIES`, `PAYMENT_NOT_ALLOWED`, `PAYMENT_NOT_REQUIRED`, `PAYMENT_ALREADY_RECORDED`, `PAYMENT_NOT_FOUND`, `PAYMENT_ALREADY_VOIDED`, `AMOUNT_MISMATCH`, `AMOUNT_LOCKED`, `INVALID_RECEIPT_PATH`.

Types: `supabase gen types typescript` → `packages/shared/src/database.types.ts`; both apps use typed clients.

---

## 9. Notification Architecture

```
RPC (same transaction) ──INSERT──► notifications
                                       │ Database Webhook (on INSERT)
                                       ▼
                         Edge Function send-push
                           ├─ read recipient expo_push_token
                           ├─ POST https://exp.host/--/api/v2/push/send
                           └─ update push_sent_at / push_error
                              (DeviceNotRegistered → clear token)
```

- Notification rows are created **inside the same transaction** as the business change → no lost or phantom notifications.
- Push failure never rolls back business logic (async after commit).
- Courier app registers its Expo push token after login (`update profiles set expo_push_token`).
- Admin web: no push. Realtime subscriptions on `deliveries` and `notifications` + toast.
- Courier app: push for background; on foreground, refetch lists on focus / pull-to-refresh.

| Event | Recipient |
|---|---|
| Delivery assigned / reassigned to you | courier |
| Delivery removed from you (reassign / unassign / cancel) | old courier |
| Delivery available (created, returned or unassigned) | all active couriers, throttled (see below) |

### Anti-spam rules for "delivery available"
Implemented in one place — a trigger on `deliveries` that fires when a row **becomes** `UNASSIGNED` (insert or update):
1. Recipients: active couriers only; the courier who just returned the delivery is excluded.
2. **Throttle:** a courier gets a new `DELIVERY_AVAILABLE` notification only if they have no `DELIVERY_AVAILABLE` notification in the last **10 minutes**. A burst of 20 new deliveries = 1 push per courier, not 20.
3. Text is generic ("New deliveries are available") so a throttled push is never misleading.
4. Assigned / reassigned / removed / cancelled notifications are never throttled — they are personal and actionable.

---

## 10. Development Phases & Testing

| Phase | Scope | Exit criteria |
|---|---|---|
| **0** ✅ | Monorepo, workspace, docs | Approved architecture |
| **1** ✅ | Supabase: migrations, RLS, RPCs, triggers, seed | pgTAP tests pass, incl. concurrency test |
| **2** ✅ | `@delivery/shared`: generated types, enums, status map, zod schemas, error map | Typecheck + Vitest pass; DB↔shared sync tests |
| **3** ✅ | Admin: scaffold, design tokens, auth, shell, deliveries CRUD + assign/reassign | Create → assign → reassign works end-to-end (verified in browser, incl. realtime) |
| **4** ✅ | Admin: dashboard, couriers, payments, reports | Unassigned visible on dashboard; cash per courier correct (verified in browser + pgTAP) |
| **5** ✅ | Courier: scaffold, auth, my/available/history, detail, claim, status, payment, Maps | Full flow verified in the web preview + Android bundle builds; **real-device check still pending** |
| **6** ✅ | Notifications: push token, Edge Function, Realtime | DB → pg_net → Edge Function → Expo verified locally; **delivery to a real phone pending** (needs EAS project + dev build) |
| **7** 🟡 | Hardening: error/empty/loading states, Vercel deploy, EAS build, pilot | Code hardening + Playwright smoke done; deploy/EAS/pilot need owner accounts (docs/DEPLOYMENT.md) |

### Testing strategy (kept small, focused on what can break business rules)
- **Database (most important):** pgTAP in `supabase/tests`
  - RLS: courier cannot read others' deliveries, cannot update `status`/`courier_id` directly, cannot change own role.
  - RPC: every allowed and forbidden transition; IN_PROGRESS cannot be reassigned; reason required.
  - History: every status change produces exactly one history row.
- **Concurrency:** Node script firing 20 parallel `claim_delivery` calls on one delivery → exactly 1 success, 19 `DELIVERY_NOT_AVAILABLE`, 1 active assignment.
- **Shared:** Vitest for zod schemas and status map.
- **Admin E2E (Phase 7):** one Playwright smoke test: login → create → assign → mark paid.
- **Courier:** manual QA checklist on Android + iOS dev builds.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Service role key leaks to browser | Only in `lib/supabase/admin.ts` with `import "server-only"`; env var without `NEXT_PUBLIC_` prefix. |
| Courier bypasses rules via direct table update | Column-level grants + RPC-only state changes. |
| Double claim / double assign | Conditional atomic UPDATE + partial unique index. |
| Stale UI → courier taps Claim on taken delivery | Clear error message + auto refresh; Realtime on admin side. |
| Duplicate payment record | Partial unique index; corrections via `void_payment`, never delete. |
| Courier deactivated with active deliveries | `set_courier_active` blocks deactivation while the courier has ASSIGNED or IN_PROGRESS deliveries; admin reassigns first. |
| Cash collected but not handed over | Payments page shows cash held per courier (full handover workflow is post-MVP). |
| Wrong/ambiguous addresses | Optional lat/lng + `address_note`; Maps falls back to text search. |
| Failed delivery attempt (customer absent) | No status for it in MVP: courier calls admin; admin unassigns or cancels with reason. Consider `FAILED` status later. |
| Push not working in Expo Go | Use EAS development build from Phase 5. |
| Expo + pnpm module resolution | `.npmrc` → `node-linker=hoisted`. |
| Time zones | Store `timestamptz`; display in business time zone (config constant). |

---

## Push Notifications — as built (Phase 6)

```
RPC / trigger ──INSERT──► notifications
                              │ AFTER INSERT trigger private.dispatch_push()
                              │   only if recipient is active and has a token
                              │   net.http_post(url, {notification_id}, x-webhook-secret)
                              │   (pg_net sends after COMMIT — rollback ⇒ no push)
                              ▼
                 Edge Function send-push (verify_jwt = false, shared secret)
                   ├─ load notification + token (service role)
                   ├─ skip if push_sent_at already set (idempotent)
                   ├─ POST https://exp.host/--/api/v2/push/send (channelId "deliveries")
                   └─ push_sent_at | push_error; DeviceNotRegistered → clear token
```

- Only the notification **id** leaves the database; the function reads the rest with the service role.
- **Courier app:** registers the Expo push token after sign-in (`src/lib/use-push.ts`), creates the Android channel first (required on Android 13+), routes taps (assigned → delivery, available → Available tab, removed/cancelled → My deliveries), and clears the token on sign-out. Web preview uses a no-op (`use-push.web.ts`).
- **Expo Go cannot receive remote push** (SDK 53+). Push needs an EAS project id and a development/production build.

### Production setup checklist
1. `npx eas-cli@latest init` in `apps/courier` (adds `extra.eas.projectId`), configure FCM V1 credentials (Android) and APNs (iOS) with EAS.
2. `supabase functions deploy send-push`
3. `supabase secrets set PUSH_WEBHOOK_SECRET=<random 32+ chars>` (optional: `EXPO_ACCESS_TOKEN` if enhanced push security is enabled).
4. In SQL (Vault):
   `select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-push', 'push_function_url');`
   `select vault.create_secret('<same secret>', 'push_webhook_secret');`
5. Local development uses `[edge_runtime.secrets]` in `config.toml` and the Vault rows created by `seed.sql` — never reuse that value in production.

## Implementation Notes (Phase 3)

- Next.js 16: `src/proxy.ts` replaces `middleware.ts`. It only refreshes the session and redirects signed-out users; the ADMIN check runs in `lib/auth.ts` (`getCurrentAdmin`) and again in RLS/RPCs.
- `cacheComponents` is **off**: every admin page is per-user and dynamic, so plain dynamic rendering is simpler.
- shadcn/ui: Radix base, `radix-nova` style, recolored with our tokens in `globals.css`. Toasts use the shadcn `sonner` component (light only, no `next-themes`).
- Inter is loaded with the `cyrillic` subset (Mongolian).
- The create form sends a client-generated id, so a double submit is idempotent.
- Dialog/sheet bodies unmount on close: each open starts with fresh state, and a realtime refresh never overwrites what the admin is typing.
- `idSchema` uses `z.guid()` (any Postgres uuid); `z.uuid()` rejected the non-RFC seed ids.
- Latitude/longitude are not in the admin form yet (Maps falls back to the address text).
- ~~`/` redirects to `/deliveries` until the dashboard~~ — dashboard shipped in Phase 4.

## Implementation Notes (Phase 4)

- **Service role usage** (`lib/supabase/admin.ts`, server-only, always after `getCurrentAdmin()`): create courier accounts, admin password reset for couriers, read a courier's email. Nothing else.
- **Profile creation fix** (migration 0012): GoTrue's admin `createUser` inserts the user first and sets `app_metadata.role` in a follow-up UPDATE, so the profile trigger now also fires on that UPDATE. It only ever creates a missing profile and never changes an existing role. `createCourier` additionally deletes the auth user if no profile appeared.
- **"Cash held"** = non-voided CASH payments recorded by the courier in the selected period. A real handover workflow is post-MVP.
- **Periods** are inclusive Ulaanbaatar calendar days in the UI, converted to half-open `[from, to)` timestamptz ranges (`ubDayRange`).
- **Reports:** single-series daily bar chart (no chart library) with the same data as a table; CSV export of deliveries created in the period (UTF-8 BOM for Excel, formula-injection safe).
- **Payments list** shows at most 200 records per period (narrow the period for more).
- `pnpm db:types` writes atomically and refuses empty output, so a stopped database can't wipe the types file.

## Implementation Notes (Phase 5)

- Expo **SDK 58** (React Native 0.88), Expo Router with routes in `apps/courier/src/app/` and `Stack.Protected` for the auth gate. Started from the `blank-typescript` template; template-provided `.claude/settings.json` (plugin enablement) and LICENSE were removed.
- **Session storage:** `expo-secure-store` (D8) through a chunked adapter (`src/lib/secure-storage.ts`) — Supabase sessions exceed the ~2 KB some iOS versions accept per value. Expo docs suggest `expo-sqlite` instead; we kept the approved dependency.
- `react-native-url-polyfill` is **not** used (Expo installs a `URL` global, per the Expo Supabase guide).
- **Courier gate:** only active COURIER profiles stay signed in (`src/lib/auth.tsx`); others are signed out with a Mongolian message.
- **Realtime:** the courier listens to `deliveries` *and* own `notifications` inserts. A delivery taken away becomes invisible under RLS, so it never arrives as a deliveries event — the notification row (written in the same transaction) is what tells the app to refresh.
- **Confirmations** use our own bottom `Sheet` instead of `Alert.alert` (same look on Android/iOS, and works in the web preview).
- **Web preview** (`react-native-web`, `react-dom`) is for development verification only; the product targets Android/iOS.
- Additional Expo-maintained packages: `@expo/vector-icons` (no longer bundled in SDK 58), `@expo-google-fonts/inter` + `expo-font` (Inter per design system), `eslint-config-expo` (dev).
- Not in Phase 5: receipt photo upload for bank transfers (needs an image picker — approval required), push notifications (Phase 6).

## Approved Decisions

Approved on 2026-11-05.

| # | Topic | Decision |
|---|-------|----------|
| D1 | Courier return | Courier may return an **ASSIGNED** delivery with a **mandatory reason**; not allowed once IN_PROGRESS. Status → UNASSIGNED; reason stored in assignment and status history. RPC: `return_delivery`. |
| D2 | Courier login | Admin-created email/password accounts. No SMS OTP in MVP. |
| D3 | Phone privacy | Customer phone is hidden from couriers until they claim or are assigned the delivery. |
| D4 | Payments | One full payment per delivery. No partial payments. |
| D5 | Available push | Push to all active couriers when a delivery becomes available, with throttling (Section 9). |
| D6 | ASSIGNED color | `#2563EB` |
| D7 | Locale | Currency MNT, time zone `Asia/Ulaanbaatar`. |
| D8 | Dependencies | `zod`, `@supabase/ssr`, `expo-secure-store` approved. Dev-only: `typescript`, `vitest` (testing strategy), `supabase` CLI. |
| D9 | UI language | Mongolian for all user-facing text (labels, errors, notifications). Code, comments and docs stay in English. |

Standing rules:
- Preserve complete assignment and return history (no deletes, closed rows only).
- Never allow ordinary reassignment while IN_PROGRESS.
- Payment status is independent from delivery status.
- All critical business rules are enforced at database level.
- No MVP scope expansion without approval.
