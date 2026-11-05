# Design System

## Design Philosophy

Premium, minimal, modern B2B SaaS.
Inspired by Linear, Stripe and modern
logistics management platforms.

Avoid generic admin dashboard templates.

## Visual Direction

- Light theme first.
- White surfaces.
- Soft neutral background.
- Clear visual hierarchy.
- Professional typography.
- Consistent spacing.
- Subtle borders.
- Minimal shadows.
- No excessive gradients.
- No unnecessary decorative cards.

## Tokens

| Token            | Value       |
|------------------|-------------|
| Background       | `#F8FAFC`   |
| Surface          | `#FFFFFF`   |
| Primary          | `#2563EB`   |
| Text             | `#0F172A`   |
| Secondary text   | `#64748B`   |
| Border           | `#E2E8F0`   |
| Typography       | Inter       |
| Border radius    | 10–12px     |
| Shadows          | Very subtle |
| Theme            | Light first |

### Delivery status colors

| Status       | Color     |
|--------------|-----------|
| DELIVERED    | `#16A34A` |
| IN_PROGRESS  | `#EAB308` |
| ASSIGNED     | `#2563EB` (primary) |
| CANCELLED    | `#DC2626` |
| UNASSIGNED   | `#94A3B8` |

> ASSIGNED was not defined in the original palette; Primary is proposed. Needs approval.

### Payment status colors

| Status | Color     |
|--------|-----------|
| PAID   | `#16A34A` |
| UNPAID | `#DC2626` |

Status badges: soft tinted background (~10% opacity)
+ solid dot + colored text. Never color alone —
always include the label text.

## Typography

Use Inter.

Clear hierarchy:
- Page titles
- Section headings
- Body text
- Supporting labels

Numbers in tables and KPIs use tabular figures.

## Components

- Sidebar navigation
- Data tables
- Search and filters
- Status badges
- Dropdown menus
- Dialogs
- Toast notifications
- Empty states
- Loading skeletons
- Confirmation dialogs

## Admin UX

Desktop-first, responsive.
Sidebar navigation.
Compact but readable tables.
Quick delivery creation.
Clear operational dashboard.

## Courier UX

Mobile-first.
Large touch targets (min 48px).
Minimal navigation.
Easy access to phone and maps.
Clear delivery action buttons.
Avoid complex forms.

## Design References

Stored in `docs/design-references/`. They define **layout and
composition only** — colors always come from the tokens above.

| File | Use for |
|------|---------|
| `01-admin-dashboard.webp` | Admin shell: sidebar with grouped sections, top bar with date range + primary action, KPI strip with thin dividers and delta chips, card sections. |
| `02-delivery-table.png` | Deliveries table: KPI cards above, segmented status filter, search + filter + sort toolbar, pill status badges, row actions menu, pagination. |
| `03-courier-mobile.webp` | Courier app: shift-style delivery list, large dark primary button, detail sheet with key/value rows, contact buttons, prominent single action. |

Not adopted from references: green/orange/purple palettes,
live map tracking (out of MVP scope), decorative gradients.

## Important

Design every screen as a cohesive product.
Do not change this design direction without approval.
Avoid unnecessary UI libraries.
