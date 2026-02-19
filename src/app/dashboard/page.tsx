"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Grid3X3, Video, LogOut } from "lucide-react";
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
        if (!loading && !user) router.push("/login");
        if (!loading && profile && profile.role === "student") router.push("/join");
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

    if (loading || !user || !profile) {
        return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50">
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
                        <button
                            onClick={() => logout().then(() => router.push("/login"))}
                            className="p-2 text-slate-500 hover:text-slate-900 transition-colors"
                            aria-label="Sign out"
                        >
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
                        <button
                            onClick={() => setShowCreateGrid(true)}
                            className="px-6 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-colors"
                        >
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
                                    {grid.theme && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={grid.theme} alt="" className="w-full h-full object-cover opacity-60" />
                                    )}
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-slate-900 text-lg mb-1 truncate">{grid.title}</h3>
                                    <div className="flex items-center gap-2 mt-3">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Join Code</span>
                                        <span className="text-sm font-bold text-sky-500 bg-sky-50 px-2 py-0.5 rounded-lg font-mono">{grid.flipCode}</span>
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
