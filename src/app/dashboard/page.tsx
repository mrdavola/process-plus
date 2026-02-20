"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Grid } from "@/lib/types";
import { getGridsForOwner, createGrid } from "@/lib/firestore";
import { Plus, LogOut, Loader2, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import Navbar from "@/components/layout/Navbar";

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [grids, setGrids] = useState<Grid[]>([]);
    const [isLoadingGrids, setIsLoadingGrids] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newGridTitle, setNewGridTitle] = useState("");

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            loadGrids();
        }
    }, [user]);

    const loadGrids = async () => {
        if (!user) return;
        setIsLoadingGrids(true);
        try {
            const userGrids = await getGridsForOwner(user.uid);
            setGrids(userGrids);
        } catch (error) {
            console.error("Failed to load grids:", error);
        } finally {
            setIsLoadingGrids(false);
        }
    };

    const handleCreateGrid = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newGridTitle.trim()) return;

        setIsCreating(true);
        try {
            await createGrid({
                title: newGridTitle.trim(),
                ownerId: user.uid,
                settings: {
                    allowGuestAccess: true,
                    moderation: false,
                },
                status: "active",
                allowedEmailDomains: [],
                theme: "default",
                coPilots: [],
            });
            setNewGridTitle("");
            // Reload grids
            await loadGrids();
        } catch (error) {
            console.error("Failed to create grid:", error);
            alert("Failed to create grid. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-sky-500" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Create Grid Section */}
                <div className="mb-12 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Create a New Grid</h2>
                    <form onSubmit={handleCreateGrid} className="flex gap-3">
                        <input
                            type="text"
                            value={newGridTitle}
                            onChange={(e) => setNewGridTitle(e.target.value)}
                            placeholder="Enter grid title (e.g. Science Class 101)"
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                            required
                        />
                        <button
                            type="submit"
                            disabled={isCreating || !newGridTitle.trim()}
                            className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isCreating ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                            Create Grid
                        </button>
                    </form>
                </div>

                {/* Grids List */}
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <LayoutGrid size={24} className="text-sky-500" />
                    Your Grids
                </h2>

                {isLoadingGrids ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-48 bg-slate-200 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : grids.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                        <div className="mx-auto size-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                            <LayoutGrid size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">No grids yet</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2">Create your first grid above to start collecting video responses from your students.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {grids.map((grid) => (
                            <Link
                                key={grid.id}
                                href={`/grids/${grid.flipCode}`}
                                className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-sky-500 hover:shadow-xl transition-all duration-300 flex flex-col h-full"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="size-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                                        {grid.icon ? (
                                            <span className="text-2xl">{grid.icon}</span>
                                        ) : (
                                            grid.title.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono font-bold rounded-full">
                                        {grid.flipCode}
                                    </div>
                                </div>

                                <h3 className="font-bold text-xl text-slate-900 mb-2 truncate group-hover:text-sky-500 transition-colors">
                                    {grid.title}
                                </h3>
                                {/* We could fetch stats here using a separate component or include in grid data */}
                                <p className="text-slate-500 text-sm mt-auto pt-4 border-t border-slate-100">
                                    Click to manage topics
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
