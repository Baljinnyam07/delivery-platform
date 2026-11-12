# Courier App — Manual QA Checklist

Run on **one Android and one iPhone** (preview build, see DEPLOYMENT.md §3) before the pilot
and after every release. Use test couriers and test deliveries only.

Device / OS / build: ____________________ Tester: __________ Date: __________

## Sign-in
- [ ] Wrong password → "И-мэйл эсвэл нууц үг буруу байна."
- [ ] Admin account → "Зөвхөн курьерын эрхээр нэвтрэх боломжтой."
- [ ] Deactivated courier → "Таны эрх идэвхгүй байна…"
- [ ] Close and reopen the app → still signed in.
- [ ] Airplane mode, reopen the app → still signed in (no forced logout); lists show a connection error with "Дахин".

## My deliveries / Available / History
- [ ] Assigned and in-progress deliveries are grouped; pull to refresh works.
- [ ] Available list hides customer phone; claiming opens the delivery and shows the phone.
- [ ] Two phones claim the same delivery at once → exactly one succeeds; the other sees "Энэ хүргэлтийг өөр курьер авсан байна."
- [ ] History shows delivered/cancelled grouped by day (Ulaanbaatar time).

## Delivery actions
- [ ] "Залгах" opens the dialer with the customer number.
- [ ] "Чиглэл" opens Google Maps (app if installed, browser otherwise) at the right address.
- [ ] Start → status "Хүргэж байна"; "Буцаах" is no longer offered.
- [ ] Return (assigned only) requires a reason; delivery reappears in Available for others.
- [ ] Complete without payment → warning sheet; complete after payment → simple confirmation.
- [ ] Record payment: Cash and Bank transfer; amount equals the delivery amount; second attempt impossible.

## Realtime & push
- [ ] Admin assigns a delivery → push arrives (app closed) → tap opens that delivery.
- [ ] Admin reassigns away / cancels → push arrives; the delivery disappears from "Миний" without manual refresh.
- [ ] Every new delivery → one push per courier, titled "Шинэ хүргэлт: <code>" with the address.
- [ ] Profile shows notification state; denied → "Тохиргоо нээх" opens system settings.
- [ ] Sign out → no more pushes to this phone.

## UI
- [ ] All text Mongolian, no clipped labels on a small phone (≈ 360 pt wide).
- [ ] Buttons are easy to hit with a thumb; bottom action bar never hidden by the home indicator.
- [ ] Large system font size still usable.
