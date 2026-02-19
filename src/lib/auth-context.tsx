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
        let cancelled = false;
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                try {
                    const p = await getOrCreateUserProfile(
                        firebaseUser.uid,
                        firebaseUser.email ?? "",
                        firebaseUser.displayName ?? "User"
                    );
                    if (!cancelled) setProfile(p);
                } catch (err) {
                    console.error("Failed to load user profile:", err);
                } finally {
                    if (!cancelled) setLoading(false);
                }
            } else {
                if (!cancelled) {
                    setProfile(null);
                    setLoading(false);
                }
            }
        });
        return () => {
            cancelled = true;
            unsub();
        };
    }, []);

    return <AuthContext.Provider value={{ user, profile, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
