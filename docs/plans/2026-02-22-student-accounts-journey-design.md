# Process+ Student Accounts & Enhanced Journey Design

**Date:** 2026-02-22  
**Status:** Approved

## Overview

Process+ needs student accounts with personal ownership over their learning journey. This design covers three areas: role selection at sign-in, a student dashboard, and an enhanced Journey with teacher-student collaboration.

## Section 1: Auth & Role System

### What changes
- After Google sign-in, new users who have no role see a **Role Picker** screen before reaching the dashboard
- Roles: **Teacher** ("I manage a studio") or **Student** ("I'm here to learn")
- Teachers go to the existing teacher dashboard
- Students go to the new student dashboard
- Role is written to Firestore `users/{uid}` and never shown again

### What stays the same
- Google OAuth only (no email/password)
- Existing users with roles already set are unaffected — no disruption
- `getOrCreateUserProfile()` in firestore.ts already writes `role: "student"` as default — we change the flow so new users without a role get the picker instead

### Implementation notes
- Add a `RolePicker` component (full-screen overlay, two large cards)
- Check for `userProfile.role` in the auth flow; if unset or if `role === "student"` with no prior studio joins, show picker
- After role selection, call `updateUserRole(uid, role)` and redirect

## Section 2: Student Dashboard

### Layout
- Route: `/dashboard` — already exists, conditionally renders teacher vs student view based on `user.role`
- Three sections: **My Studios** | **My Responses** | **My Journey**
- Brand-cream background, consistent with the rest of the site

### My Studios tab
- Grid of studios the student has joined (via studio code)
- Each card: studio title, teacher name, active project count
- CTA to join a new studio by code

### My Responses tab
- Chronological feed of all responses the student has submitted across all studios
- Each entry: thumbnail, project title, studio name, relative date
- Clicking opens the theater modal

### My Journey tab
- Prominent link/preview of the student's Journey
- Shows the most recent 3 moments as a teaser
- Full Journey opens at `/journey` or a sub-route

### Technical approach
- New `StudentDashboard` component at `src/components/student/StudentDashboard.tsx`
- Queries: `getResponsesForUser(uid)` (already exists), `getStudiosForStudent(uid)` (new Firestore query)
- The teacher dashboard component remains untouched

## Section 3: Enhanced Journey with Teacher Interaction

### Student-owned Journey

**Student's Journey page** (`/journey` or dashboard Journey tab):
- Full timeline of responses across all studios, chronological
- Students can **pin/highlight** moments (shows in a "Highlights" section at the top)
- Students can add **freeform journal entries** — text blocks that appear in the timeline between video moments
- Privacy toggle: **private** (only student) or **shared** (public `/j/[token]` link, existing feature)

### Teacher view of student journeys

**Within a studio on the teacher dashboard:**
- New "Students" tab showing a roster of students who have submitted in that studio
- Each row: student name, response count, "View Journey" button
- Teacher opens a read-only view of any student's Journey

**Teacher interactions on a student's Journey:**
- **Recommend a moment** — teacher clicks a button on any response to recommend it; shows as a gold badge/highlight to the student ("⭐ Recommended by [Teacher Name]")
- **Leave a note** — short encouraging comment (≤200 chars) attached to a journey moment; visible only to the student on their private journey

### Data model additions

```typescript
// New types in src/lib/types.ts
export interface JourneyPin {
    id: string;
    userId: string;       // student who pinned it
    responseId: string;   // the response being pinned
    createdAt: number;
}

export interface JourneyEntry {
    id: string;
    userId: string;       // student author
    text: string;         // freeform journal text
    date: number;         // timestamp for timeline placement
    createdAt: number;
}

export interface JourneyRecommendation {
    id: string;
    teacherId: string;
    teacherName: string;
    studentId: string;
    responseId: string;
    note?: string;        // optional short message
    createdAt: number;
}
```

**Firestore collections:**
- `journeyPins/{pinId}` — indexed by `userId`
- `journeyEntries/{entryId}` — indexed by `userId`, ordered by `date`
- `journeyRecommendations/{recId}` — indexed by `studentId` and `responseId`

### Public Journey page enhancement
- `/j/[token]` already exists — enhance to show pinned highlights section at top, journal entries inline in timeline, teacher recommendation badges on moments

## Section 4: Google Classroom (Future — Not In Scope)

Skipped for now. The architecture above does not depend on it. Students join studios manually via codes.

## What We're NOT Building (YAGNI)
- Student-to-student journey visibility (teacher-student only for now)
- Journey export/PDF
- Commenting system beyond teacher notes
- Email notifications for recommendations
- Google Classroom integration (deferred)
