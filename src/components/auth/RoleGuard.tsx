"use client";

import { useAuth } from "@/lib/auth-context";
import RolePicker from "./RolePicker";
import { UserRole } from "@/lib/types";

export default function RoleGuard({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();

    // Show picker only once: signed in + profile loaded + role not yet confirmed
    if (!loading && user && profile && !profile.roleConfirmed) {
        const handleComplete = (role: UserRole) => {
            // Redirect based on chosen role
            window.location.href = "/dashboard";
        };

        return <RolePicker uid={user.uid} onComplete={handleComplete} />;
    }

    return <>{children}</>;
}
