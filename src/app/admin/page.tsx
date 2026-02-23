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
