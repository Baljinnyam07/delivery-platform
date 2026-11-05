# Delivery Management Platform

## Product Vision

A modern delivery management platform
for small and medium-sized delivery businesses.

The system consists of:
- Admin Web Application
- Courier Mobile Application

## Main Objective

Prevent:
- Duplicate delivery assignments.
- Forgotten or unassigned deliveries.
- Unclear courier responsibilities.
- Missing payment records.

## User Roles

### Admin
- Register deliveries.
- Assign deliveries to couriers.
- Reassign deliveries when authorized.
- Monitor all delivery operations.
- Manage couriers.
- Track payments.
- View reports.

### Courier
- View assigned deliveries.
- Browse available deliveries.
- Claim available deliveries.
- Open Google Maps navigation.
- Update delivery status.
- Record payment collection.

## Delivery Statuses

- UNASSIGNED
- ASSIGNED
- IN_PROGRESS
- DELIVERED
- CANCELLED

## Payment

Methods:
- CASH
- BANK_TRANSFER

Statuses:
- PAID
- UNPAID

## Core Business Rules

1. One delivery can have only one active courier.
2. Concurrent assignment must be prevented.
3. Every status change must be recorded.
4. Every reassignment must be audited.
5. Unassigned deliveries must be visible.
6. Payment and delivery statuses are independent.
7. Admin creates all delivery records.
8. Couriers can claim unassigned deliveries.

## Assignment Rules

- Admin can assign any unassigned delivery.
- Couriers can claim unassigned deliveries.
- One delivery can only belong to one active courier.
- Concurrent claims are protected at database level
  (PostgreSQL transactions and atomic RPC functions).
- Reassignment creates an audit record.
- Deliveries already IN_PROGRESS cannot be reassigned
  through normal assignment operations.

## Tech Stack (approved)

Admin:
- Next.js (latest stable), React, TypeScript
- Tailwind CSS, shadcn/ui, Lucide React

Mobile:
- Expo, React Native, TypeScript, Expo Router

Backend:
- Supabase: PostgreSQL, Auth, Realtime, Storage

Additional:
- Google Maps navigation links
- Expo Push Notifications
- Vercel (admin deployment)
- EAS Build (mobile builds)

## Database Tables

- profiles
- deliveries
- delivery_assignments
- delivery_status_history
- payment_records
- notifications

## Security

- Supabase Row Level Security on every table.
- Role-based access (ADMIN, COURIER).
- Sensitive operations only via server-side
  authorization and database functions.
- Supabase service role key is never exposed to clients.
- Unauthorized status changes are impossible at database level.
- Complete audit history.

## MVP Scope

- Admin dashboard
- Delivery CRUD
- Courier management
- Delivery assignment
- Courier mobile application
- Google Maps navigation
- Payment tracking
- Delivery history
- Basic reports

## Out of Scope for MVP

- Live GPS tracking
- Route optimization
- Online payment gateway
- Customer-facing mobile application
