# Admin Console Design
_Date: 2026-02-23_

## Overview

A role-gated `/admin` page for Process+ platform administrators. Provides user management (view all accounts, change roles) and platform oversight (view all studios). Supports a small team of 2–5 admins.

## Role System

The `"admin"` UserRole already exists in `types.ts`. No type changes needed.

**Bootstrapping the first admin:** The developer manually sets `role: "admin"` on their user document in the Firebase console. All subsequent admin promotions happen through the admin console UI.

## Architecture

### Route

- `/admin` — single page, client-side role guard redirects non-admins to `/dashboard`
- No sub-routes needed

### Components

| Component | Location |
|---|---|
| Admin page | `src/app/admin/page.tsx` |
| UserTable | `src/components/admin/UserTable.tsx` |
| StudioTable | `src/components/admin/StudioTable.tsx` |

### Data

- **Users:** `getAllUsers()` function added to `firestore.ts` — reads entire `users` collection
- **Studios:** `getAllStudios()` function added to `firestore.ts` — reads entire `studios` collection
- Both load on page mount; no pagination initially (early-stage platform)

## Firestore Rules

One rule change needed: admins must be able to update any user document (to change roles).

```
match /users/{userId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.auth.uid == userId;
  allow update, delete: if request.auth != null && (
    request.auth.uid == userId ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
  );
}
```

## UI: Users Tab

- Search box: filters by display name or email (client-side)
- Table columns: Display Name, Email, Role, Joined Date
- Role column: dropdown (student / teacher / admin) — updates Firestore on change
- Row count shown in tab label

## UI: Studios Tab

- Table columns: Title, Owner ID, Status (active/archived), Created Date, Link
- Each row has a "View Studio" link to `/studio/[processPlusCode]`
- Read-only — no edit actions in this tab

## Security

- Client-side: page redirects if `profile?.role !== "admin"`
- Firestore: admin role check in update rule prevents unauthorized role changes
- Studios collection is already publicly readable — no rule change needed
