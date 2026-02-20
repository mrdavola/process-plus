
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
import { Grid, Topic, Response, UserProfile, UserRole, TopicStatus, Notification } from "./types";

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

// --- Grids ---

export async function generateUniqueFlipCode(): Promise<string> {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    let isUnique = false;

    while (!isUnique) {
        code = "";
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Check if code exists
        const q = query(collection(db, "grids"), where("flipCode", "==", code));
        const snap = await getDocs(q);
        if (snap.empty) {
            isUnique = true;
        }
    }
    return code;
}

export async function createGrid(data: Omit<Grid, "id" | "flipCode" | "createdAt" | "updatedAt">): Promise<string> {
    const flipCode = await generateUniqueFlipCode();

    const gridData: Omit<Grid, "id"> = {
        ...data,
        flipCode,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    const docRef = await addDoc(collection(db, "grids"), gridData);
    return docRef.id;
}

export async function getGrid(id: string): Promise<Grid | null> {
    const docRef = doc(db, "grids", id);
    const snap = await getDoc(docRef);
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Grid) : null;
}

export async function getGridByFlipCode(flipCode: string): Promise<Grid | null> {
    const q = query(collection(db, "grids"), where("flipCode", "==", flipCode));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as Grid;
}

export async function updateTopic(id: string, data: Partial<Omit<Topic, "id" | "gridId" | "joinCode" | "createdAt">>) {
    const docRef = doc(db, "topics", id);
    const cleanedData = removeUndefined(data);
    await updateDoc(docRef, { ...cleanedData, updatedAt: Date.now() });
}

export async function deleteGrid(gridId: string): Promise<void> {
    // 1. Get all topics for this grid
    const topicsQ = query(collection(db, "topics"), where("gridId", "==", gridId));
    const topicsSnap = await getDocs(topicsQ);

    // 2. Delete all topics (which should cascade delete responses)
    const deletePromises = topicsSnap.docs.map(doc => deleteTopic(doc.id));
    await Promise.all(deletePromises);

    // 3. Delete the grid itself
    await deleteDoc(doc(db, "grids", gridId));
}

export async function getGridsForOwner(ownerId: string): Promise<Grid[]> {
    const q = query(
        collection(db, "grids"),
        where("ownerId", "==", ownerId),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Grid));
}

export async function updateGrid(id: string, data: Partial<Omit<Grid, "id">>) {
    const docRef = doc(db, "grids", id);

    // If flipCode is being updated, verify uniqueness
    if (data.flipCode) {
        const q = query(collection(db, "grids"), where("flipCode", "==", data.flipCode));
        const snap = await getDocs(q);

        // If there's a match, make sure it's not the current grid
        if (!snap.empty) {
            const matchId = snap.docs[0].id;
            if (matchId !== id) {
                throw new Error("Flip code is already taken.");
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

export async function generateUniqueTopicCode(): Promise<string> {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    let isUnique = false;

    while (!isUnique) {
        code = "";
        for (let i = 0; i < 7; i++) { // Let's make it 7 chars to avoid grid collisions
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const q = query(collection(db, "topics"), where("joinCode", "==", code));
        const snap = await getDocs(q);
        if (snap.empty) {
            isUnique = true;
        }
    }
    return code;
}

export async function createTopic(data: Omit<Topic, "id" | "joinCode" | "createdAt">): Promise<string> {
    const joinCode = await generateUniqueTopicCode();
    const docRef = await addDoc(collection(db, "topics"), {
        ...data,
        joinCode,
        createdAt: serverTimestamp()
    });
    return docRef.id;
}

export async function getTopic(id: string): Promise<Topic | null> {
    const docRef = doc(db, "topics", id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Topic;
    }
    return null;
}

export async function getTopicByJoinCode(joinCode: string): Promise<Topic | null> {
    const q = query(collection(db, "topics"), where("joinCode", "==", joinCode));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as Topic;
}

export async function getTopicsForGrid(gridId: string): Promise<Topic[]> {
    const q = query(
        collection(db, "topics"),
        where("gridId", "==", gridId),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Topic));
}

// --- Responses ---

export async function createResponse(data: Omit<Response, "id">): Promise<string> {
    const batch = writeBatch(db);
    const newResponseRef = doc(collection(db, "responses"));

    batch.set(newResponseRef, {
        ...data,
        createdAt: serverTimestamp()
    });

    const topicRef = doc(db, "topics", data.topicId);
    const topicSnap = await getDoc(topicRef);

    if (topicSnap.exists()) {
        const topic = topicSnap.data() as Topic;

        const updates: any = {
            responseCount: increment(1),
            lastResponseAt: Date.now()
        };
        if (data.status === "hidden") {
            updates.pendingCount = increment(1);
        }
        batch.update(topicRef, updates);

        const gridRef = doc(db, "grids", topic.gridId);
        const gridSnap = await getDoc(gridRef);

        if (gridSnap.exists()) {
            const grid = { id: gridSnap.id, ...gridSnap.data() } as Grid;
            const notificationType = data.status === "hidden" ? "pending_approval" : "new_response";
            const recipients = Array.from(new Set([grid.ownerId, ...(grid.coPilots || [])]));

            for (const recipientId of recipients) {
                if (recipientId === data.userId) continue;

                const notifRef = doc(collection(db, "notifications"));
                batch.set(notifRef, {
                    recipientId,
                    gridId: grid.id,
                    topicId: topic.id,
                    responseId: newResponseRef.id,
                    type: notificationType,
                    title: data.status === "hidden" ? "New response pending approval" : "New response",
                    body: `${data.userDisplayName} posted in ${topic.title}`,
                    createdAt: Date.now(),
                    read: false
                });
            }
        }
    }

    await batch.commit();
    return newResponseRef.id;
}

export async function getResponsesForTopic(topicId: string): Promise<Response[]> {
    const q = query(
        collection(db, "responses"),
        where("topicId", "==", topicId),
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
    await updateDoc(doc(db, "users", uid), { role });
}

export async function updateTopicStatus(topicId: string, status: TopicStatus): Promise<void> {
    await updateDoc(doc(db, "topics", topicId), { status });
}

// import { arrayUnion, arrayRemove } from "firebase/firestore"; // Now at top

export async function toggleResponseReaction(responseId: string, userId: string, currentlyLiked: boolean): Promise<void> {
    const docRef = doc(db, "responses", responseId);
    if (currentlyLiked) {
        await updateDoc(docRef, { reactions: arrayRemove(userId) });
    } else {
        await updateDoc(docRef, { reactions: arrayUnion(userId) });
    }
}

export async function addResponseFeedback(responseId: string, feedbackText: string): Promise<void> {
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
        batch.update(doc(db, "topics", data.topicId), { pendingCount: increment(-1) });
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
        batch.update(doc(db, "topics", data.topicId), { pendingCount: increment(1) });
    }
    await batch.commit();
}

export async function deleteTopic(topicId: string): Promise<void> {
    // 1. Get all responses
    const resQ = query(collection(db, "responses"), where("topicId", "==", topicId));
    const resSnap = await getDocs(resQ);

    // 2. Delete all responses
    const deletePromises = resSnap.docs.map(d => deleteResponse(d.id));
    await Promise.all(deletePromises);

    // 3. Delete topic
    await deleteDoc(doc(db, "topics", topicId));
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

    batch.update(doc(db, "topics", data.topicId), updates);
    await batch.commit();
}

export async function findDestinationByCode(code: string): Promise<string | null> {
    const normalizedCode = code.trim().toLowerCase();

    // Check Grids first
    const grid = await getGridByFlipCode(normalizedCode);
    if (grid) return `/grids/${grid.flipCode}`;

    // Check Topics next
    const topic = await getTopicByJoinCode(normalizedCode);
    if (topic) {
        // Need to find the parent grid to form the URL
        const parentGrid = await getGrid(topic.gridId);
        if (parentGrid) {
            return `/grids/${parentGrid.flipCode}/topics/${topic.id}`;
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
