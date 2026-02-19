
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
    serverTimestamp,
    Timestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { Grid, Topic, Response, UserProfile, UserRole } from "./types";

// --- Grids ---

export async function createGrid(data: Omit<Grid, "id">): Promise<string> {
    const docRef = await addDoc(collection(db, "grids"), {
        ...data,
        createdAt: serverTimestamp()
    });
    return docRef.id;
}

export async function getGrid(id: string): Promise<Grid | null> {
    const docRef = doc(db, "grids", id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Grid;
    }
    return null;
}

export async function getGridByFlipCode(flipCode: string): Promise<Grid | null> {
    const q = query(collection(db, "grids"), where("flipCode", "==", flipCode));
    const snap = await getDocs(q);
    if (!snap.empty) {
        const docSnap = snap.docs[0];
        return { id: docSnap.id, ...docSnap.data() } as Grid;
    }
    return null;
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

// --- Topics ---

export async function createTopic(data: Omit<Topic, "id">): Promise<string> {
    const docRef = await addDoc(collection(db, "topics"), {
        ...data,
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
    const docRef = await addDoc(collection(db, "responses"), {
        ...data,
        createdAt: serverTimestamp()
    });
    return docRef.id;
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
