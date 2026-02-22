# Student Accounts & Enhanced Journey Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add student accounts with a role picker at first sign-in, a student dashboard, and an enhanced Journey with student pinning, journal entries, and teacher recommendations.

**Architecture:** Role picker shown once to new users (detected via `roleConfirmed` flag). Dashboard conditionally renders teacher or student view based on `profile.role`. Journey gains pinning (stored on user doc), freeform text entries (new Firestore collection), and teacher recommendations (new Firestore collection). Teacher can view any student's Journey and recommend moments from the studio page.

**Tech Stack:** Next.js App Router, Firebase Auth (Google OAuth), Firestore, Tailwind CSS with brand tokens (`brand-cream`, `brand-warm`, `brand-amber` = `#c2410c`, `brand-slate`).

**Key file locations:**
- Types: `src/lib/types.ts`
- Firestore helpers: `src/lib/firestore.ts`
- Auth context: `src/lib/auth-context.tsx`
- Dashboard: `src/app/dashboard/page.tsx`
- Journey page: `src/app/journey/page.tsx`
- Journey components: `src/components/journey/`

---

## Task 1: Add `roleConfirmed` to types and Firestore

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/firestore.ts`

**Step 1: Add `roleConfirmed` field to `UserProfile` in types.ts**

Find the `UserProfile` interface and add one field:

```typescript
export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    createdAt?: number;
    roleConfirmed?: boolean;   // ← add this
    pinnedResponseIds?: string[]; // ← add this too (used in Task 6)
}
```

**Step 2: Update `updateUserRole` in firestore.ts to also set `roleConfirmed: true`**

Find the existing `updateUserRole` function (around line 303):
```typescript
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
    await updateDoc(doc(db, "users", uid), { role });
}
```

Replace with:
```typescript
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
    await updateDoc(doc(db, "users", uid), { role, roleConfirmed: true });
}
```

**Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/firestore.ts
git commit -m "feat: add roleConfirmed and pinnedResponseIds to UserProfile"
```

---

## Task 2: Build the RolePicker component

**Files:**
- Create: `src/components/auth/RolePicker.tsx`

This is a full-screen overlay shown once to new users. Two big cards: Teacher and Student. Clicking a card calls `updateUserRole`, then redirects.

**Step 1: Create the file**

```typescript
"use client";

import { useState } from "react";
import { GraduationCap, BookOpen, Loader2 } from "lucide-react";
import { updateUserRole } from "@/lib/firestore";
import { UserRole } from "@/lib/types";

interface RolePickerProps {
    uid: string;
    onComplete: (role: UserRole) => void;
}

export default function RolePicker({ uid, onComplete }: RolePickerProps) {
    const [saving, setSaving] = useState(false);

    const handlePick = async (role: UserRole) => {
        setSaving(true);
        await updateUserRole(uid, role);
        onComplete(role);
    };

    return (
        <div className="fixed inset-0 z-50 bg-brand-cream flex flex-col items-center justify-center p-6">
            <div className="max-w-xl w-full text-center mb-10">
                <h1 className="text-4xl font-bold text-brand-warm mb-3">Welcome to Process+</h1>
                <p className="text-brand-slate text-lg">How will you use Process+?</p>
            </div>

            {saving ? (
                <Loader2 className="animate-spin text-brand-amber" size={40} />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl">
                    <button
                        onClick={() => handlePick("teacher")}
                        className="flex flex-col items-center gap-4 p-8 bg-white rounded-3xl border-2 border-brand-amber/20 hover:border-brand-amber hover:shadow-lg transition-all group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-brand-cream flex items-center justify-center group-hover:scale-110 transition-transform">
                            <GraduationCap size={36} style={{ color: '#c2410c' }} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-brand-warm">I'm a Teacher</p>
                            <p className="text-brand-slate text-sm mt-1">Manage studios and review student responses</p>
                        </div>
                    </button>

                    <button
                        onClick={() => handlePick("student")}
                        className="flex flex-col items-center gap-4 p-8 bg-white rounded-3xl border-2 border-brand-amber/20 hover:border-brand-amber hover:shadow-lg transition-all group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-brand-cream flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BookOpen size={36} style={{ color: '#c2410c' }} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-brand-warm">I'm a Student</p>
                            <p className="text-brand-slate text-sm mt-1">Record responses and track my learning journey</p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
```

**Step 2: Commit**

```bash
git add src/components/auth/RolePicker.tsx
git commit -m "feat: add RolePicker onboarding component"
```

---

## Task 3: Wire RolePicker into the app layout

New users who don't have `roleConfirmed: true` should see the picker right after sign-in. The cleanest place is `src/app/layout.tsx` — render the picker as a portal/overlay when the condition is met.

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Read the current layout**

```bash
cat src/app/layout.tsx
```

**Step 2: Add RolePicker logic**

The layout already wraps children in `AuthProvider`. We need a new client component `src/components/auth/RoleGuard.tsx` that reads from `useAuth()` and renders the picker if needed (layout.tsx itself may be a server component):

Create `src/components/auth/RoleGuard.tsx`:

```typescript
"use client";

import { useAuth } from "@/lib/auth-context";
import RolePicker from "./RolePicker";

export default function RoleGuard({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();

    // Show picker only once: signed in + profile loaded + not yet confirmed
    if (!loading && user && profile && !profile.roleConfirmed) {
        return (
            <>
                {children}
                <RolePicker
                    uid={user.uid}
                    onComplete={(role) => {
                        // Auth context will re-fetch profile on next render
                        // Force a page reload to pick up the new profile
                        window.location.href = role === "teacher" ? "/dashboard" : "/dashboard";
                    }}
                />
            </>
        );
    }

    return <>{children}</>;
}
```

**Step 3: Wrap children in layout.tsx with RoleGuard**

In `src/app/layout.tsx`, find where `{children}` is rendered inside `AuthProvider` and wrap it:

```typescript
// Before:
<AuthProvider>{children}</AuthProvider>

// After:
<AuthProvider>
    <RoleGuard>{children}</RoleGuard>
</AuthProvider>
```

Import `RoleGuard` at the top.

**Step 4: Commit**

```bash
git add src/components/auth/RoleGuard.tsx src/app/layout.tsx
git commit -m "feat: show role picker to new users on first sign-in"
```

---

## Task 4: Build StudentDashboard component

**Files:**
- Create: `src/components/student/StudentDashboard.tsx`

The student dashboard has three tabs: My Studios (derived from responses), My Responses, My Journey preview.

**Step 1: Create the component**

```typescript
"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, BookOpen, Video, LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { Response, Studio } from "@/lib/types";
import { getResponsesForUser, getStudio } from "@/lib/firestore";
import { EnrichedMoment } from "@/components/journey/JourneyMoment";
import { getProject } from "@/lib/firestore";

type Tab = "studios" | "responses" | "journey";

interface StudentDashboardProps {
    userId: string;
}

export default function StudentDashboard({ userId }: StudentDashboardProps) {
    const [tab, setTab] = useState<Tab>("studios");
    const [responses, setResponses] = useState<EnrichedMoment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            try {
                const rawResponses = await getResponsesForUser(userId);
                // Enrich with project + studio
                const projectCache = new Map<string, any>();
                const studioCache = new Map<string, any>();
                const enriched = await Promise.all(rawResponses.map(async (r) => {
                    let project = projectCache.get(r.projectId);
                    if (!project) {
                        project = await getProject(r.projectId);
                        projectCache.set(r.projectId, project);
                    }
                    let studio = project ? studioCache.get(project.studioId) : null;
                    if (project && !studio) {
                        studio = await getStudio(project.studioId);
                        studioCache.set(project.studioId, studio);
                    }
                    return { ...r, project: project ?? null, studio: studio ?? null };
                }));
                setResponses(enriched.reverse()); // newest first
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, [userId]);

    // Derive unique studios from responses
    const studios = useMemo(() => {
        const seen = new Map<string, { studio: Studio; count: number }>();
        for (const r of responses) {
            if (r.studio && !seen.has(r.studio.id)) {
                seen.set(r.studio.id, { studio: r.studio, count: 0 });
            }
            if (r.studio) {
                seen.get(r.studio.id)!.count++;
            }
        }
        return Array.from(seen.values());
    }, [responses]);

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: "studios", label: "My Studios", icon: <LayoutGrid size={18} /> },
        { id: "responses", label: "My Responses", icon: <Video size={18} /> },
        { id: "journey", label: "My Journey", icon: <BookOpen size={18} /> },
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            {/* Tab bar */}
            <div className="flex gap-2 mb-8 border-b border-brand-amber/10 pb-0">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-t-xl transition-colors -mb-px border-b-2 ${
                            tab === t.id
                                ? "border-brand-amber text-brand-warm"
                                : "border-transparent text-brand-slate hover:text-brand-warm"
                        }`}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-brand-amber" size={32} />
                </div>
            ) : (
                <>
                    {tab === "studios" && (
                        <div>
                            {studios.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-3xl border border-brand-amber/10">
                                    <LayoutGrid size={40} className="mx-auto text-slate-300 mb-4" />
                                    <p className="text-brand-warm font-semibold">You haven't joined any studios yet.</p>
                                    <p className="text-brand-slate text-sm mt-2">Ask your teacher for a studio or project code, then use the Join button.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {studios.map(({ studio, count }) => (
                                        <Link
                                            key={studio.id}
                                            href={`/studio/${studio.processPlusCode}`}
                                            className="group bg-white rounded-2xl p-6 border border-brand-amber/10 hover:border-brand-amber hover:shadow-md transition-all"
                                        >
                                            <div className="size-12 rounded-xl bg-brand-cream text-brand-amber flex items-center justify-center font-bold text-xl mb-4 group-hover:scale-110 transition-transform">
                                                {studio.icon ?? studio.title.charAt(0).toUpperCase()}
                                            </div>
                                            <h3 className="font-bold text-lg text-brand-warm truncate">{studio.title}</h3>
                                            <p className="text-brand-slate text-sm mt-1">{count} response{count !== 1 ? "s" : ""} posted</p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === "responses" && (
                        <div>
                            {responses.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-3xl border border-brand-amber/10">
                                    <Video size={40} className="mx-auto text-slate-300 mb-4" />
                                    <p className="text-brand-warm font-semibold">No responses yet.</p>
                                    <p className="text-brand-slate text-sm mt-2">Join a project and record your first video.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {responses.map((r) => (
                                        <Link
                                            key={r.id}
                                            href={`/studio/${r.studio?.processPlusCode}/projects/${r.projectId}`}
                                            className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={r.thumbnailUrl} alt={r.project?.title ?? "Response"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                                <p className="font-bold text-sm truncate">{r.project?.title ?? "Unknown Project"}</p>
                                                <p className="text-xs text-white/60 truncate">{r.studio?.title ?? ""}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === "journey" && (
                        <div className="text-center py-16 bg-white rounded-3xl border border-brand-amber/10">
                            <BookOpen size={48} style={{ color: '#c2410c' }} className="mx-auto mb-4 opacity-70" />
                            <h3 className="text-xl font-bold text-brand-warm mb-2">Your Learning Journey</h3>
                            <p className="text-brand-slate max-w-md mx-auto mb-6">
                                Your Journey collects every Moment you've posted — across all studios — into a single personal timeline. Pin highlights, add journal entries, and share with your teacher.
                            </p>
                            <Link
                                href="/journey"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold shadow-md transition-all hover:opacity-90"
                                style={{ backgroundColor: '#c2410c' }}
                            >
                                <BookOpen size={18} /> Open My Journey
                            </Link>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
```

**Step 2: Commit**

```bash
git add src/components/student/StudentDashboard.tsx
git commit -m "feat: add StudentDashboard component with Studios/Responses/Journey tabs"
```

---

## Task 5: Wire StudentDashboard into the dashboard page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Update the dashboard to branch on role**

The dashboard currently uses `useAuth()` for `user` only. We need `profile` too.

At the top of `DashboardPage`, change:
```typescript
const { user, loading } = useAuth();
```
to:
```typescript
const { user, profile, loading } = useAuth();
```

Then, after the loading check (around line 75), add a student branch. Find the `return (` that starts the teacher dashboard JSX and wrap it:

```typescript
// After loading guard, before teacher dashboard JSX:
if (profile?.role === "student") {
    return (
        <div className="min-h-screen bg-brand-cream text-brand-warm">
            <Navbar />
            <StudentDashboard userId={user.uid} />
        </div>
    );
}
```

Add the import at the top:
```typescript
import StudentDashboard from "@/components/student/StudentDashboard";
```

**Step 2: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: render StudentDashboard for student-role users on /dashboard"
```

---

## Task 6: Journey pin functionality

Students can pin/highlight moments. Pinned moments get a gold ring and appear in a "Highlights" callout at the top of the timeline.

**Files:**
- Modify: `src/lib/firestore.ts`
- Modify: `src/components/journey/JourneyMoment.tsx`
- Modify: `src/app/journey/page.tsx`

**Step 1: Add `toggleJourneyPin` to firestore.ts**

Add at the bottom of the Journey section:

```typescript
export async function toggleJourneyPin(uid: string, responseId: string, pinned: boolean): Promise<void> {
    const ref = doc(db, "users", uid);
    await updateDoc(ref, {
        pinnedResponseIds: pinned ? arrayUnion(responseId) : arrayRemove(responseId),
    });
}
```

(`arrayUnion` and `arrayRemove` are already imported at the top of firestore.ts.)

**Step 2: Add pin button and visual to JourneyMoment**

Update `JourneyMoment` interface to accept pin state and callback:

```typescript
interface JourneyMomentProps {
    moment: EnrichedMoment;
    isReadOnly?: boolean;
    isPinned?: boolean;
    onTogglePin?: (responseId: string, newPinned: boolean) => void;
    recommendations?: JourneyRecommendation[]; // added in Task 8
}
```

Import `Pin` icon: `import { Calendar, ChevronDown, ChevronUp, Star, Play, Pin } from "lucide-react";`

In the meta bar (around line 80, after the `isFeatured` badge block), add:

```typescript
{onTogglePin && (
    <button
        onClick={() => onTogglePin(moment.id, !isPinned)}
        className={`ml-auto flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold border transition-all ${
            isPinned
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-white text-slate-400 border-slate-200 hover:border-amber-200 hover:text-amber-600"
        }`}
    >
        <Pin size={12} fill={isPinned ? "currentColor" : "none"} />
        {isPinned ? "Pinned" : "Pin"}
    </button>
)}
```

Also add a visual ring on the timeline dot when pinned — in the dot div, add conditional class:
```typescript
style={{ backgroundColor: isPinned ? '#d97706' : ORANGE }}
```

**Step 3: Load pins in Journey page and pass to timeline**

In `src/app/journey/page.tsx`, the Journey page already loads `profile` via `getUserProfile`. But we need the _current user's_ pins even when viewing another user's journey.

In the `JourneyContent` function, add state:
```typescript
const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
```

In the `load()` async function, also load the current user's profile (for pins):
```typescript
// Add to the Promise.all call or separately:
if (user) {
    const myProfile = await getUserProfile(user.uid);
    setPinnedIds(new Set(myProfile?.pinnedResponseIds ?? []));
}
```

Add a handler:
```typescript
const handleTogglePin = async (responseId: string, newPinned: boolean) => {
    if (!user) return;
    await toggleJourneyPin(user.uid, responseId, newPinned);
    setPinnedIds(prev => {
        const next = new Set(prev);
        newPinned ? next.add(responseId) : next.delete(responseId);
        return next;
    });
};
```

Pass to `JourneyTimeline`:
```typescript
<JourneyTimeline
    moments={visibleMoments}
    isReadOnly={!isOwnJourney}
    pinnedIds={pinnedIds}
    onTogglePin={isOwnJourney ? handleTogglePin : undefined}
/>
```

Import `toggleJourneyPin` from firestore.

**Step 4: Update JourneyTimeline to show pinned highlights**

In `JourneyTimeline`, add props:
```typescript
interface JourneyTimelineProps {
    moments: EnrichedMoment[];
    isReadOnly?: boolean;
    pinnedIds?: Set<string>;
    onTogglePin?: (responseId: string, newPinned: boolean) => void;
}
```

Before the grouped timeline, add a Highlights section:
```typescript
const pinned = moments.filter(m => pinnedIds?.has(m.id));

{pinned.length > 0 && (
    <div className="mb-10 p-6 bg-amber-50 rounded-3xl border border-amber-200">
        <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-4 flex items-center gap-2">
            <Pin size={14} /> Pinned Highlights
        </p>
        <div className="space-y-4">
            {pinned.map(m => (
                <JourneyMoment
                    key={m.id}
                    moment={m}
                    isReadOnly={isReadOnly}
                    isPinned={true}
                    onTogglePin={onTogglePin}
                />
            ))}
        </div>
    </div>
)}
```

Pass `isPinned` and `onTogglePin` to each `JourneyMoment` in the main timeline too.

**Step 5: Commit**

```bash
git add src/lib/firestore.ts src/components/journey/JourneyMoment.tsx src/components/journey/JourneyTimeline.tsx src/app/journey/page.tsx
git commit -m "feat: journey pin/highlight moments for students"
```

---

## Task 7: Freeform journal entries in Journey

Students can add text entries that appear inline in the timeline alongside video moments.

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/firestore.ts`
- Create: `src/components/journey/JourneyEntryCard.tsx`
- Modify: `src/app/journey/page.tsx`
- Modify: `src/components/journey/JourneyTimeline.tsx`

**Step 1: Add `JourneyEntry` type to types.ts**

```typescript
export interface JourneyEntry {
    id: string;
    userId: string;
    text: string;
    createdAt: number;
}
```

**Step 2: Add Firestore helpers for journal entries**

In firestore.ts, add at the bottom of the Journey section:

```typescript
export async function createJourneyEntry(userId: string, text: string): Promise<JourneyEntry> {
    const data = {
        userId,
        text: text.trim(),
        createdAt: Date.now(),
    };
    const ref = await addDoc(collection(db, "journeyEntries"), data);
    return { id: ref.id, ...data };
}

export async function getJourneyEntries(userId: string): Promise<JourneyEntry[]> {
    const q = query(
        collection(db, "journeyEntries"),
        where("userId", "==", userId),
        orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as JourneyEntry));
}

export async function deleteJourneyEntry(entryId: string): Promise<void> {
    await deleteDoc(doc(db, "journeyEntries", entryId));
}
```

Import `JourneyEntry` in firestore.ts imports line.

**Step 3: Create JourneyEntryCard component**

```typescript
"use client";

import { useState } from "react";
import { PenLine, Trash2 } from "lucide-react";
import { JourneyEntry } from "@/lib/types";

interface JourneyEntryCardProps {
    entry: JourneyEntry;
    onDelete?: (id: string) => void;
}

export default function JourneyEntryCard({ entry, onDelete }: JourneyEntryCardProps) {
    return (
        <div className="relative z-10 pl-14 md:pl-20 group">
            {/* Timeline dot — pencil style */}
            <div className="absolute left-[9px] md:left-[23px] top-5 w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow-sm z-20 flex items-center justify-center" />

            <div className="bg-white/70 rounded-2xl border border-dashed border-slate-200 px-6 py-4 flex items-start gap-4">
                <PenLine size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <p className="text-slate-600 text-sm leading-relaxed italic flex-1">{entry.text}</p>
                {onDelete && (
                    <button
                        onClick={() => onDelete(entry.id)}
                        className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}
```

**Step 4: Merge entries into timeline in journey/page.tsx**

In `JourneyContent`, add state for entries:
```typescript
const [entries, setEntries] = useState<JourneyEntry[]>([]);
const [showEntryInput, setShowEntryInput] = useState(false);
const [entryDraft, setEntryDraft] = useState("");
const [savingEntry, setSavingEntry] = useState(false);
```

Load entries alongside responses in `load()`:
```typescript
const [rawResponses, entriesData] = await Promise.all([
    getResponsesForUser(viewingUserId!),
    getJourneyEntries(viewingUserId!),
]);
setEntries(entriesData);
```

Add handlers:
```typescript
const handleAddEntry = async () => {
    if (!user || !entryDraft.trim()) return;
    setSavingEntry(true);
    const entry = await createJourneyEntry(user.uid, entryDraft);
    setEntries(prev => [...prev, entry].sort((a, b) => a.createdAt - b.createdAt));
    setEntryDraft("");
    setShowEntryInput(false);
    setSavingEntry(false);
};

const handleDeleteEntry = async (id: string) => {
    await deleteJourneyEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
};
```

Add an "Add Journal Entry" button in the page header (only for `isOwnJourney`):
```typescript
{isOwnJourney && (
    <button
        onClick={() => setShowEntryInput(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border border-slate-200 bg-white text-slate-700 hover:border-slate-300 transition-all shadow-sm"
    >
        <PenLine size={16} /> Add Note
    </button>
)}
```

And render a floating textarea when `showEntryInput`:
```typescript
{showEntryInput && (
    <div className="mb-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <textarea
            autoFocus
            value={entryDraft}
            onChange={e => setEntryDraft(e.target.value)}
            placeholder="Write a reflection, note, or thought..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-amber text-gray-900 font-medium min-h-[100px] resize-y"
        />
        <div className="flex gap-3 mt-3 justify-end">
            <button onClick={() => setShowEntryInput(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            <button
                onClick={handleAddEntry}
                disabled={!entryDraft.trim() || savingEntry}
                className="px-5 py-2 text-sm font-bold text-white rounded-xl disabled:opacity-50"
                style={{ backgroundColor: '#c2410c' }}
            >
                Save Note
            </button>
        </div>
    </div>
)}
```

Pass entries to JourneyTimeline:
```typescript
<JourneyTimeline
    moments={visibleMoments}
    entries={isOwnJourney || !filterStudioId ? entries : []}
    isReadOnly={!isOwnJourney}
    pinnedIds={pinnedIds}
    onTogglePin={isOwnJourney ? handleTogglePin : undefined}
    onDeleteEntry={isOwnJourney ? handleDeleteEntry : undefined}
/>
```

**Step 5: Merge entries into JourneyTimeline groups**

In `JourneyTimeline`, accept new props:
```typescript
interface JourneyTimelineProps {
    moments: EnrichedMoment[];
    entries?: JourneyEntry[];
    isReadOnly?: boolean;
    pinnedIds?: Set<string>;
    onTogglePin?: (responseId: string, newPinned: boolean) => void;
    onDeleteEntry?: (id: string) => void;
}
```

Import `JourneyEntry` from types, `JourneyEntryCard` component.

Create a unified timeline item type and sort moments + entries together by `createdAt`:
```typescript
type TimelineItem =
    | { kind: "moment"; data: EnrichedMoment }
    | { kind: "entry"; data: JourneyEntry };

const allItems = useMemo((): TimelineItem[] => {
    const items: TimelineItem[] = [
        ...moments.map(m => ({ kind: "moment" as const, data: m })),
        ...(entries ?? []).map(e => ({ kind: "entry" as const, data: e })),
    ];
    items.sort((a, b) => (a.data.createdAt as number) - (b.data.createdAt as number));
    return items;
}, [moments, entries]);
```

Update grouping to use `allItems` instead of `moments`. In the render, switch on `item.kind`:
```typescript
{item.kind === "moment" ? (
    <JourneyMoment
        key={item.data.id}
        moment={item.data}
        isReadOnly={isReadOnly}
        isPinned={pinnedIds?.has(item.data.id)}
        onTogglePin={onTogglePin}
    />
) : (
    <JourneyEntryCard
        key={item.data.id}
        entry={item.data}
        onDelete={onDeleteEntry}
    />
)}
```

**Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/firestore.ts src/components/journey/JourneyEntryCard.tsx src/components/journey/JourneyTimeline.tsx src/app/journey/page.tsx
git commit -m "feat: add freeform journal entries to student journey timeline"
```

---

## Task 8: Teacher recommendations on student journey moments

Teachers can "recommend" a moment in a student's journey. The student sees a badge: "⭐ Recommended by [Teacher]".

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/firestore.ts`
- Modify: `src/components/journey/JourneyMoment.tsx`
- Modify: `src/app/journey/page.tsx`

**Step 1: Add `JourneyRecommendation` type to types.ts**

```typescript
export interface JourneyRecommendation {
    id: string;
    teacherId: string;
    teacherName: string;
    studentId: string;
    responseId: string;
    note?: string;
    createdAt: number;
}
```

**Step 2: Add Firestore helpers**

```typescript
export async function addJourneyRecommendation(
    teacherId: string,
    teacherName: string,
    studentId: string,
    responseId: string,
    note?: string
): Promise<JourneyRecommendation> {
    const data = {
        teacherId,
        teacherName,
        studentId,
        responseId,
        note: note?.trim() ?? null,
        createdAt: Date.now(),
    };
    const ref = await addDoc(collection(db, "journeyRecommendations"), removeUndefined(data));
    return { id: ref.id, ...data } as JourneyRecommendation;
}

export async function getJourneyRecommendationsForStudent(studentId: string): Promise<JourneyRecommendation[]> {
    const q = query(
        collection(db, "journeyRecommendations"),
        where("studentId", "==", studentId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as JourneyRecommendation));
}

export async function removeJourneyRecommendation(recId: string): Promise<void> {
    await deleteDoc(doc(db, "journeyRecommendations", recId));
}
```

**Step 3: Load recommendations in journey/page.tsx**

In the `load()` function, add a third parallel fetch:
```typescript
const [rawResponses, entriesData, recs] = await Promise.all([
    getResponsesForUser(viewingUserId!),
    getJourneyEntries(viewingUserId!),
    getJourneyRecommendationsForStudent(viewingUserId!),
]);
```

Store in state:
```typescript
const [recommendations, setRecommendations] = useState<JourneyRecommendation[]>([]);
// In load():
setRecommendations(recs);
```

Build a lookup map and pass to timeline:
```typescript
const recsByResponseId = useMemo(() => {
    const map = new Map<string, JourneyRecommendation[]>();
    for (const r of recommendations) {
        if (!map.has(r.responseId)) map.set(r.responseId, []);
        map.get(r.responseId)!.push(r);
    }
    return map;
}, [recommendations]);
```

Add a teacher recommend handler (only active when `!isOwnJourney`):
```typescript
const handleRecommend = async (responseId: string) => {
    if (!user || !profile || isOwnJourney) return;
    const existing = recommendations.find(r => r.responseId === responseId && r.teacherId === user.uid);
    if (existing) {
        // Toggle off
        await removeJourneyRecommendation(existing.id);
        setRecommendations(prev => prev.filter(r => r.id !== existing.id));
    } else {
        const rec = await addJourneyRecommendation(
            user.uid,
            profile.displayName,
            viewingUserId!,
            responseId,
        );
        setRecommendations(prev => [...prev, rec]);
    }
};
```

Pass to timeline:
```typescript
<JourneyTimeline
    ...
    recsByResponseId={recsByResponseId}
    onRecommend={!isOwnJourney && user ? handleRecommend : undefined}
    currentTeacherId={user?.uid}
/>
```

**Step 4: Update JourneyMoment to show recommendation UI**

Add props to `JourneyMomentProps`:
```typescript
recommendations?: JourneyRecommendation[];
onRecommend?: (responseId: string) => void;
currentTeacherId?: string;
```

Import `JourneyRecommendation` from types.

In the meta bar, after the featured badge:
```typescript
{/* Teacher recommendations */}
{recommendations && recommendations.length > 0 && (
    <span className="flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
        ⭐ {recommendations.map(r => r.teacherName).join(", ")} recommended this
    </span>
)}

{/* Recommend button (teacher view only) */}
{onRecommend && (
    <button
        onClick={() => onRecommend(moment.id)}
        className={`ml-auto flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold border transition-all ${
            recommendations?.some(r => r.teacherId === currentTeacherId)
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-white text-slate-400 border-slate-200 hover:border-amber-200 hover:text-amber-600"
        }`}
    >
        ⭐ {recommendations?.some(r => r.teacherId === currentTeacherId) ? "Recommended" : "Recommend"}
    </button>
)}
```

Update JourneyTimeline to pass through `recsByResponseId`, `onRecommend`, `currentTeacherId` to each `JourneyMoment`:
```typescript
<JourneyMoment
    key={item.data.id}
    moment={item.data}
    isReadOnly={isReadOnly}
    isPinned={pinnedIds?.has(item.data.id)}
    onTogglePin={onTogglePin}
    recommendations={recsByResponseId?.get(item.data.id)}
    onRecommend={onRecommend}
    currentTeacherId={currentTeacherId}
/>
```

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/firestore.ts src/components/journey/JourneyMoment.tsx src/components/journey/JourneyTimeline.tsx src/app/journey/page.tsx
git commit -m "feat: teacher can recommend moments on student journeys"
```

---

## Task 9: Teacher student roster in studio page

Teachers need a way to browse their students and navigate to their journeys.

**Files:**
- Modify: `src/app/studio/[studioCode]/page.tsx`
- Add: `src/components/studio/StudentRoster.tsx`

**Step 1: Create StudentRoster component**

```typescript
"use client";

import { useEffect, useState } from "react";
import { Loader2, BookOpen } from "lucide-react";
import Link from "next/link";
import { getResponsesForProject, getProjectsForStudio } from "@/lib/firestore";
import { Response } from "@/lib/types";

interface StudentRosterProps {
    studioId: string;
}

interface StudentEntry {
    userId: string;
    displayName: string;
    responseCount: number;
}

export default function StudentRoster({ studioId }: StudentRosterProps) {
    const [students, setStudents] = useState<StudentEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const projects = await getProjectsForStudio(studioId);
            const allResponses: Response[] = [];
            await Promise.all(
                projects.map(async (p) => {
                    const resps = await getResponsesForProject(p.id);
                    allResponses.push(...resps);
                })
            );

            // Aggregate by userId
            const byUser = new Map<string, StudentEntry>();
            for (const r of allResponses) {
                if (!byUser.has(r.userId)) {
                    byUser.set(r.userId, { userId: r.userId, displayName: r.userDisplayName, responseCount: 0 });
                }
                byUser.get(r.userId)!.responseCount++;
            }

            setStudents(Array.from(byUser.values()).sort((a, b) => b.responseCount - a.responseCount));
            setIsLoading(false);
        }
        load();
    }, [studioId]);

    if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-amber" size={28} /></div>;

    if (students.length === 0) {
        return (
            <div className="text-center py-16 text-brand-slate">
                <p className="font-semibold">No student responses yet.</p>
                <p className="text-sm mt-1">Students appear here once they post their first response.</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-brand-amber/10">
            {students.map((s) => (
                <div key={s.userId} className="flex items-center justify-between py-4">
                    <div>
                        <p className="font-semibold text-brand-warm">{s.displayName}</p>
                        <p className="text-sm text-brand-slate">{s.responseCount} response{s.responseCount !== 1 ? "s" : ""}</p>
                    </div>
                    <Link
                        href={`/journey?userId=${s.userId}&studioId=${studioId}`}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-brand-amber/20 hover:border-brand-amber hover:bg-brand-cream transition-all text-brand-warm"
                    >
                        <BookOpen size={16} style={{ color: '#c2410c' }} />
                        View Journey
                    </Link>
                </div>
            ))}
        </div>
    );
}
```

**Step 2: Add "Students" tab to the studio page**

Read `src/app/studio/[studioCode]/page.tsx` first to find the tab structure, then add a "Students" tab that renders `<StudentRoster studioId={studio.id} />`.

The exact edit will depend on current tab structure — the pattern is:
1. Add `"students"` to the tab type
2. Add a tab button with `<Users size={16} />` icon (import from lucide-react)
3. Add the tab panel rendering `<StudentRoster studioId={studio.id} />`
4. Import `StudentRoster`

**Step 3: Commit**

```bash
git add src/components/studio/StudentRoster.tsx src/app/studio/[studioCode]/page.tsx
git commit -m "feat: teacher student roster with View Journey links in studio page"
```

---

## Task 10: Navbar update for students

Add a "My Journey" link to the navbar so students can quickly access it.

**Files:**
- Modify: `src/components/layout/Navbar.tsx`

**Step 1: Read the file, then add Journey link**

Import `useAuth` and `BookOpen`. After signing in, if `profile.role === "student"`, show a Journey link in the nav. The exact placement depends on current navbar structure — add it alongside other nav links.

```typescript
{profile?.role === "student" && (
    <Link href="/journey" className="flex items-center gap-1.5 text-sm font-bold text-brand-warm hover:text-brand-amber transition-colors">
        <BookOpen size={16} />
        Journey
    </Link>
)}
```

**Step 2: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "feat: show Journey nav link for student-role users"
```

---

## Task 11: Final smoke test checklist

Before calling this done, verify manually:

- [ ] New Google sign-in shows role picker (no existing users broken)
- [ ] Picking "Teacher" → redirects to teacher dashboard (studios grid)
- [ ] Picking "Student" → redirects to student dashboard (Studios/Responses/Journey tabs)
- [ ] Student "My Studios" shows studios derived from their responses
- [ ] Student "My Responses" shows all video thumbnails
- [ ] "Open My Journey" navigates to `/journey`
- [ ] Journey: own journey shows "Pin" button on each moment
- [ ] Journey: pinning a moment adds it to Highlights section at top
- [ ] Journey: "Add Note" shows textarea; saved entry appears inline in timeline
- [ ] Journey: teacher viewing `/journey?userId=xxx` sees "Recommend" buttons, no pin buttons
- [ ] Student sees "⭐ Recommended by [Teacher Name]" badge after teacher recommends
- [ ] Studio page: "Students" tab shows roster with "View Journey" links
- [ ] Navbar: "Journey" link visible for students only

---

## Appendix: Firestore collections added

| Collection | Fields | Indexed by |
|---|---|---|
| `journeyEntries` | `userId, text, createdAt` | `userId` + `createdAt` |
| `journeyRecommendations` | `teacherId, teacherName, studentId, responseId, note, createdAt` | `studentId` |

No Firestore security rules changes documented here — add those separately before production deploy.
