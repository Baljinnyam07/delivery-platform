#!/usr/bin/env bash
# Concurrency test: N couriers claim the same delivery at the same instant.
# Expect exactly 1 success, N-1 DELIVERY_NOT_AVAILABLE, 1 active assignment.
#
# Requires local Supabase running (pnpm supabase start).
# Usage: bash supabase/tests/concurrency/claim_race.sh   [N=20]
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-supabase_db_delivery-platform}"
N="${N:-20}"

sql() { docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qtAX "$@"; }

DELIVERY_ID=$(sql -c "insert into public.deliveries (customer_name, customer_phone, address)
                      values ('Race test', '0', 'Race street') returning id;")

COURIER_IDS=$(sql -c "
  insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
  select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
         'race-' || g || '-' || gen_random_uuid() || '@test.local',
         '{\"role\":\"COURIER\"}'::jsonb, jsonb_build_object('full_name', 'Race ' || g)
  from generate_series(1, $N) g
  returning id;")

cleanup() {
  sql -c "
    delete from public.notifications where delivery_id = '$DELIVERY_ID' or recipient_id in (select id from auth.users where email like 'race-%@test.local');
    delete from public.delivery_assignments where delivery_id = '$DELIVERY_ID';
    delete from public.delivery_status_history where delivery_id = '$DELIVERY_ID';
    delete from public.deliveries where id = '$DELIVERY_ID';
    delete from auth.users where email like 'race-%@test.local';" >/dev/null
}
trap cleanup EXIT

START_AT=$(sql -c "select (now() + interval '3 seconds')::text;")
RESULTS=$(mktemp)

for id in $COURIER_IDS; do
  (
    if sql -c "select pg_sleep_until('$START_AT');
               select set_config('request.jwt.claims', json_build_object('sub', '$id', 'role', 'authenticated')::text, false);
               select public.claim_delivery('$DELIVERY_ID');" >/dev/null 2>"$RESULTS.$id"; then
      echo OK >> "$RESULTS"
    elif grep -q DELIVERY_NOT_AVAILABLE "$RESULTS.$id"; then
      echo TAKEN >> "$RESULTS"
    else
      echo "ERROR $(cat "$RESULTS.$id")" >> "$RESULTS"
    fi
    rm -f "$RESULTS.$id"
  ) &
done
wait

OK=$(grep -c '^OK' "$RESULTS" || true)
TAKEN=$(grep -c '^TAKEN' "$RESULTS" || true)
ERRORS=$(grep -c '^ERROR' "$RESULTS" || true)
ACTIVE=$(sql -c "select count(*) from public.delivery_assignments where delivery_id = '$DELIVERY_ID' and ended_at is null;")
rm -f "$RESULTS"

echo "claims: $N  success: $OK  rejected: $TAKEN  errors: $ERRORS  active assignments: $ACTIVE"

if [[ "$OK" == "1" && "$TAKEN" == "$((N - 1))" && "$ACTIVE" == "1" ]]; then
  echo "PASS"
else
  echo "FAIL"
  exit 1
fi
