"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Studio } from "@/lib/types";
import { getStudiosForOwner, createStudio } from "@/lib/firestore";
import { Plus, LogOut, Loader2, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import Navbar from "@/components/layout/Navbar";

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [studios, setStudios] = useState<Studio[]>([]);
    const [isLoadingStudios, setIsLoadingStudios] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newStudioTitle, setNewStudioTitle] = useState("");

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            loadStudios();
        }
    }, [user]);

    const loadStudios = async () => {
        if (!user) return;
        setIsLoadingStudios(true);
        try {
            const userStudios = await getStudiosForOwner(user.uid);
            setStudios(userStudios);
        } catch (error) {
            console.error("Failed to load studios:", error);
        } finally {
            setIsLoadingStudios(false);
        }
    };

    const handleCreateStudio = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newStudioTitle.trim()) return;

        setIsCreating(true);
        try {
            await createStudio({
                title: newStudioTitle.trim(),
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
            setNewStudioTitle("");
            // Reload studios
            await loadStudios();
        } catch (error) {
            console.error("Failed to create studio:", error);
            alert("Failed to create studio. Please try again.");
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
                {/* Create Studio Section */}
                <div className="mb-12 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Create a New Studio</h2>
                    <form onSubmit={handleCreateStudio} className="flex gap-3">
                        <input
                            type="text"
                            value={newStudioTitle}
                            onChange={(e) => setNewStudioTitle(e.target.value)}
                            placeholder="Enter studio title (e.g. Science Class 101)"
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                            required
                        />
                        <button
                            type="submit"
                            disabled={isCreating || !newStudioTitle.trim()}
                            className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isCreating ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                            Create Studio
                        </button>
                    </form>
                </div>

                {/* Studios List */}
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <LayoutGrid size={24} className="text-sky-500" />
                    Your Studios
                </h2>

                {isLoadingStudios ? (
                    <div className="studio studio-cols-1 md:studio-cols-2 lg:studio-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-48 bg-slate-200 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : studios.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                        <div className="mx-auto size-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                            <LayoutGrid size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">No studios yet</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2">Create your first studio above to start collecting video responses from your students.</p>
                    </div>
                ) : (
                    <div className="studio studio-cols-1 md:studio-cols-2 lg:studio-cols-3 gap-6">
                        {studios.map((studio) => (
                            <Link
                                key={studio.id}
                                href={`/studios/${studio.processPlusCode}`}
                                className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-sky-500 hover:shadow-xl transition-all duration-300 flex flex-col h-full"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="size-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                                        {studio.icon ? (
                                            <span className="text-2xl">{studio.icon}</span>
                                        ) : (
                                            studio.title.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono font-bold rounded-full">
                                        {studio.processPlusCode}
                                    </div>
                                </div>

                                <h3 className="font-bold text-xl text-slate-900 mb-2 truncate group-hover:text-sky-500 transition-colors">
                                    {studio.title}
                                </h3>
                                {/* We could fetch stats here using a separate component or include in studio data */}
                                <p className="text-slate-500 text-sm mt-auto pt-4 border-t border-slate-100">
                                    Click to manage projects
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
