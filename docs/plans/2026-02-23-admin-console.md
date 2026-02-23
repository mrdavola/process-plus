# Admin Console Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a role-gated `/admin` page with Users and Studios tabs so admins can manage user roles and view platform-wide studio data.

**Architecture:** Single `/admin` Next.js page with client-side role guard (redirects non-admins to `/dashboard`). Two tabs rendered as local state. Two new Firestore functions (`getAllUsers`, `getAllStudios`) load data on mount. One Firestore rule change allows admins to update any user document.

**Tech Stack:** Next.js App Router, Firebase Firestore, TypeScript, Tailwind CSS. Existing `updateUserRole(uid, role)` in `firestore.ts` is reused for role changes.

---

### Task 1: Add `getAllUsers` and `getAllStudios` to firestore.ts

**Files:**
- Modify: `src/lib/firestore.ts` (add two exports at the end)

**Step 1: Add `getAllUsers` and `getAllStudios` functions**

Append to the bottom of `src/lib/firestore.ts`:

```typescript
export async function getAllUsers(): Promise<UserProfile[]> {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
}

export async function getAllStudios(): Promise<Studio[]> {
    const snap = await getDocs(collection(db, "studios"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Studio));
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -v "CreateProjectModal\|tailwind.config"`
Expected: no new errors

**Step 3: Commit**

```bash
git add src/lib/firestore.ts
git commit -m "feat: add getAllUsers and getAllStudios admin queries"
```

---

### Task 2: Update Firestore rules to allow admin user updates

**Files:**
- Modify: `firestore.rules`

**Step 1: Update the users rule**

Find this block in `firestore.rules`:

```
match /users/{userId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.auth.uid == userId;
  allow update, delete: if request.auth != null && request.auth.uid == userId;
}
```

Replace with:

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

**Step 2: Deploy the rules**

Run: `npx firebase deploy --only firestore:rules`
Expected: `✔  Deploy complete!`

**Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: allow admins to update any user document for role management"
```

---

### Task 3: Create UserTable component

**Files:**
- Create: `src/components/admin/UserTable.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { UserProfile, UserRole } from "@/lib/types";
import { updateUserRole } from "@/lib/firestore";

interface UserTableProps {
    users: UserProfile[];
}

const ROLE_OPTIONS: UserRole[] = ["student", "teacher", "admin"];

const ROLE_COLORS: Record<UserRole, string> = {
    student: "bg-blue-50 text-blue-700 border-blue-200",
    teacher: "bg-green-50 text-green-700 border-green-200",
    admin: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function UserTable({ users }: UserTableProps) {
    const [search, setSearch] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [localRoles, setLocalRoles] = useState<Record<string, UserRole>>({});

    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });

    const handleRoleChange = async (uid: string, newRole: UserRole) => {
        setUpdatingId(uid);
        try {
            await updateUserRole(uid, newRole);
            setLocalRoles(prev => ({ ...prev, [uid]: newRole }));
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="space-y-4">
            <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber"
            />
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-4 py-3 font-bold text-slate-600">Name</th>
                            <th className="text-left px-4 py-3 font-bold text-slate-600">Email</th>
                            <th className="text-left px-4 py-3 font-bold text-slate-600">Role</th>
                            <th className="text-left px-4 py-3 font-bold text-slate-600">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {filtered.map(u => {
                            const role = localRoles[u.uid] ?? u.role;
                            return (
                                <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-800">{u.displayName}</td>
                                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={role}
                                            disabled={updatingId === u.uid}
                                            onChange={e => handleRoleChange(u.uid, e.target.value as UserRole)}
                                            className={`text-xs font-bold border rounded-full px-2.5 py-1 cursor-pointer disabled:opacity-50 ${ROLE_COLORS[role]}`}
                                        >
                                            {ROLE_OPTIONS.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">
                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No users found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-400">{filtered.length} of {users.length} users</p>
        </div>
    );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -v "CreateProjectModal\|tailwind.config"`
Expected: no new errors

**Step 3: Commit**

```bash
git add src/components/admin/UserTable.tsx
git commit -m "feat: add admin UserTable component with role management"
```

---

### Task 4: Create StudioTable component

**Files:**
- Create: `src/components/admin/StudioTable.tsx`

**Step 1: Create the component**

```tsx
"use client";

import Link from "next/link";
import { Studio } from "@/lib/types";
import { ExternalLink } from "lucide-react";

interface StudioTableProps {
    studios: Studio[];
}

export default function StudioTable({ studios }: StudioTableProps) {
    const sorted = [...studios].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="text-left px-4 py-3 font-bold text-slate-600">Studio</th>
                        <th className="text-left px-4 py-3 font-bold text-slate-600">Code</th>
                        <th className="text-left px-4 py-3 font-bold text-slate-600">Status</th>
                        <th className="text-left px-4 py-3 font-bold text-slate-600">Created</th>
                        <th className="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {sorted.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-800">{s.title}</td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-xs">{s.processPlusCode}</td>
                            <td className="px-4 py-3">
                                <span className={`text-xs font-bold border rounded-full px-2.5 py-1 ${
                                    s.status === "active"
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : "bg-slate-100 text-slate-500 border-slate-200"
                                }`}>
                                    {s.status}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs">
                                {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-4 py-3">
                                <Link
                                    href={`/studio/${s.processPlusCode}`}
                                    target="_blank"
                                    className="flex items-center gap-1 text-xs font-bold text-brand-amber hover:underline"
                                >
                                    View <ExternalLink size={12} />
                                </Link>
                            </td>
                        </tr>
                    ))}
                    {studios.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No studios yet.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -v "CreateProjectModal\|tailwind.config"`
Expected: no new errors

**Step 3: Commit**

```bash
git add src/components/admin/StudioTable.tsx
git commit -m "feat: add admin StudioTable component"
```

---

### Task 5: Create /admin page

**Files:**
- Create: `src/app/admin/page.tsx`

**Step 1: Create the admin page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Users, Building2, Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import UserTable from "@/components/admin/UserTable";
import StudioTable from "@/components/admin/StudioTable";
import { useAuth } from "@/lib/auth-context";
import { getAllUsers, getAllStudios } from "@/lib/firestore";
import { UserProfile, Studio } from "@/lib/types";

type AdminTab = "users" | "studios";

const ORANGE = "#c2410c";

export default function AdminPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [tab, setTab] = useState<AdminTab>("users");
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [studios, setStudios] = useState<Studio[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user || profile?.role !== "admin") {
            router.replace("/dashboard");
            return;
        }

        async function load() {
            try {
                const [allUsers, allStudios] = await Promise.all([
                    getAllUsers(),
                    getAllStudios(),
                ]);
                setUsers(allUsers);
                setStudios(allStudios);
            } catch (e) {
                console.error("Admin load error:", e);
            } finally {
                setIsLoading(false);
            }
        }

        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, user, profile]);

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-brand-cream flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-cream text-brand-warm pb-24">
            <Navbar />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
                {/* Header */}
                <header className="mb-10 pb-8 border-b border-slate-200">
                    <div
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-3 px-3 py-1.5 rounded-full"
                        style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}
                    >
                        <Shield size={14} />
                        Admin Console
                    </div>
                    <h1 className="text-4xl font-display leading-tight text-brand-warm">
                        Platform <span style={{ color: ORANGE }}>Management</span>
                    </h1>
                    <p className="mt-2 text-slate-500 font-medium">
                        {users.length} users · {studios.length} studios
                    </p>
                </header>

                {/* Tabs */}
                <div className="flex gap-1 mb-8 bg-white rounded-2xl p-1.5 border border-slate-200 w-fit">
                    <button
                        onClick={() => setTab("users")}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            tab === "users"
                                ? "bg-brand-cream text-brand-warm shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <Users size={15} />
                        Users ({users.length})
                    </button>
                    <button
                        onClick={() => setTab("studios")}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            tab === "studios"
                                ? "bg-brand-cream text-brand-warm shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <Building2 size={15} />
                        Studios ({studios.length})
                    </button>
                </div>

                {/* Tab content */}
                {tab === "users" && <UserTable users={users} />}
                {tab === "studios" && <StudioTable studios={studios} />}
            </div>
        </div>
    );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -v "CreateProjectModal\|tailwind.config"`
Expected: no new errors

**Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: add admin console page with Users and Studios tabs"
```

---

### Task 6: Add Admin link to Navbar

**Files:**
- Modify: `src/components/layout/Navbar.tsx`

**Step 1: Add admin link after the Journey link**

In `Navbar.tsx`, after the Journey link block (around line 38-43), add:

```tsx
{profile?.role === "admin" && !pathname.startsWith("/admin") && (
    <Link href="/admin" className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-purple-600 hover:text-purple-800 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors">
        <Shield size={15} />
        Admin
    </Link>
)}
```

Also add `Shield` to the lucide-react import line.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -v "CreateProjectModal\|tailwind.config"`
Expected: no new errors

**Step 3: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "feat: show Admin link in navbar for admin users"
```

---

### Task 7: Set your admin account in Firebase console

This is a manual step, not code.

1. Go to [Firebase console](https://console.firebase.google.com/project/processplus-ef80e/firestore) → Firestore → `users` collection
2. Find your user document (search by email or UID)
3. Click the document → Edit the `role` field → change value from `"teacher"` to `"admin"`
4. Save

After this, sign out and back in (or reload), then `/admin` will be accessible and the Admin link will appear in the navbar.

**Verification:**
- Navigate to `/admin` — should load the console (not redirect)
- The Admin link should appear in the navbar
- Change a user's role in the Users tab — should update in Firestore
