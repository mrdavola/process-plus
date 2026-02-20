# Flipgrid Full Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up all Flipgrid features to real Firebase — auth with admin/teacher/student roles, grid creation with join codes, topic creation, recorder with camera preview + countdown + draggable stickies + camera-off-when-idle, selfie capture, upload to Storage, and live response grid.

**Architecture:** Firebase Auth with custom Firestore `users` doc for role (admin/teacher/student). Teachers create Grids (with unique flipCode join links) and Topics. Students join via flipCode, record video responses through a state-machine recorder. All media uploads to Firebase Storage. TopicPage fetches live from Firestore with a real-time listener that refreshes after submit.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Firebase 12 (Auth, Firestore, Storage), react-media-recorder, lucide-react

---

## Overview of Tasks

1. Auth context + role system (admin/teacher/student)
2. Sign-in / Sign-up pages wired to Firebase Auth
3. Teacher dashboard — My Grids page
4. Create Grid modal (with join code)
5. Grid detail page — Topics list
6. Create Topic modal
7. Recorder: camera preview in IDLE + camera off when not recording
8. Recorder: 3-2-1 countdown state
9. Recorder: draggable sticky notes overlay while recording
10. Recorder: fix SubmitState to use real topicId + userId
11. TopicPage: replace mock data with real Firestore + real-time listener
12. TheaterModal: next/prev navigation
13. SelfieState: fix stream cleanup bug
14. Student join flow: enter flipCode → find grid → see topics

---

## Task 1: Auth Context + User Role System

**Goal:** Provide `useAuth()` hook that exposes `user`, `role`, and `loading` throughout the app. On first sign-in, create a Firestore `users/{uid}` doc with role defaulting to `student`. Admin can promote others.

**Files:**
- Create: `src/lib/auth-context.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/lib/firestore.ts` (add `getOrCreateUserProfile`, `getUserProfile`)
- Modify: `src/lib/types.ts` (add `UserProfile` interface)

**Step 1: Add UserProfile type to types.ts**

In `src/lib/types.ts`, add at the top:

```typescript
export type UserRole = "admin" | "teacher" | "student";

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    createdAt?: number;
}
```

**Step 2: Add Firestore helpers for user profiles**

In `src/lib/firestore.ts`, add these imports and functions:

```typescript
import { setDoc } from "firebase/firestore";
import { UserProfile } from "./types";

export async function getOrCreateUserProfile(uid: string, email: string, displayName: string): Promise<UserProfile> {
    const docRef = doc(db, "users", uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return snap.data() as UserProfile;
    }
    const profile: UserProfile = {
        uid,
        email,
        displayName,
        role: "student",
        createdAt: Date.now(),
    };
    await setDoc(docRef, profile);
    return profile;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, "users", uid);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
    await updateDoc(doc(db, "users", uid), { role });
}
```

Also add missing import `setDoc` to the existing import block and `UserRole` to the types import.

**Step 3: Create auth context**

Create `src/lib/auth-context.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebase";
import { getOrCreateUserProfile } from "./firestore";
import { UserProfile } from "./types";

interface AuthContextValue {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                const p = await getOrCreateUserProfile(
                    firebaseUser.uid,
                    firebaseUser.email ?? "",
                    firebaseUser.displayName ?? "User"
                );
                setProfile(p);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });
        return unsub;
    }, []);

    return <AuthContext.Provider value={{ user, profile, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
```

**Step 4: Wrap layout with AuthProvider**

In `src/app/layout.tsx`, import and wrap:

```tsx
import { AuthProvider } from "@/lib/auth-context";

// Inside RootLayout, wrap children:
<AuthProvider>{children}</AuthProvider>
```

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/firestore.ts src/lib/auth-context.tsx src/app/layout.tsx
git commit -m "feat: add auth context and user role system"
```

---

## Task 2: Sign-In Page (Google + Email)

**Goal:** `/login` page with Google Sign-In button and email/password fallback. After login, redirect based on role: admin/teacher → `/dashboard`, student → `/join`.

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/lib/auth-helpers.ts`

**Step 1: Create auth helpers**

Create `src/lib/auth-helpers.ts`:

```typescript
import {
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
} from "firebase/auth";
import { auth } from "./firebase";

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
    return signInWithPopup(auth, googleProvider);
}

export async function signInWithEmail(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    return cred;
}

export async function logout() {
    return signOut(auth);
}
```

**Step 2: Create login page**

Create `src/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video } from "lucide-react";
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "@/lib/auth-helpers";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

export default function LoginPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!loading && user && profile) {
            if (profile.role === "admin" || profile.role === "teacher") {
                router.push("/dashboard");
            } else {
                router.push("/join");
            }
        }
    }, [user, profile, loading, router]);

    const handleGoogle = async () => {
        setBusy(true);
        setError(null);
        try {
            await signInWithGoogle();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const handleEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            if (mode === "signin") {
                await signInWithEmail(email, password);
            } else {
                await signUpWithEmail(email, password, displayName);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
                <div className="flex items-center gap-3 mb-8">
                    <div className="flex items-center justify-center size-10 rounded-xl bg-sky-50 text-sky-500">
                        <Video size={24} className="fill-current" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">Flipgrid <span className="text-sky-500">Rebuild</span></span>
                </div>

                <h1 className="text-2xl font-black text-slate-900 mb-2">
                    {mode === "signin" ? "Welcome back" : "Create account"}
                </h1>
                <p className="text-slate-500 mb-8">
                    {mode === "signin" ? "Sign in to your account" : "Join as a teacher or educator"}
                </p>

                <button
                    onClick={handleGoogle}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700 mb-6 disabled:opacity-50"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Continue with Google
                </button>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                    <div className="relative flex justify-center text-sm"><span className="bg-white px-3 text-slate-400">or</span></div>
                </div>

                <form onSubmit={handleEmail} className="space-y-4">
                    {mode === "signup" && (
                        <input
                            type="text"
                            placeholder="Display Name"
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
                    />
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
                    >
                        {busy ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-500">
                    {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                        className="text-sky-500 font-bold hover:underline"
                    >
                        {mode === "signin" ? "Sign up" : "Sign in"}
                    </button>
                </p>

                <p className="mt-4 text-center text-xs text-slate-400">
                    Students: <a href="/join" className="text-sky-500 hover:underline">Join with a code instead →</a>
                </p>
            </div>
        </div>
    );
}
```

**Step 3: Commit**

```bash
git add src/app/login/page.tsx src/lib/auth-helpers.ts
git commit -m "feat: add login page with Google + email auth"
```

---

## Task 3: Teacher Dashboard — My Grids

**Goal:** `/dashboard` page (teacher/admin only). Shows all grids owned by the current user. Has a "+ New Grid" button that opens a modal.

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/grids/CreateGridModal.tsx`
- Modify: `src/lib/firestore.ts` (add `getGridsForOwner`)

**Step 1: Add getGridsForOwner to firestore.ts**

```typescript
export async function getGridsForOwner(ownerId: string): Promise<Grid[]> {
    const q = query(
        collection(db, "grids"),
        where("ownerId", "==", ownerId),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Grid));
}
```

**Step 2: Create dashboard page**

Create `src/app/dashboard/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Grid3X3, Video, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getGridsForOwner } from "@/lib/firestore";
import { logout } from "@/lib/auth-helpers";
import { Grid } from "@/lib/types";
import CreateGridModal from "@/components/grids/CreateGridModal";
import Link from "next/link";

export default function DashboardPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [grids, setGrids] = useState<Grid[]>([]);
    const [showCreateGrid, setShowCreateGrid] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
        if (!loading && profile && profile.role === "student") {
            router.push("/join");
        }
    }, [user, profile, loading, router]);

    useEffect(() => {
        if (user) {
            getGridsForOwner(user.uid).then(setGrids);
        }
    }, [user]);

    const handleGridCreated = (newGrid: Grid) => {
        setGrids(prev => [newGrid, ...prev]);
        setShowCreateGrid(false);
    };

    if (loading || !user || !profile) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Nav */}
            <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-sky-50 text-sky-500">
                            <Video size={24} className="fill-current" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900">Flipgrid</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500 hidden sm:block">{profile.displayName}</span>
                        <span className="text-xs px-2 py-1 bg-sky-100 text-sky-700 rounded-full font-bold uppercase">{profile.role}</span>
                        <button onClick={() => logout().then(() => router.push("/login"))} className="p-2 text-slate-500 hover:text-slate-900 transition-colors">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">My Grids</h1>
                        <p className="text-slate-500 mt-1">Manage your classrooms and communities</p>
                    </div>
                    <button
                        onClick={() => setShowCreateGrid(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all hover:scale-105"
                    >
                        <Plus size={20} />
                        New Grid
                    </button>
                </div>

                {grids.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                        <Grid3X3 size={48} className="mx-auto text-slate-300 mb-4" />
                        <h2 className="text-xl font-bold text-slate-500 mb-2">No grids yet</h2>
                        <p className="text-slate-400 mb-6">Create your first grid to get started</p>
                        <button onClick={() => setShowCreateGrid(true)} className="px-6 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-colors">
                            Create a Grid
                        </button>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {grids.map(grid => (
                            <Link
                                key={grid.id}
                                href={`/dashboard/grids/${grid.id}`}
                                className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                            >
                                <div className="h-32 bg-gradient-to-br from-sky-400 to-indigo-500 relative">
                                    {grid.theme && <img src={grid.theme} alt="" className="w-full h-full object-cover opacity-60" />}
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-slate-900 text-lg mb-1 truncate">{grid.title}</h3>
                                    <div className="flex items-center gap-2 mt-3">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Join Code</span>
                                        <span className="text-sm font-bold text-sky-500 bg-sky-50 px-2 py-0.5 rounded-lg">{grid.flipCode}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            {showCreateGrid && (
                <CreateGridModal
                    ownerId={user.uid}
                    onClose={() => setShowCreateGrid(false)}
                    onCreated={handleGridCreated}
                />
            )}
        </div>
    );
}
```

**Step 3: Create CreateGridModal**

Create `src/components/grids/CreateGridModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createGrid } from "@/lib/firestore";
import { Grid } from "@/lib/types";

interface CreateGridModalProps {
    ownerId: string;
    onClose: () => void;
    onCreated: (grid: Grid) => void;
}

export default function CreateGridModal({ ownerId, onClose, onCreated }: CreateGridModalProps) {
    const [title, setTitle] = useState("");
    const [flipCode, setFlipCode] = useState("");
    const [accessType, setAccessType] = useState<"domain" | "public">("public");
    const [domain, setDomain] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !flipCode.trim()) return;
        setBusy(true);
        setError(null);
        try {
            const gridData: Omit<Grid, "id"> = {
                ownerId,
                title: title.trim(),
                flipCode: flipCode.trim().toLowerCase(),
                allowedEmailDomains: accessType === "domain" && domain.trim() ? [domain.trim()] : [],
                theme: "",
                coPilots: [],
                createdAt: Date.now(),
            };
            const id = await createGrid(gridData);
            onCreated({ id, ...gridData });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-slate-900">New Grid</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Grid Name</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Mr. Davola's History Class"
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Flip Code (Join Code)</label>
                        <input
                            type="text"
                            value={flipCode}
                            onChange={e => setFlipCode(e.target.value.replace(/\s/g, ""))}
                            placeholder="davola2025"
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 font-mono"
                        />
                        <p className="text-xs text-slate-400 mt-1">Students will use this to join. Lowercase, no spaces.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Access Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setAccessType("public")}
                                className={`p-3 rounded-xl border-2 text-sm font-bold transition-colors ${accessType === "public" ? "border-sky-500 bg-sky-50 text-sky-600" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                            >
                                Public / PLC
                            </button>
                            <button
                                type="button"
                                onClick={() => setAccessType("domain")}
                                className={`p-3 rounded-xl border-2 text-sm font-bold transition-colors ${accessType === "domain" ? "border-sky-500 bg-sky-50 text-sky-600" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                            >
                                School Domain
                            </button>
                        </div>
                    </div>

                    {accessType === "domain" && (
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Allowed Email Domain</label>
                            <input
                                type="text"
                                value={domain}
                                onChange={e => setDomain(e.target.value)}
                                placeholder="@schools.org"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
                            />
                        </div>
                    )}

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={busy || !title.trim() || !flipCode.trim()}
                        className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
                    >
                        {busy ? "Creating..." : "Create Grid"}
                    </button>
                </form>
            </div>
        </div>
    );
}
```

**Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx src/components/grids/CreateGridModal.tsx src/lib/firestore.ts
git commit -m "feat: teacher dashboard with grid list and create modal"
```

---

## Task 4: Grid Detail Page (Teacher View — Topic List + Create Topic)

**Goal:** `/dashboard/grids/[gridId]` shows topics in this grid. Teacher can click "+ New Topic" to open CreateTopicModal. Each topic links to the public TopicView page.

**Files:**
- Create: `src/app/dashboard/grids/[gridId]/page.tsx`
- Create: `src/components/topics/CreateTopicModal.tsx`
- Modify: `src/lib/firestore.ts` (add `updateTopicStatus`, `sparkResponse`)

**Step 1: Add missing firestore helpers**

In `src/lib/firestore.ts`, add:

```typescript
export async function updateTopicStatus(topicId: string, status: TopicStatus): Promise<void> {
    await updateDoc(doc(db, "topics", topicId), { status });
}

export async function sparkResponse(responseId: string, gridId: string): Promise<string> {
    const respSnap = await getDoc(doc(db, "responses", responseId));
    if (!respSnap.exists()) throw new Error("Response not found");
    const resp = respSnap.data() as Response;
    const newTopicId = await createTopic({
        gridId,
        title: `Sparked: ${resp.userDisplayName}`,
        promptText: "",
        mediaResource: { type: "video", url: resp.videoUrl },
        settings: { maxDuration: 120, moderation: false },
        status: "active",
    });
    await updateDoc(doc(db, "responses", responseId), { sparkedFromId: newTopicId });
    return newTopicId;
}

export async function approveResponse(responseId: string): Promise<void> {
    await updateDoc(doc(db, "responses", responseId), { status: "active" });
}

export async function hideResponse(responseId: string): Promise<void> {
    await updateDoc(doc(db, "responses", responseId), { status: "hidden" });
}
```

Also add `TopicStatus` and `Response` to the import from `./types` at the top.

**Step 2: Create Grid Detail (teacher) page**

Create `src/app/dashboard/grids/[gridId]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, ArrowLeft, Copy, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getGrid, getTopicsForGrid } from "@/lib/firestore";
import { Grid, Topic } from "@/lib/types";
import CreateTopicModal from "@/components/topics/CreateTopicModal";
import Link from "next/link";

export default function GridDetailPage() {
    const { gridId } = useParams<{ gridId: string }>();
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [grid, setGrid] = useState<Grid | null>(null);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [showCreateTopic, setShowCreateTopic] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading, router]);

    useEffect(() => {
        if (gridId) {
            getGrid(gridId).then(setGrid);
            getTopicsForGrid(gridId).then(setTopics);
        }
    }, [gridId]);

    const handleTopicCreated = (t: Topic) => {
        setTopics(prev => [t, ...prev]);
        setShowCreateTopic(false);
    };

    const copyJoinLink = () => {
        if (grid) navigator.clipboard.writeText(`${window.location.origin}/join?code=${grid.flipCode}`);
    };

    if (loading || !grid) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex-1">
                        <h1 className="font-black text-slate-900 text-lg">{grid.title}</h1>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Join Code:</span>
                            <span className="text-xs font-bold text-sky-500 font-mono">{grid.flipCode}</span>
                            <button onClick={copyJoinLink} className="text-slate-400 hover:text-sky-500 transition-colors">
                                <Copy size={12} />
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateTopic(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                        <Plus size={16} />
                        New Topic
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {topics.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400 mb-4">No topics yet</p>
                        <button onClick={() => setShowCreateTopic(true)} className="px-6 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-colors">
                            Create First Topic
                        </button>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {topics.map(topic => (
                            <div key={topic.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <h3 className="font-bold text-slate-900 leading-tight">{topic.title}</h3>
                                        <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${topic.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                            {topic.status}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 text-sm line-clamp-2 mb-4">{topic.promptText}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                                        <span>Max: {topic.settings.maxDuration}s</span>
                                        {topic.settings.moderation && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Moderated</span>}
                                    </div>
                                    <Link
                                        href={`/grids/${grid.flipCode}/topics/${topic.id}`}
                                        className="flex items-center gap-1 text-sky-500 text-sm font-bold hover:text-sky-600 transition-colors"
                                    >
                                        <ExternalLink size={14} />
                                        View Topic Page
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {showCreateTopic && (
                <CreateTopicModal
                    gridId={gridId}
                    onClose={() => setShowCreateTopic(false)}
                    onCreated={handleTopicCreated}
                />
            )}
        </div>
    );
}
```

**Step 3: Create CreateTopicModal**

Create `src/components/topics/CreateTopicModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createTopic } from "@/lib/firestore";
import { Topic } from "@/lib/types";

interface CreateTopicModalProps {
    gridId: string;
    onClose: () => void;
    onCreated: (topic: Topic) => void;
}

const DURATION_OPTIONS = [15, 30, 60, 90, 180, 300];

export default function CreateTopicModal({ gridId, onClose, onCreated }: CreateTopicModalProps) {
    const [title, setTitle] = useState("");
    const [promptText, setPromptText] = useState("");
    const [maxDuration, setMaxDuration] = useState(120);
    const [moderation, setModeration] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !promptText.trim()) return;
        setBusy(true);
        setError(null);
        try {
            const topicData: Omit<Topic, "id"> = {
                gridId,
                title: title.trim(),
                promptText: promptText.trim(),
                settings: { maxDuration, moderation },
                status: "active",
                createdAt: Date.now(),
            };
            const id = await createTopic(topicData);
            onCreated({ id, ...topicData });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-slate-900">New Topic</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Topic Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Show & Tell: Your Favorite Hobby"
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Prompt / Question</label>
                        <textarea
                            value={promptText}
                            onChange={e => setPromptText(e.target.value)}
                            placeholder="What should students talk about in their video?"
                            required
                            rows={4}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Max Recording Duration</label>
                        <div className="flex flex-wrap gap-2">
                            {DURATION_OPTIONS.map(d => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setMaxDuration(d)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${maxDuration === d ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                                >
                                    {d < 60 ? `${d}s` : `${d / 60}m`}
                                </button>
                            ))}
                        </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <div
                            onClick={() => setModeration(!moderation)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${moderation ? "bg-sky-500" : "bg-slate-200"}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${moderation ? "translate-x-7" : "translate-x-1"}`} />
                        </div>
                        <div>
                            <span className="font-bold text-slate-900 text-sm">Video Moderation</span>
                            <p className="text-xs text-slate-400">Responses stay hidden until you approve them</p>
                        </div>
                    </label>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={busy || !title.trim() || !promptText.trim()}
                        className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
                    >
                        {busy ? "Creating..." : "Post Topic"}
                    </button>
                </form>
            </div>
        </div>
    );
}
```

**Step 4: Commit**

```bash
git add src/app/dashboard/grids/ src/components/topics/ src/lib/firestore.ts
git commit -m "feat: grid detail page and topic creation"
```

---

## Task 5: Student Join Flow

**Goal:** `/join` page where students enter a flipCode. No auth required. Resolves the flipCode to a grid, then shows the list of active topics. Clicking a topic goes to `/grids/[flipCode]/topics/[topicId]`.

**Files:**
- Create: `src/app/join/page.tsx`

**Step 1: Create join page**

Create `src/app/join/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Video, ArrowRight } from "lucide-react";
import { getGridByFlipCode, getTopicsForGrid } from "@/lib/firestore";
import { Grid, Topic } from "@/lib/types";
import { Suspense } from "react";

function JoinContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [code, setCode] = useState(searchParams.get("code") ?? "");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [grid, setGrid] = useState<Grid | null>(null);
    const [topics, setTopics] = useState<Topic[]>([]);

    // Auto-resolve if code in URL
    useEffect(() => {
        const urlCode = searchParams.get("code");
        if (urlCode) {
            setCode(urlCode);
            resolveCode(urlCode);
        }
    }, []);

    const resolveCode = async (flipCode: string) => {
        setBusy(true);
        setError(null);
        try {
            const g = await getGridByFlipCode(flipCode.trim().toLowerCase());
            if (!g) {
                setError("No grid found with that code. Check the code and try again.");
                return;
            }
            const t = await getTopicsForGrid(g.id);
            const activeTopics = t.filter(topic => topic.status === "active");
            setGrid(g);
            setTopics(activeTopics);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        resolveCode(code);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="flex items-center gap-3 mb-8 justify-center">
                    <div className="flex items-center justify-center size-10 rounded-xl bg-sky-50 text-sky-500">
                        <Video size={24} className="fill-current" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">Flipgrid <span className="text-sky-500">Rebuild</span></span>
                </div>

                {!grid ? (
                    <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
                        <h1 className="text-2xl font-black text-slate-900 mb-2 text-center">Join a Grid</h1>
                        <p className="text-slate-500 text-center mb-8">Enter the code your teacher gave you</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                type="text"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                placeholder="Enter join code..."
                                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 text-center text-xl font-bold tracking-widest font-mono"
                                autoFocus
                            />
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            <button
                                type="submit"
                                disabled={busy || !code.trim()}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold rounded-xl text-lg transition-colors"
                            >
                                {busy ? "Finding..." : "Join"}
                                {!busy && <ArrowRight size={20} />}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-slate-400">
                            Are you a teacher?{" "}
                            <a href="/login" className="text-sky-500 font-bold hover:underline">Sign in here</a>
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                        <div className="bg-gradient-to-br from-sky-400 to-indigo-500 p-8 text-white">
                            <h2 className="text-2xl font-black mb-1">{grid.title}</h2>
                            <p className="opacity-75 text-sm">Choose a topic to respond to</p>
                        </div>
                        <div className="p-4 divide-y divide-slate-100">
                            {topics.length === 0 ? (
                                <p className="py-8 text-center text-slate-400">No active topics in this grid yet.</p>
                            ) : (
                                topics.map(topic => (
                                    <button
                                        key={topic.id}
                                        onClick={() => router.push(`/grids/${grid.flipCode}/topics/${topic.id}`)}
                                        className="w-full text-left p-4 hover:bg-slate-50 transition-colors rounded-xl group"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-bold text-slate-900 group-hover:text-sky-500 transition-colors">{topic.title}</h3>
                                                <p className="text-slate-500 text-sm mt-1 line-clamp-2">{topic.promptText}</p>
                                            </div>
                                            <ArrowRight size={18} className="text-slate-300 group-hover:text-sky-400 transition-colors shrink-0 mt-1" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100">
                            <button onClick={() => { setGrid(null); setTopics([]); setCode(""); }} className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors">
                                Enter a different code
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function JoinPage() {
    return (
        <Suspense>
            <JoinContent />
        </Suspense>
    );
}
```

**Step 2: Commit**

```bash
git add src/app/join/page.tsx
git commit -m "feat: student join page with flipCode resolution"
```

---

## Task 6: TopicPage — Replace Mock Data with Real Firebase + Real-time Listener

**Goal:** Fetch real grid + topic from Firestore using `flipCode` and `topicId` from URL params. Subscribe to responses with a real-time listener so new submissions appear automatically. Pass real `topicId` and `userId` (or "guest") to RecorderModal.

**Files:**
- Modify: `src/app/grids/[flipCode]/topics/[topicId]/page.tsx`

**Step 1: Rewrite TopicPage**

Replace the entire file with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Plus, Share2, Copy, Video, Play, Filter, Search } from "lucide-react";
import { useParams } from "next/navigation";
import { Topic, Response, Grid } from "@/lib/types";
import { getGridByFlipCode, getTopic, getResponsesForTopic } from "@/lib/firestore";
import { onSnapshot, collection, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import ResponseCard from "@/components/topic/ResponseCard";
import TheaterModal from "@/components/topic/TheaterModal";
import dynamic from "next/dynamic";

const RecorderModal = dynamic(() => import("@/components/recorder/RecorderModal"), { ssr: false });

export default function TopicPage() {
    const params = useParams<{ flipCode: string; topicId: string }>();
    const { user } = useAuth();

    const [grid, setGrid] = useState<Grid | null>(null);
    const [topic, setTopic] = useState<Topic | null>(null);
    const [responses, setResponses] = useState<Response[]>([]);
    const [isRecorderOpen, setIsRecorderOpen] = useState(false);
    const [theaterIndex, setTheaterIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Load grid + topic
    useEffect(() => {
        if (!params.flipCode || !params.topicId) return;
        getGridByFlipCode(params.flipCode).then(setGrid);
        getTopic(params.topicId).then(setTopic);
    }, [params.flipCode, params.topicId]);

    // Real-time listener for responses
    useEffect(() => {
        if (!params.topicId) return;
        const q = query(
            collection(db, "responses"),
            where("topicId", "==", params.topicId),
            where("status", "==", "active"),
            orderBy("createdAt", "desc")
        );
        const unsub = onSnapshot(q, snap => {
            setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Response)));
        });
        return unsub;
    }, [params.topicId]);

    const filteredResponses = responses.filter(r =>
        r.userDisplayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
    };

    if (!topic) return <div className="min-h-screen flex items-center justify-center font-display text-slate-500">Loading...</div>;

    const activeResponses = filteredResponses;

    return (
        <div className="min-h-screen bg-slate-50 font-display flex flex-col">
            {/* Top Nav */}
            <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-sky-100 text-sky-500">
                            <Video size={24} className="fill-current" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900">Flipgrid</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {user ? (
                            <a href="/dashboard" className="text-sm font-bold text-sky-500 hover:text-sky-600">My Dashboard</a>
                        ) : (
                            <a href="/login" className="text-sm font-bold text-sky-500 hover:text-sky-600">Teacher Login</a>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">

                {/* Topic Header */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                    <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
                        {grid && (
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full">{grid.title}</span>
                            </div>
                        )}

                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.1]">
                            {topic.title}
                        </h1>

                        <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl">
                            {topic.promptText}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 pt-2">
                            {grid && (
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Join Code</span>
                                    <span className="text-lg font-bold text-sky-500">{grid.flipCode}</span>
                                    <button onClick={() => navigator.clipboard.writeText(grid.flipCode)} className="text-slate-400 hover:text-sky-500 transition-colors">
                                        <Copy size={16} />
                                    </button>
                                </div>
                            )}
                            <button onClick={copyLink} className="flex items-center gap-2 text-slate-900 font-bold hover:text-sky-500 transition-colors">
                                <span className="flex items-center justify-center size-8 rounded-full bg-slate-100">
                                    <Share2 size={16} />
                                </span>
                                Share Topic
                            </button>
                        </div>
                    </div>

                    {topic.mediaResource && (
                        <div className="lg:col-span-5">
                            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-soft group cursor-pointer bg-slate-900">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={topic.mediaResource.url} alt="Topic Media" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="size-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
                                        <Play size={32} className="fill-white text-white ml-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Stats Bar */}
                <div className="sticky top-16 z-30 bg-slate-50/95 backdrop-blur-sm py-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-slate-200/50 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-slate-900 leading-none">{responses.length}</span>
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Responses</span>
                            </div>
                            <div className="w-px h-8 bg-slate-300" />
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-lg">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                </span>
                                <span className="text-xs font-bold uppercase">Live</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 flex-1 md:justify-end">
                            <div className="relative flex-1 md:flex-none md:w-64">
                                <input
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all text-sm"
                                    placeholder="Search responses..."
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Masonry Grid */}
                <div className="columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6 pb-24">
                    {activeResponses.map((response, idx) => (
                        <div key={response.id} className="break-inside-avoid">
                            <ResponseCard response={response} onClick={() => setTheaterIndex(idx)} />
                        </div>
                    ))}
                </div>

                {activeResponses.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-slate-400 text-lg">No responses yet. Be the first!</p>
                    </div>
                )}

                {/* FAB */}
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                    <button
                        onClick={() => setIsRecorderOpen(true)}
                        className="flex items-center gap-3 bg-sky-500 hover:bg-sky-600 text-white px-8 py-4 rounded-full shadow-xl shadow-sky-500/40 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 active:scale-95 group"
                    >
                        <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                            <Video size={24} className="fill-current" />
                        </div>
                        <span className="text-lg font-bold tracking-wide">Record a Response</span>
                    </button>
                </div>
            </main>

            <RecorderModal
                isOpen={isRecorderOpen}
                onClose={() => setIsRecorderOpen(false)}
                topicId={params.topicId}
                topicTitle={topic.title}
                promptText={topic.promptText}
                maxDuration={topic.settings.maxDuration}
                userId={user?.uid ?? "guest"}
            />

            <TheaterModal
                responses={activeResponses}
                currentIndex={theaterIndex}
                onClose={() => setTheaterIndex(null)}
                onNavigate={setTheaterIndex}
            />
        </div>
    );
}
```

**Step 2: Commit**

```bash
git add src/app/grids/
git commit -m "feat: topic page wired to real firebase with live listener"
```

---

## Task 7: Recorder — Camera Off in IDLE, Preview Before Record, Countdown, Stickies

**Goal:**
- Camera only activates when user explicitly starts the recorder (camera off in IDLE black screen with just a record button)
- When user clicks Record, show live camera preview THEN 3-2-1 countdown overlay
- During RECORDING, show draggable sticky notes overlay (speaker outline tool)
- Camera stream fully released after recording stops or modal closes

**State machine:** `IDLE → PREVIEW → COUNTDOWN → RECORDING → REVIEW → SELFIE → SUBMIT`

NOTE: IDLE shows no camera. PREVIEW is when camera activates and user sees themselves and presses Record. COUNTDOWN is the 3-2-1 before recording actually starts.

**Files:**
- Modify: `src/components/recorder/RecorderModal.tsx`
- Modify: `src/components/recorder/IdleState.tsx`
- Create: `src/components/recorder/PreviewState.tsx`
- Create: `src/components/recorder/CountdownState.tsx`
- Modify: `src/components/recorder/RecordingState.tsx` (add stickies + fix pause timer)
- Modify: `src/components/recorder/SubmitState.tsx` (accept topicId, userId props)

**Step 1: Update RecorderModal to manage camera lifecycle and new states**

Replace `src/components/recorder/RecorderModal.tsx`:

```tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { X } from "lucide-react";

import IdleState from "./IdleState";
import PreviewState from "./PreviewState";
import CountdownState from "./CountdownState";
import RecordingState from "./RecordingState";
import ReviewState from "./ReviewState";
import SelfieState from "./SelfieState";
import SubmitState from "./SubmitState";

type RecorderState = "IDLE" | "PREVIEW" | "COUNTDOWN" | "RECORDING" | "REVIEW" | "SELFIE" | "SUBMIT";

interface RecorderModalProps {
    isOpen: boolean;
    onClose: () => void;
    topicId: string;
    topicTitle: string;
    promptText: string;
    maxDuration?: number;
    userId: string;
}

export default function RecorderModal({
    isOpen,
    onClose,
    topicId,
    topicTitle,
    promptText,
    maxDuration = 120,
    userId,
}: RecorderModalProps) {
    const [recorderState, setRecorderState] = useState<RecorderState>("IDLE");
    const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

    const { status, startRecording, stopRecording, pauseRecording, resumeRecording, mediaBlobUrl, clearBlobUrl } =
        useReactMediaRecorder({ video: true, askPermissionOnMount: false });

    // Release camera stream
    const stopCamera = useCallback(() => {
        if (previewStream) {
            previewStream.getTracks().forEach(t => t.stop());
            setPreviewStream(null);
        }
    }, [previewStream]);

    // Clean up on close
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            setRecorderState("IDLE");
            setSelfieBlob(null);
            clearBlobUrl();
        }
    }, [isOpen]);

    // Start camera for preview
    const openPreview = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setPreviewStream(stream);
            setRecorderState("PREVIEW");
        } catch (err) {
            console.error("Camera access denied:", err);
        }
    };

    // Begin countdown after user confirms
    const beginCountdown = () => {
        setRecorderState("COUNTDOWN");
    };

    // After countdown completes
    const startActualRecording = () => {
        stopCamera(); // react-media-recorder will get its own stream
        startRecording();
        setRecorderState("RECORDING");
    };

    if (!isOpen) return null;

    const showPrompt = recorderState !== "SUBMIT" && recorderState !== "SELFIE";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-5xl h-full max-h-[90vh] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">

                {/* Header Overlay */}
                {showPrompt && (
                    <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 pointer-events-none">
                        <div className="pointer-events-auto">
                            <div className="bg-[#FFDD00] text-black p-4 rounded-xl shadow-lg rotate-[-2deg] max-w-xs cursor-move hover:rotate-0 transition-transform duration-300">
                                <h3 className="font-bold text-sm uppercase tracking-wider mb-1 opacity-70">Prompt</h3>
                                <p className="font-medium leading-snug text-sm">{promptText}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { stopCamera(); onClose(); }}
                            className="pointer-events-auto bg-black/40 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>
                )}

                {/* Close button for selfie/submit states */}
                {!showPrompt && (
                    <div className="absolute top-0 left-0 right-0 p-6 flex justify-end z-20">
                        <button onClick={() => { stopCamera(); onClose(); }} className="bg-black/40 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur transition-all">
                            <X size={24} />
                        </button>
                    </div>
                )}

                {/* State Machine */}
                <div className="flex-1 relative bg-gray-900">
                    {recorderState === "IDLE" && (
                        <IdleState onRecord={openPreview} />
                    )}

                    {recorderState === "PREVIEW" && previewStream && (
                        <PreviewState
                            stream={previewStream}
                            onRecord={beginCountdown}
                            onCancel={() => { stopCamera(); setRecorderState("IDLE"); }}
                        />
                    )}

                    {recorderState === "COUNTDOWN" && previewStream && (
                        <CountdownState
                            stream={previewStream}
                            onComplete={startActualRecording}
                        />
                    )}

                    {recorderState === "RECORDING" && (
                        <RecordingState
                            status={status}
                            pauseRecording={pauseRecording}
                            resumeRecording={resumeRecording}
                            onFinish={() => {
                                stopRecording();
                                setRecorderState("REVIEW");
                            }}
                            maxDuration={maxDuration}
                            promptText={promptText}
                        />
                    )}

                    {recorderState === "REVIEW" && (
                        <ReviewState
                            videoUrl={mediaBlobUrl || null}
                            onRetake={() => {
                                clearBlobUrl();
                                setRecorderState("IDLE");
                            }}
                            onConfirm={() => setRecorderState("SELFIE")}
                        />
                    )}

                    {recorderState === "SELFIE" && (
                        <SelfieState
                            onConfirm={(blob) => {
                                setSelfieBlob(blob);
                                setRecorderState("SUBMIT");
                            }}
                            onRetake={() => setRecorderState("REVIEW")}
                        />
                    )}

                    {recorderState === "SUBMIT" && (
                        <SubmitState
                            videoBlobUrl={mediaBlobUrl!}
                            selfieBlob={selfieBlob!}
                            topicId={topicId}
                            topicTitle={topicTitle}
                            userId={userId}
                            onSuccess={() => {
                                onClose();
                                clearBlobUrl();
                                setRecorderState("IDLE");
                                setSelfieBlob(null);
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
```

**Step 2: Update IdleState (no camera, simple record button)**

Replace `src/components/recorder/IdleState.tsx`:

```tsx
"use client";

import { Video, Upload, Mic } from "lucide-react";

interface IdleStateProps {
    onRecord: () => void;
}

export default function IdleState({ onRecord }: IdleStateProps) {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
            <div className="relative group">
                <div className="absolute inset-0 bg-sky-400 blur-[80px] opacity-15 group-hover:opacity-30 transition-opacity duration-500 rounded-full" />
                <button
                    onClick={onRecord}
                    className="relative w-32 h-32 md:w-40 md:h-40 bg-sky-500 hover:bg-sky-400 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-sky-500/30 transform group-hover:scale-105 transition-all duration-300"
                >
                    <Video size={52} className="fill-current" />
                </button>
            </div>

            <h2 className="mt-8 text-2xl font-bold text-white tracking-tight">Add your response</h2>
            <p className="mt-2 text-white/50 text-sm">Click to turn on your camera</p>

            <div className="mt-12 flex gap-4">
                <button className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 text-sm font-medium transition-colors">
                    <Upload size={18} />
                    Import Video
                </button>
                <button className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 text-sm font-medium transition-colors">
                    <Mic size={18} />
                    Mic Only
                </button>
            </div>
        </div>
    );
}
```

**Step 3: Create PreviewState**

Create `src/components/recorder/PreviewState.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { Video, X } from "lucide-react";

interface PreviewStateProps {
    stream: MediaStream;
    onRecord: () => void;
    onCancel: () => void;
}

export default function PreviewState({ stream, onRecord, onCancel }: PreviewStateProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="absolute inset-0 flex flex-col bg-black">
            {/* Camera preview */}
            <div className="flex-1 relative overflow-hidden">
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
                />
                {/* Vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Bottom controls */}
            <div className="h-28 bg-black border-t border-white/10 flex items-center justify-center gap-8">
                <button
                    onClick={onCancel}
                    className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                >
                    <X size={18} />
                    Cancel
                </button>

                <button
                    onClick={onRecord}
                    className="flex items-center gap-3 px-8 py-4 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-2xl shadow-xl shadow-sky-500/30 transform hover:scale-105 transition-all duration-200"
                >
                    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                    </div>
                    Start Recording
                </button>
            </div>
        </div>
    );
}
```

**Step 4: Create CountdownState**

Create `src/components/recorder/CountdownState.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface CountdownStateProps {
    stream: MediaStream;
    onComplete: () => void;
}

export default function CountdownState({ stream, onComplete }: CountdownStateProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [count, setCount] = useState(3);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    useEffect(() => {
        if (count === 0) {
            onComplete();
            return;
        }
        const timer = setTimeout(() => setCount(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [count, onComplete]);

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
            {/* Camera preview in background */}
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-60"
            />

            {/* Countdown overlay */}
            <div className="relative z-10 flex flex-col items-center">
                <div
                    key={count}
                    className="text-[160px] font-black text-white leading-none"
                    style={{
                        animation: "countdownPop 1s ease-out forwards",
                        textShadow: "0 0 60px rgba(14, 165, 233, 0.8)",
                    }}
                >
                    {count === 0 ? "GO!" : count}
                </div>
                <p className="text-white/70 text-xl font-bold mt-4 tracking-widest uppercase">
                    Get Ready...
                </p>
            </div>

            <style>{`
                @keyframes countdownPop {
                    0% { transform: scale(1.4); opacity: 0; }
                    20% { transform: scale(1); opacity: 1; }
                    80% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(0.8); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
```

**Step 5: Update RecordingState — fix pause timer + add stickies**

Replace `src/components/recorder/RecordingState.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Plus, X } from "lucide-react";

interface Stickie {
    id: string;
    text: string;
    x: number;
    y: number;
}

interface RecordingStateProps {
    status: string;
    pauseRecording: () => void;
    resumeRecording: () => void;
    onFinish: () => void;
    maxDuration?: number;
    promptText?: string;
}

export default function RecordingState({
    status,
    pauseRecording,
    resumeRecording,
    onFinish,
    maxDuration = 120,
    promptText,
}: RecordingStateProps) {
    const [elapsed, setElapsed] = useState(0);
    const [stickies, setStickies] = useState<Stickie[]>([]);
    const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Timer: only counts while recording (not paused)
    useEffect(() => {
        if (status === "recording") {
            intervalRef.current = setInterval(() => {
                setElapsed(prev => {
                    if (prev + 1 >= maxDuration) {
                        onFinish();
                        return maxDuration;
                    }
                    return prev + 1;
                });
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [status, maxDuration, onFinish]);

    const timeLeft = maxDuration - elapsed;
    const progress = (elapsed / maxDuration) * 100;

    // Draggable stickies
    const addStickie = () => {
        const id = Math.random().toString(36).slice(2);
        setStickies(s => [...s, { id, text: "", x: 40, y: 80 }]);
    };

    const removeStickie = (id: string) => setStickies(s => s.filter(st => st.id !== id));

    const updateStickie = (id: string, text: string) => {
        setStickies(s => s.map(st => st.id === id ? { ...st, text } : st));
    };

    const onMouseDown = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        const stickie = stickies.find(s => s.id === id);
        if (!stickie) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDragging({ id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top });
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!dragging || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - containerRect.left - dragging.offsetX;
            const y = e.clientY - containerRect.top - dragging.offsetY;
            setStickies(s => s.map(st => st.id === dragging.id ? { ...st, x, y } : st));
        };
        const onMouseUp = () => setDragging(null);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [dragging]);

    return (
        <div ref={containerRef} className="absolute inset-0 flex flex-col items-center bg-black overflow-hidden">
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-800 z-20 shrink-0">
                <div
                    className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Live camera feed (from react-media-recorder's internal stream via the recorder itself) */}
            <div className="flex-1 relative w-full bg-slate-900 flex items-center justify-center">
                {/* Recording indicator */}
                <div className="absolute top-6 left-6 flex items-center gap-2 z-30 bg-black/50 rounded-full px-3 py-1.5 backdrop-blur">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-white text-xs font-bold uppercase tracking-wider">
                        {status === "paused" ? "Paused" : "Recording"}
                    </span>
                </div>

                {/* Timer */}
                <div className="absolute top-6 right-6 z-30 bg-black/50 rounded-full px-4 py-1.5 backdrop-blur">
                    <span className="text-white font-mono font-bold text-sm">
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                    </span>
                </div>

                {/* Note: react-media-recorder opens its own stream. Show a dark background while recording. */}
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                    <div className="text-white/20 text-sm">Recording in progress</div>
                </div>

                {/* Draggable Stickies */}
                {stickies.map(stickie => (
                    <div
                        key={stickie.id}
                        className="absolute z-40 w-52 select-none"
                        style={{ left: stickie.x, top: stickie.y }}
                    >
                        <div
                            className="bg-[#FFDD00] rounded-xl shadow-xl overflow-hidden"
                            onMouseDown={e => onMouseDown(stickie.id, e)}
                            style={{ cursor: dragging?.id === stickie.id ? "grabbing" : "grab" }}
                        >
                            {/* Stickie header */}
                            <div className="flex items-center justify-between px-3 py-2 bg-[#f5cf00]">
                                <span className="text-xs font-bold text-black/60 uppercase tracking-wide">Notes</span>
                                <button
                                    onMouseDown={e => e.stopPropagation()}
                                    onClick={() => removeStickie(stickie.id)}
                                    className="text-black/40 hover:text-black transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <textarea
                                value={stickie.text}
                                onChange={e => updateStickie(stickie.id, e.target.value)}
                                onMouseDown={e => e.stopPropagation()}
                                placeholder="Type your notes..."
                                className="w-full bg-transparent p-3 text-sm text-black placeholder-black/40 resize-none focus:outline-none"
                                rows={4}
                            />
                        </div>
                    </div>
                ))}

                {/* Add Stickie Button */}
                <button
                    onClick={addStickie}
                    className="absolute bottom-24 right-6 z-30 flex items-center gap-2 px-4 py-2 bg-[#FFDD00] hover:bg-[#f5cf00] text-black font-bold rounded-xl shadow-lg transition-all hover:scale-105"
                >
                    <Plus size={16} />
                    Stickie
                </button>

                {/* Controls */}
                <div className="absolute bottom-8 flex items-center gap-8 z-30">
                    {status === "recording" ? (
                        <button
                            onClick={pauseRecording}
                            className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition-all"
                        >
                            <Pause size={32} className="fill-current" />
                        </button>
                    ) : (
                        <button
                            onClick={resumeRecording}
                            className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition-all"
                        >
                            <Play size={32} className="fill-current ml-1" />
                        </button>
                    )}

                    <button
                        onClick={onFinish}
                        className="w-24 h-24 rounded-full border-8 border-white/20 flex items-center justify-center group transition-all hover:scale-105"
                    >
                        <div className="w-10 h-10 bg-red-500 rounded-lg group-hover:rounded-sm transition-all duration-300" />
                    </button>

                    <div className="w-16 h-16 opacity-0" />
                </div>
            </div>

            {/* Gradient overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/70 to-transparent z-10 pointer-events-none" />
        </div>
    );
}
```

**Step 6: Update SubmitState to accept real topicId + userId**

Replace `src/components/recorder/SubmitState.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { createResponse } from "@/lib/firestore";
import { v4 as uuidv4 } from "uuid";

interface SubmitStateProps {
    videoBlobUrl: string;
    selfieBlob: Blob;
    topicId: string;
    topicTitle: string;
    userId: string;
    onSuccess: () => void;
}

export default function SubmitState({ videoBlobUrl, selfieBlob, topicId, topicTitle, userId, onSuccess }: SubmitStateProps) {
    const [displayName, setDisplayName] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!displayName.trim()) return;

        setIsUploading(true);
        setError(null);

        try {
            // 1. Fetch video blob
            setUploadProgress("Preparing video...");
            const videoRes = await fetch(videoBlobUrl);
            const videoBlob = await videoRes.blob();

            // 2. Upload video
            setUploadProgress("Uploading video...");
            const videoRef = ref(storage, `videos/${uuidv4()}.webm`);
            await uploadBytes(videoRef, videoBlob);
            const videoDownloadUrl = await getDownloadURL(videoRef);

            // 3. Upload selfie
            setUploadProgress("Uploading thumbnail...");
            const selfieRef = ref(storage, `thumbnails/${uuidv4()}.jpg`);
            await uploadBytes(selfieRef, selfieBlob);
            const selfieDownloadUrl = await getDownloadURL(selfieRef);

            // 4. Create Firestore doc
            setUploadProgress("Saving response...");
            await createResponse({
                topicId,
                userId,
                userDisplayName: displayName.trim(),
                videoUrl: videoDownloadUrl,
                thumbnailUrl: selfieDownloadUrl,
                status: "active",
                views: 0,
                reactions: [],
                createdAt: Date.now(),
            });

            setDone(true);
            setTimeout(onSuccess, 1500);

        } catch (err: any) {
            console.error("Upload error:", err);
            setError(err.message || "Failed to upload. Please try again.");
        } finally {
            setIsUploading(false);
            setUploadProgress("");
        }
    };

    if (done) {
        return (
            <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <CheckCircle size={72} className="text-emerald-500" />
                    <h2 className="text-2xl font-black text-white">Submitted!</h2>
                    <p className="text-white/60">Your response is live on the grid.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl text-center">
                <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Upload size={32} />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit to {topicTitle}</h2>
                <p className="text-gray-500 mb-8">Almost there! Add your name so everyone knows it&apos;s you.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-left text-xs font-bold uppercase text-gray-400 mb-1 ml-1">Display Name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="First Name Last Initial"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-gray-900 font-medium"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {isUploading && uploadProgress && (
                        <p className="text-sm text-sky-500 font-medium">{uploadProgress}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isUploading || !displayName.trim()}
                        className="w-full py-4 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all"
                    >
                        {isUploading ? "Uploading..." : "Submit Video"}
                    </button>
                </form>
            </div>
        </div>
    );
}
```

**Step 7: Commit**

```bash
git add src/components/recorder/
git commit -m "feat: recorder with preview, countdown, stickies, camera lifecycle"
```

---

## Task 8: SelfieState — Fix Stream Cleanup

**Goal:** Store the stream in a ref so cleanup always releases the real track, not a stale closure.

**Files:**
- Modify: `src/components/recorder/SelfieState.tsx`

**Step 1: Fix the stream cleanup bug**

Replace `src/components/recorder/SelfieState.tsx`:

```tsx
"use client";

import { Camera, RefreshCcw, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SelfieStateProps {
    onConfirm: (blob: Blob) => void;
    onRetake?: () => void;
}

export default function SelfieState({ onConfirm, onRetake }: SelfieStateProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        navigator.mediaDevices.getUserMedia({ video: true }).then(s => {
            if (!active) { s.getTracks().forEach(t => t.stop()); return; }
            streamRef.current = s;
            if (videoRef.current) videoRef.current.srcObject = s;
        }).catch(err => console.error("Selfie camera error:", err));

        return () => {
            active = false;
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        };
    }, []);

    const takePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const vid = videoRef.current;
        const cvs = canvasRef.current;
        cvs.width = vid.videoWidth;
        cvs.height = vid.videoHeight;
        const ctx = cvs.getContext("2d");
        if (!ctx) return;
        ctx.translate(cvs.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(vid, 0, 0);
        setCapturedImage(cvs.toDataURL("image/jpeg", 0.85));
    };

    const confirmPhoto = async () => {
        if (!capturedImage) return;
        streamRef.current?.getTracks().forEach(t => t.stop());
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        onConfirm(blob);
    };

    return (
        <div className="absolute inset-0 bg-black flex flex-col">
            <div className="flex-1 relative overflow-hidden">
                <canvas ref={canvasRef} className="hidden" />

                {capturedImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={capturedImage} alt="Selfie" className="w-full h-full object-cover" />
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                    />
                )}

                {!capturedImage && (
                    <div className="absolute top-6 inset-x-0 text-center pointer-events-none">
                        <span className="bg-black/60 text-white px-4 py-2 rounded-full text-sm font-bold backdrop-blur">
                            Take your selfie thumbnail!
                        </span>
                    </div>
                )}
            </div>

            <div className="h-28 bg-black border-t border-white/10 flex items-center justify-center gap-6">
                {!capturedImage ? (
                    <>
                        {onRetake && (
                            <button onClick={onRetake} className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors">
                                <RefreshCcw size={18} />
                                Re-record
                            </button>
                        )}
                        <button
                            onClick={takePhoto}
                            className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all border-4 border-gray-300"
                        >
                            <Camera size={32} className="text-gray-800" />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setCapturedImage(null)}
                            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                        >
                            <RefreshCcw size={20} />
                            Retake
                        </button>
                        <button
                            onClick={confirmPhoto}
                            className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                        >
                            Use This Photo
                            <Check size={20} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
```

**Step 2: Commit**

```bash
git add src/components/recorder/SelfieState.tsx
git commit -m "fix: selfie state stream cleanup using ref"
```

---

## Task 9: TheaterModal — Next/Prev Navigation

**Goal:** TheaterModal receives the full `responses` array and `currentIndex`. Prev/Next buttons navigate through them.

**Files:**
- Modify: `src/components/topic/TheaterModal.tsx`

**Step 1: Update TheaterModal**

Replace `src/components/topic/TheaterModal.tsx`:

```tsx
"use client";

import { X, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { Response } from "@/lib/types";
import { useEffect } from "react";

interface TheaterModalProps {
    responses: Response[];
    currentIndex: number | null;
    onClose: () => void;
    onNavigate: (index: number) => void;
}

export default function TheaterModal({ responses, currentIndex, onClose, onNavigate }: TheaterModalProps) {
    const response = currentIndex !== null ? responses[currentIndex] : null;

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (currentIndex === null) return;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") onNavigate(Math.min(currentIndex + 1, responses.length - 1));
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") onNavigate(Math.max(currentIndex - 1, 0));
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [currentIndex, responses.length, onNavigate, onClose]);

    if (!response || currentIndex === null) return null;

    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < responses.length - 1;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
            <button
                onClick={onClose}
                className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-10"
            >
                <X size={32} />
            </button>

            {/* Prev */}
            {hasPrev && (
                <button
                    onClick={() => onNavigate(currentIndex - 1)}
                    className="absolute left-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
                >
                    <ChevronLeft size={28} />
                </button>
            )}

            {/* Next */}
            {hasNext && (
                <button
                    onClick={() => onNavigate(currentIndex + 1)}
                    className="absolute right-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
                >
                    <ChevronRight size={28} />
                </button>
            )}

            <div className="w-full max-w-6xl h-full flex flex-col md:flex-row bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                {/* Video */}
                <div className="flex-1 bg-black relative flex items-center justify-center">
                    <video
                        key={response.id}
                        src={response.videoUrl}
                        controls
                        autoPlay
                        className="max-h-full max-w-full object-contain"
                    />
                </div>

                {/* Sidebar */}
                <div className="w-full md:w-80 bg-gray-900 border-l border-white/10 p-6 flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={response.thumbnailUrl} alt={response.userDisplayName} className="w-12 h-12 rounded-full object-cover border-2 border-white/20" />
                        <div>
                            <h3 className="text-white font-bold">{response.userDisplayName}</h3>
                            <p className="text-white/50 text-xs">{response.views} views</p>
                        </div>
                    </div>

                    {/* Counter */}
                    <p className="text-white/30 text-sm mb-4">{currentIndex + 1} of {responses.length}</p>

                    <div className="flex-1" />

                    <div className="pt-6 border-t border-white/10">
                        <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                            <Heart size={20} />
                            Like Response
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

**Step 2: Commit**

```bash
git add src/components/topic/TheaterModal.tsx
git commit -m "feat: theater modal with prev/next navigation and keyboard support"
```

---

## Task 10: Update Home Page Navigation + Firestore Composite Index Fix

**Goal:** Update home page to link properly to `/login` and `/join`. Add a note about the required Firestore composite indexes that must be created.

**Files:**
- Modify: `src/app/page.tsx`
- Create: `docs/FIRESTORE_INDEXES.md`

**Step 1: Firestore composite indexes**

The queries in `firestore.ts` use `where + orderBy` which require composite indexes in Firestore. Create these in the Firebase console or via `firestore.indexes.json`:

- `grids`: `ownerId ASC, createdAt DESC`
- `topics`: `gridId ASC, createdAt DESC`
- `responses`: `topicId ASC, status ASC, createdAt DESC`

Create `docs/FIRESTORE_INDEXES.md` with this documentation.

**Step 2: Update home page "Join as Student" button**

In `src/app/page.tsx`, change the "Log In" and "Sign Up" buttons to link to `/login`, and "Join as Student" to link to `/join`.

**Step 3: Commit**

```bash
git add src/app/page.tsx docs/FIRESTORE_INDEXES.md
git commit -m "fix: wire home page nav to login and join routes"
```

---

## Task 11: Final Check — TypeScript and Build

**Goal:** Make sure the build passes with no type errors.

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors found. Common ones to watch for:
- `Response` (built-in JS type) clashes with our `Response` type — add `import type { Response as FlipResponse }` where needed, or rename in types.ts to `FlipResponse`
- Missing props on `RecorderModal` (topicId, userId, maxDuration)
- Firestore `serverTimestamp()` vs `number` for `createdAt`

**Step 2: Run dev server and test manually**

```bash
npm run dev
```

Test the following flows:
1. Visit `/login` → sign in with Google → redirect to `/dashboard`
2. Click "+ New Grid" → create grid with flipCode → see it in dashboard
3. Click into grid → "+ New Topic" → create topic → see it in list
4. Click "View Topic Page" → confirm topic page loads from Firestore
5. Click "Record a Response" → IDLE (no camera) → click Record → camera turns on in PREVIEW → click "Start Recording" → 3-2-1 countdown → recording starts → add a stickie → stop → review → selfie → submit
6. After submit, response appears in the grid (real-time listener)
7. Click a response → TheaterModal opens → use arrow keys or buttons to navigate
8. Visit `/join` → enter flipCode → see topics → click topic → same flow as above

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: full flipgrid implementation - all flows wired to firebase"
```

---

## Notes

### Firestore Security Rules (deploy separately)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /grids/{gridId} {
      allow read: if true;
      allow write: if request.auth != null && (resource == null || resource.data.ownerId == request.auth.uid);
    }
    match /topics/{topicId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /responses/{responseId} {
      allow read: if resource.data.status == 'active';
      allow create: if true;
      allow update: if request.auth != null;
    }
  }
}
```

### To promote a user to teacher/admin
Use Firestore console: find `users/{uid}`, set `role` to `"teacher"` or `"admin"`.

### Camera note
`react-media-recorder` opens its own `getUserMedia` stream internally when `startRecording()` is called. Because of this, during the RECORDING state you won't see a live camera preview (only the blob plays back in REVIEW). This is a known limitation of the library without significant refactoring. The PREVIEW → COUNTDOWN states use a separate preview stream that IS visible. To show camera during recording too, a future enhancement would be to use `MediaRecorder` API directly with the same stream.
