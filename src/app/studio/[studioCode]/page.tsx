"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Studio, Project } from "@/lib/types";
import { getStudioByProcessPlusCode, deleteStudio, deleteProject, updateStudio } from "@/lib/firestore";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Plus, ArrowLeft, Trash2, Calendar, Share, MoreVertical, Search, ArrowDownUp } from "lucide-react";
import Link from "next/link";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/layout/Navbar";
import StudioSettingsModal from "@/components/studio-settings/StudioSettingsModal";
import { Settings } from "lucide-react";
import { getDocs, updateDoc, doc as firestoreDoc } from "firebase/firestore";

export default function StudioPage() {
    const params = useParams<{ studioCode: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const [studio, setStudio] = useState<Studio | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [copiedShare, setCopiedShare] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleCopyShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
    };
    const [newProjectTitle, setNewProjectTitle] = useState("");
    const [newProjectPrompt, setNewProjectPrompt] = useState("");

    type SortOption = "newest_activity" | "newest_created" | "most_responses" | "needs_review";
    const [sortOption, setSortOption] = useState<SortOption>("newest_activity");
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch Studio
    useEffect(() => {
        if (!params.studioCode) return;
        getStudioByProcessPlusCode(params.studioCode)
            .then(g => {
                setStudio(g);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch studio:", err);
                setIsLoading(false);
            });
    }, [params.studioCode]);

    const isOwner = user && studio ? user.uid === studio.ownerId : false;

    // Real-time Projects Listener
    useEffect(() => {
        if (!studio) return;

        const q = query(
            collection(db, "projects"),
            where("studioId", "==", studio.id)
            // orderBy("createdAt", "desc") // requires index, can skip for now or add
        );

        const unsub = onSnapshot(q, (snap) => {
            const fetchedProjects = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
            // Manual sort as backup
            fetchedProjects.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setProjects(fetchedProjects);

            // One-time sync for inaccurate counts (Owner only)
            if (isOwner) {
                fetchedProjects.forEach(async (project) => {
                    // If count is missing or seems suspicious (e.g. 0 but we want to be sure), 
                    // we can trigger a sync. For now, let's sync if it's undefined or 0 to be safe for legacy data.
                    if (project.responseCount === undefined) {
                        const respQ = query(collection(db, "responses"), where("projectId", "==", project.id));
                        const respSnap = await getDocs(respQ);
                        const actualCount = respSnap.size;
                        const pendingCount = respSnap.docs.filter(d => d.data().status === "hidden").length;

                        await updateDoc(firestoreDoc(db, "projects", project.id), {
                            responseCount: actualCount,
                            pendingCount: pendingCount
                        });
                    }
                });
            }
        }, (error) => {
            console.error("Error fetching projects:", error);
        });

        return unsub;
    }, [studio, isOwner]);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studio || !isOwner || !newProjectTitle.trim()) return;

        setIsCreatingProject(true);
        try {
            await addDoc(collection(db, "projects"), {
                studioId: studio.id,
                title: newProjectTitle.trim(),
                promptText: newProjectPrompt.trim() || "Share your thoughts!",
                status: "active",
                settings: {
                    maxDuration: 120,
                    moderation: false,
                    micOnly: false,
                    uploadClip: true,
                    pauseResume: true,
                    selfieDecorations: true,
                    studentReplies: true,
                    videoReactions: true,
                    feedbackbackType: "none",
                    privatefeedbackback: false
                },
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            setNewProjectTitle("");
            setNewProjectPrompt("");
        } catch (error) {
            console.error("Failed to create project:", error);
        } finally {
            setIsCreatingProject(false);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!confirm("Are you sure you want to delete this project?")) return;
        try {
            await deleteProject(projectId);
        } catch (error) {
            console.error("Failed to delete project:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-brand-cream flex items-center justify-center">
                <Loader2 className="animate-spin text-brand-amber" size={32} />
            </div>
        );
    }

    if (!studio) {
        return (
            <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center gap-4">
                <p className="text-xl font-bold text-brand-warm">Studio not found!</p>
                <Link href="/dashboard" className="text-brand-amber hover:underline hover:text-brand-amber/80 font-bold">Return to Dashboard</Link>
            </div>
        );
    }

    const filteredAndSortedProjects = projects
        .filter(t =>
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.promptText.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (sortOption === "newest_activity") {
                const timeA = a.lastResponseAt || a.createdAt || 0;
                const timeB = b.lastResponseAt || b.createdAt || 0;
                return timeB - timeA;
            }
            if (sortOption === "newest_created") {
                return (b.createdAt || 0) - (a.createdAt || 0);
            }
            if (sortOption === "most_responses") {
                return (b.responseCount || 0) - (a.responseCount || 0);
            }
            if (sortOption === "needs_review") {
                const pendingDiff = (b.pendingCount || 0) - (a.pendingCount || 0);
                if (pendingDiff !== 0) return pendingDiff;
                const timeA = a.lastResponseAt || a.createdAt || 0;
                const timeB = b.lastResponseAt || b.createdAt || 0;
                return timeB - timeA;
            }
            return 0;
        });

    return (
        <div className="min-h-screen bg-brand-cream text-brand-warm">
            <Navbar />
            {/* Banner/Header */}
            <div className="bg-white border-b border-brand-amber/10 shadow-sm relative z-10">
                <div className="max-w-5xl mx-auto px-4 py-8">
                    <nav className="flex items-center gap-2 text-sm font-bold text-brand-slate mb-6">
                        <Link href="/dashboard" className="hover:text-brand-amber transition-colors">Dashboard</Link>
                        <span>/</span>
                        <span className="text-brand-warm">{studio.title}</span>
                    </nav>

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div>
                            <div className="inline-block px-3 py-1 bg-brand-amber/10 text-brand-amber text-sm font-bold rounded-full mb-3 shadow-inner">
                                ProcessPlus Code: <span className="font-mono">{studio.processPlusCode}</span>
                            </div>
                            <h1 className="text-4xl font-display text-brand-warm mb-2 tracking-tight flex items-center gap-3">
                                {studio.icon && <span>{studio.icon}</span>}
                                {studio.title}
                            </h1>
                            <p className="text-brand-slate font-medium">Manage your projects and student responses.</p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleCopyShare}
                                className={`flex items-center gap-2 px-5 py-3 border font-bold rounded-full transition-all shadow-sm ${copiedShare
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                    }`}
                            >
                                <Share size={18} />
                                {copiedShare ? "Copied!" : "Share"}
                            </button>
                            {isOwner && (
                                <>
                                    <button
                                        onClick={() => setIsSettingsOpen(true)}
                                        className="flex items-center gap-2 px-5 py-3 border border-brand-amber/20 text-brand-slate font-bold rounded-full hover:bg-brand-cream transition-all shadow-sm hover:text-brand-amber"
                                    >
                                        <Settings size={18} />
                                        Settings
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (confirm("Delete this entire GRID? This action accepts no gravity and cannot be undone.")) {
                                                await deleteStudio(studio.id);
                                                router.push("/dashboard");
                                            }
                                        }}
                                        className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-600 font-bold rounded-full hover:bg-red-100 transition-all shadow-sm hover:shadow-md"
                                    >
                                        <Trash2 size={18} />
                                        Delete Studio
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-4 py-12">
                {/* Create Project Form */}
                {isOwner && (
                    <div className="mb-12 bg-white rounded-3xl p-8 shadow-sm border border-brand-amber/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-amber/5 rounded-bl-full -mr-8 -mt-8 opacity-50" />

                        <div className="flex items-center gap-4 mb-8 relative">
                            <div className="size-12 rounded-2xl bg-brand-amber/20 text-brand-amber flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform rotate-3">
                                <Plus size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-display text-brand-warm">Add a New Project</h2>
                                <p className="text-brand-slate">Spark a discussion with your students.</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateProject} className="space-y-4 relative">
                            <div>
                                <label className="block text-sm font-bold text-brand-warm mb-2 ml-1">Project Title</label>
                                <input
                                    type="text"
                                    value={newProjectTitle}
                                    onChange={(e) => setNewProjectTitle(e.target.value)}
                                    placeholder="e.g., Weekly Reflection, Book Report"
                                    className="w-full px-5 py-4 rounded-xl border-2 border-brand-amber/10 bg-brand-cream text-brand-warm focus:bg-white focus:border-brand-amber focus:ring-4 focus:ring-brand-amber/10 transition-all font-bold text-lg outline-none placeholder:font-normal placeholder:text-brand-slate"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-brand-warm mb-2 ml-1">Prompt</label>
                                <textarea
                                    value={newProjectPrompt}
                                    onChange={(e) => setNewProjectPrompt(e.target.value)}
                                    placeholder="What do you want your students to discuss?"
                                    className="w-full px-5 py-4 rounded-xl border-2 border-brand-amber/10 bg-brand-cream text-brand-warm focus:bg-white focus:border-brand-amber focus:ring-4 focus:ring-brand-amber/10 transition-all min-h-[120px] outline-none placeholder:text-brand-slate resize-y"
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={isCreatingProject || !newProjectTitle.trim()}
                                    className="px-8 py-4 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 text-lg"
                                    style={{ backgroundColor: '#c2410c' }}
                                >
                                    {isCreatingProject ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={20} />
                                            Create Project
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Projects List Controls */}
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                        <h2 className="text-xl font-display text-brand-warm flex items-center gap-2">
                            <span className="bg-brand-amber text-white size-6 rounded flex items-center justify-center text-xs font-bold">{projects.length}</span>
                            Active Projects
                        </h2>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search projects..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-amber/50 transition-shadow"
                                />
                            </div>
                            <div className="relative w-full sm:w-auto">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <ArrowDownUp size={16} />
                                </div>
                                <select
                                    value={sortOption}
                                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                                    className="w-full sm:w-auto pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-amber/50 transition-shadow appearance-none cursor-pointer"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                        backgroundPosition: `right 0.5rem center`,
                                        backgroundRepeat: `no-repeat`,
                                        backgroundSize: `1.5em 1.5em`
                                    }}
                                >
                                    <option value="newest_activity">Newest Activity</option>
                                    <option value="newest_created">Newest Created</option>
                                    <option value="most_responses">Most Responses</option>
                                    <option value="needs_review">Needs Review</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        {filteredAndSortedProjects.map((project) => (
                            <div key={project.id} className="group bg-white rounded-2xl p-1 border border-brand-amber/10 hover:border-brand-amber hover:shadow-md transition-all duration-300">
                                <div className="flex items-center gap-4 p-5">
                                    <Link href={`/studio/${studio.processPlusCode}/projects/${project.id}`} className="flex-1 flex items-start gap-5">
                                        <div className="size-16 rounded-xl bg-brand-cream text-brand-amber flex flex-col items-center justify-center group-hover:scale-105 transition-transform">
                                            {project.icon ? (
                                                <span className="text-3xl">{project.icon}</span>
                                            ) : (
                                                <Calendar size={28} className="text-brand-amber/90" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xl font-bold text-brand-warm group-hover:text-brand-amber transition-colors mb-1 truncate">{project.title}</h3>
                                            <p className="text-brand-slate line-clamp-2 leading-relaxed text-sm pr-12">{project.promptText}</p>
                                            <div className="flex items-center gap-3 mt-3 text-xs font-bold">
                                                <span className={`${project.responseCount ? 'text-brand-warm bg-brand-cream/50' : 'text-brand-slate bg-slate-50'} px-3 py-1.5 rounded-md transition-colors border border-brand-amber/10`}>
                                                    {project.responseCount || 0} Responses
                                                </span>
                                                {project.settings?.moderation && (project.pendingCount || 0) > 0 && (
                                                    <span className="text-white bg-brand-amber px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm">
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                                        </span>
                                                        {project.pendingCount} Pending Review
                                                    </span>
                                                )}
                                                {project.lastResponseAt && (
                                                    <span className="text-brand-slate font-medium ml-auto">
                                                        Active {Math.floor((Date.now() - project.lastResponseAt) / 86400000) === 0 ? "today" : `${Math.floor((Date.now() - project.lastResponseAt) / 86400000)}d ago`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <Link
                                            href={`/studio/${studio.processPlusCode}/projects/${project.id}`}
                                            className="px-6 py-3 bg-brand-amber/10 text-brand-amber font-bold rounded-lg hover:bg-brand-amber/20 transition-colors hidden sm:block"
                                        >
                                            View
                                        </Link>

                                        {isOwner && (
                                            <button
                                                onClick={() => handleDeleteProject(project.id)}
                                                className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                title="Delete Project"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {projects.length === 0 && (
                        <div className="text-center py-24 bg-white rounded-3xl border border-brand-amber/20">
                            <div className="mx-auto size-20 bg-brand-cream rounded-full flex items-center justify-center text-brand-amber mb-6">
                                <Calendar size={40} />
                            </div>
                            <h3 className="text-xl font-display text-brand-warm mb-2">No projects yet</h3>
                            <p className="text-brand-slate max-w-sm mx-auto font-medium">Create your first project to get the conversation started.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Studio Settings Modal */}
            {studio && isSettingsOpen && (
                <StudioSettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    studio={studio}
                    onSave={async (id, updates) => {
                        await updateStudio(id, updates);
                        // Refresh studio details
                        const updated = await getStudioByProcessPlusCode(updates.processPlusCode || studio.processPlusCode);
                        if (updated) {
                            // If processPlus code changed, we need to redirect
                            if (updates.processPlusCode && updates.processPlusCode !== params.studioCode) {
                                router.push(`/studio/${updates.processPlusCode}`);
                            } else {
                                setStudio(updated);
                            }
                        }
                    }}
                />
            )}
        </div>
    );
}
