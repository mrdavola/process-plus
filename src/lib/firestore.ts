
import {
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    updateDoc,
    setDoc,
    deleteDoc,
    serverTimestamp,
    Timestamp,
    writeBatch,
    increment,
    arrayUnion,
    arrayRemove
} from "firebase/firestore";
import { db } from "./firebase";
import { Studio, Project, Response, UserProfile, UserRole, ProjectStatus, Notification, JourneyShare, JourneyEntry, JourneyRecommendation } from "./types";

// Helper to recursively remove undefined fields
function removeUndefined(obj: any): any {
    if (obj === undefined) return undefined;
    if (obj === null) return null;
    if (Array.isArray(obj)) return obj.map(removeUndefined).filter(v => v !== undefined);
    if (typeof obj === "object" && !(obj instanceof Timestamp) && !(obj instanceof Date)) {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
            const cleanVal = removeUndefined(value);
            if (cleanVal !== undefined) {
                cleaned[key] = cleanVal;
            }
        }
        return cleaned;
    }
    return obj;
}

// --- Studios ---

export async function generateUniqueProcessPlusCode(): Promise<string> {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    let isUnique = false;

    while (!isUnique) {
        code = "";
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Check if code exists
        const q = query(collection(db, "studios"), where("processPlusCode", "==", code));
        const snap = await getDocs(q);
        if (snap.empty) {
            isUnique = true;
        }
    }
    return code;
}

export async function createStudio(data: Omit<Studio, "id" | "processPlusCode" | "createdAt" | "updatedAt">): Promise<string> {
    const processPlusCode = await generateUniqueProcessPlusCode();

    const studioData: Omit<Studio, "id"> = {
        ...data,
        processPlusCode,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    const docRef = await addDoc(collection(db, "studios"), studioData);
    return docRef.id;
}

export async function getStudio(id: string): Promise<Studio | null> {
    const docRef = doc(db, "studios", id);
    const snap = await getDoc(docRef);
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Studio) : null;
}

export async function getStudioByProcessPlusCode(processPlusCode: string): Promise<Studio | null> {
    const q = query(collection(db, "studios"), where("processPlusCode", "==", processPlusCode));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as Studio;
}

export async function updateProject(id: string, data: Partial<Omit<Project, "id" | "studioId" | "joinCode" | "createdAt">>) {
    const docRef = doc(db, "projects", id);
    const cleanedData = removeUndefined(data);
    await updateDoc(docRef, { ...cleanedData, updatedAt: Date.now() });
}

export async function deleteStudio(studioId: string): Promise<void> {
    // 1. Get all projects for this studio
    const projectsQ = query(collection(db, "projects"), where("studioId", "==", studioId));
    const projectsSnap = await getDocs(projectsQ);

    // 2. Delete all projects (which should cascade delete responses)
    const deletePromises = projectsSnap.docs.map(doc => deleteProject(doc.id));
    await Promise.all(deletePromises);

    // 3. Delete the studio itself
    await deleteDoc(doc(db, "studios", studioId));
}

export async function getStudiosForOwner(ownerId: string): Promise<Studio[]> {
    const q = query(
        collection(db, "studios"),
        where("ownerId", "==", ownerId),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Studio));
}

export async function updateStudio(id: string, data: Partial<Omit<Studio, "id">>) {
    const docRef = doc(db, "studios", id);

    // If processPlusCode is being updated, verify uniqueness
    if (data.processPlusCode) {
        const q = query(collection(db, "studios"), where("processPlusCode", "==", data.processPlusCode));
        const snap = await getDocs(q);

        // If there's a match, make sure it's not the current studio
        if (!snap.empty) {
            const matchId = snap.docs[0].id;
            if (matchId !== id) {
                throw new Error("ProcessPlus code is already taken.");
            }
        }
    }

    // Filter out undefined fields to prevent Firebase invalid data errors
    const cleanedData = removeUndefined(data);

    await updateDoc(docRef, {
        ...cleanedData,
        updatedAt: Date.now()
    });
}

export async function generateUniqueProjectCode(): Promise<string> {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    let isUnique = false;

    while (!isUnique) {
        code = "";
        for (let i = 0; i < 7; i++) { // Let's make it 7 chars to avoid studio collisions
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const q = query(collection(db, "projects"), where("joinCode", "==", code));
        const snap = await getDocs(q);
        if (snap.empty) {
            isUnique = true;
        }
    }
    return code;
}

export async function createProject(data: Omit<Project, "id" | "joinCode" | "createdAt">): Promise<string> {
    const joinCode = await generateUniqueProjectCode();
    const docRef = await addDoc(collection(db, "projects"), {
        ...data,
        joinCode,
        createdAt: serverTimestamp()
    });
    return docRef.id;
}

export async function getProject(id: string): Promise<Project | null> {
    const docRef = doc(db, "projects", id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Project;
    }
    return null;
}

export async function getProjectByJoinCode(joinCode: string): Promise<Project | null> {
    const q = query(collection(db, "projects"), where("joinCode", "==", joinCode));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as Project;
}

export async function getProjectsForStudio(studioId: string): Promise<Project[]> {
    const q = query(
        collection(db, "projects"),
        where("studioId", "==", studioId),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
}

// --- Responses ---

export async function incrementResponseViews(responseId: string): Promise<void> {
    const ref = doc(db, "responses", responseId);
    await updateDoc(ref, {
        views: increment(1)
    });
}

export async function createResponse(data: Omit<Response, "id">): Promise<string> {
    const batch = writeBatch(db);
    const newResponseRef = doc(collection(db, "responses"));

    batch.set(newResponseRef, {
        ...data,
        createdAt: serverTimestamp()
    });

    const projectRef = doc(db, "projects", data.projectId);
    const projectSnap = await getDoc(projectRef);

    if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        const projectId = projectRef.id; // Use the ref ID, NOT projectData.id (which is undefined)

        const updates: any = {
            responseCount: increment(1),
            lastResponseAt: Date.now()
        };
        if (data.status === "hidden") {
            updates.pendingCount = increment(1);
        }
        batch.update(projectRef, updates);

        const studioRef = doc(db, "studios", projectData.studioId);
        const studioSnap = await getDoc(studioRef);

        if (studioSnap.exists()) {
            const studio = { id: studioSnap.id, ...studioSnap.data() } as Studio;
            const notificationType = data.status === "hidden" ? "pending_approval" : "new_response";
            const recipients = Array.from(new Set([studio.ownerId, ...(studio.coPilots || [])]));

            for (const recipientId of recipients) {
                if (recipientId === data.userId) continue;

                const notifRef = doc(collection(db, "notifications"));
                batch.set(notifRef, {
                    recipientId,
                    studioId: studio.id,
                    projectId,  // Now correctly using projectRef.id
                    responseId: newResponseRef.id,
                    type: notificationType,
                    title: data.status === "hidden" ? "New response pending approval" : "New response",
                    body: `${data.userDisplayName} posted in ${projectData.title}`,
                    createdAt: Date.now(),
                    read: false
                });
            }
        }
    }

    await batch.commit();
    return newResponseRef.id;
}

export async function getResponsesForProject(projectId: string): Promise<Response[]> {
    const q = query(
        collection(db, "responses"),
        where("projectId", "==", projectId),
        where("status", "==", "active"),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Response));
}

export async function getOrCreateUserProfile(uid: string, email: string, displayName: string): Promise<UserProfile> {
    const docRef = doc(db, "users", uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return { uid: snap.id, ...snap.data() } as UserProfile;
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
    return snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null;
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
    await updateDoc(doc(db, "users", uid), { role, roleConfirmed: true });
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus): Promise<void> {
    await updateDoc(doc(db, "projects", projectId), { status });
}

// import { arrayUnion, arrayRemove } from "firebase/firestore"; // Now at top

export async function addObservation(responseId: string, userId: string, text: string): Promise<void> {
    const observationsRef = collection(db, "responses", responseId, "observations");
    await addDoc(observationsRef, {
        userId,
        text,
        createdAt: serverTimestamp()
    });

    // Optionally increment a counter on the parent response
    const responseRef = doc(db, "responses", responseId);
    await updateDoc(responseRef, {
        observationsCount: increment(1)
    });
}

export async function toggleSpotlight(responseId: string, currentlySpotlighted: boolean): Promise<void> {
    const docRef = doc(db, "responses", responseId);
    await updateDoc(docRef, { isSpotlighted: !currentlySpotlighted });
}

export async function addResponsefeedback(responseId: string, feedbackText: string): Promise<void> {
    const docRef = doc(db, "responses", responseId);
    await updateDoc(docRef, { "feedback.text": feedbackText });
}

export async function approveResponse(responseId: string): Promise<void> {
    const resSnap = await getDoc(doc(db, "responses", responseId));
    if (!resSnap.exists()) return;
    const data = resSnap.data() as Response;

    const batch = writeBatch(db);
    batch.update(doc(db, "responses", responseId), { status: "active" });

    if (data.status === "hidden") {
        batch.update(doc(db, "projects", data.projectId), { pendingCount: increment(-1) });
    }
    await batch.commit();
}

export async function hideResponse(responseId: string): Promise<void> {
    const resSnap = await getDoc(doc(db, "responses", responseId));
    if (!resSnap.exists()) return;
    const data = resSnap.data() as Response;

    const batch = writeBatch(db);
    batch.update(doc(db, "responses", responseId), { status: "hidden" });

    if (data.status === "active") {
        batch.update(doc(db, "projects", data.projectId), { pendingCount: increment(1) });
    }
    await batch.commit();
}

export async function deleteProject(projectId: string): Promise<void> {
    // 1. Get all responses
    const resQ = query(collection(db, "responses"), where("projectId", "==", projectId));
    const resSnap = await getDocs(resQ);

    // 2. Delete all responses
    const deletePromises = resSnap.docs.map(d => deleteResponse(d.id));
    await Promise.all(deletePromises);

    // 3. Delete project
    await deleteDoc(doc(db, "projects", projectId));
}

export async function deleteResponse(responseId: string): Promise<void> {
    const resSnap = await getDoc(doc(db, "responses", responseId));
    if (!resSnap.exists()) return;
    const data = resSnap.data() as Response;

    const batch = writeBatch(db);
    batch.delete(doc(db, "responses", responseId));

    const updates: any = { responseCount: increment(-1) };
    if (data.status === "hidden") {
        updates.pendingCount = increment(-1);
    }

    batch.update(doc(db, "projects", data.projectId), updates);
    await batch.commit();
}

export async function findDestinationByCode(code: string): Promise<string | null> {
    const normalizedCode = code.trim().toLowerCase();

    // Check Studios first
    const studio = await getStudioByProcessPlusCode(normalizedCode);
    if (studio) return `/studios/${studio.processPlusCode}`;

    // Check Projects next
    const project = await getProjectByJoinCode(normalizedCode);
    if (project) {
        // Need to find the parent studio to form the URL
        const parentStudio = await getStudio(project.studioId);
        if (parentStudio) {
            return `/studios/${parentStudio.processPlusCode}/projects/${project.id}`;
        }
    }
    return null;
}

// --- Notifications ---

export async function getNotifications(userId: string): Promise<Notification[]> {
    const q = query(
        collection(db, "notifications"),
        where("recipientId", "==", userId),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
}

export async function markNotificationRead(notificationId: string): Promise<void> {
    await updateDoc(doc(db, "notifications", notificationId), { read: true });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
    const q = query(collection(db, "notifications"), where("recipientId", "==", userId), where("read", "==", false));
    const snap = await getDocs(q);

    const batch = writeBatch(db);
    snap.docs.forEach(d => {
        batch.update(d.ref, { read: true });
    });
    await batch.commit();
}

// --- Journey ---

export async function getResponsesForUser(userId: string): Promise<Response[]> {
    const q = query(
        collection(db, "responses"),
        where("userId", "==", userId),
        where("status", "==", "active"),
        orderBy("createdAt", "asc")  // oldest first so timeline reads top→bottom
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt,
        } as Response;
    });
}

export async function getOrCreateJourneyToken(userId: string, displayName: string): Promise<string> {
    // Check if a token already exists for this user
    const q = query(collection(db, "journeys"), where("userId", "==", userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
        return snap.docs[0].id; // return existing token
    }
    // Create a new one
    const docRef = await addDoc(collection(db, "journeys"), {
        userId,
        displayName,
        createdAt: Date.now()
    } as Omit<JourneyShare, "id">);
    return docRef.id;
}

export async function getJourneyByToken(token: string): Promise<JourneyShare | null> {
    const docRef = doc(db, "journeys", token);
    const snap = await getDoc(docRef);
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as JourneyShare) : null;
}

export async function setResponseFeatured(responseId: string, isFeatured: boolean): Promise<void> {
    await updateDoc(doc(db, "responses", responseId), { isFeatured });
}

export async function createJourneyEntry(
    userId: string,
    text: string,
    authorId: string,
    authorName: string,
    imageUrl?: string,
): Promise<JourneyEntry> {
    const data: Omit<JourneyEntry, "id"> = {
        userId,
        authorId,
        authorName,
        text: text.trim(),
        createdAt: Date.now(),
        ...(imageUrl ? { imageUrl } : {}),
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

export async function toggleHideFromJourney(uid: string, responseId: string, hidden: boolean): Promise<void> {
    await updateDoc(doc(db, "users", uid), {
        hiddenResponseIds: hidden ? arrayUnion(responseId) : arrayRemove(responseId),
    });
}

export async function toggleJourneyPin(uid: string, responseId: string, pinned: boolean): Promise<void> {
    const ref = doc(db, "users", uid);
    await updateDoc(ref, {
        pinnedResponseIds: pinned ? arrayUnion(responseId) : arrayRemove(responseId),
    });
}


export async function getAllUsers(): Promise<UserProfile[]> {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
}

export async function getAllStudios(): Promise<Studio[]> {
    const snap = await getDocs(collection(db, "studios"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Studio));
}
