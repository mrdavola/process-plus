"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Grid, Topic } from "@/lib/types";
import { getGridByFlipCode, deleteGrid, deleteTopic, updateGrid } from "@/lib/firestore";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Plus, ArrowLeft, Trash2, Calendar, Share, MoreVertical, Search, ArrowDownUp } from "lucide-react";
import Link from "next/link";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/layout/Navbar";
import GridSettingsModal from "@/components/grid/GridSettingsModal";
import { Settings } from "lucide-react";

export default function GridPage() {
    const params = useParams<{ flipCode: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const [grid, setGrid] = useState<Grid | null>(null);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingTopic, setIsCreatingTopic] = useState(false);
    const [copiedShare, setCopiedShare] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleCopyShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
    };
    const [newTopicTitle, setNewTopicTitle] = useState("");
    const [newTopicPrompt, setNewTopicPrompt] = useState("");

    type SortOption = "newest_activity" | "newest_created" | "most_responses" | "needs_review";
    const [sortOption, setSortOption] = useState<SortOption>("newest_activity");
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch Grid
    useEffect(() => {
        if (!params.flipCode) return;
        getGridByFlipCode(params.flipCode)
            .then(g => {
                setGrid(g);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch grid:", err);
                setIsLoading(false);
            });
    }, [params.flipCode]);

    // Real-time Topics Listener
    useEffect(() => {
        if (!grid) return;

        const q = query(
            collection(db, "topics"),
            where("gridId", "==", grid.id)
            // orderBy("createdAt", "desc") // requires index, can skip for now or add
        );

        const unsub = onSnapshot(q, (snap) => {
            const fetchedTopics = snap.docs.map(d => ({ id: d.id, ...d.data() } as Topic));
            // Manual sort as backup
            fetchedTopics.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setTopics(fetchedTopics);
        }, (error) => {
            console.error("Error fetching topics:", error);
        });

        return unsub;
    }, [grid]);

    const isOwner = user && grid ? user.uid === grid.ownerId : false;

    const handleCreateTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!grid || !isOwner || !newTopicTitle.trim()) return;

        setIsCreatingTopic(true);
        try {
            await addDoc(collection(db, "topics"), {
                gridId: grid.id,
                title: newTopicTitle.trim(),
                promptText: newTopicPrompt.trim() || "Share your thoughts!",
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
                    feedbackType: "none",
                    privateFeedback: false
                },
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            setNewTopicTitle("");
            setNewTopicPrompt("");
        } catch (error) {
            console.error("Failed to create topic:", error);
        } finally {
            setIsCreatingTopic(false);
        }
    };

    const handleDeleteTopic = async (topicId: string) => {
        if (!confirm("Are you sure you want to delete this topic?")) return;
        try {
            await deleteTopic(topicId);
        } catch (error) {
            console.error("Failed to delete topic:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-sky-500" size={32} />
            </div>
        );
    }

    if (!grid) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-xl font-bold text-slate-900">Grid not found!</p>
                <Link href="/dashboard" className="text-sky-500 hover:underline">Return to Dashboard</Link>
            </div>
        );
    }

    const filteredAndSortedTopics = topics
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
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            {/* Banner/Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm relative z-10">
                <div className="max-w-5xl mx-auto px-4 py-8">
                    <nav className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-6">
                        <Link href="/dashboard" className="hover:text-sky-500 transition-colors">Dashboard</Link>
                        <span>/</span>
                        <span className="text-slate-800">{grid.title}</span>
                    </nav>

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div>
                            <div className="inline-block px-3 py-1 bg-sky-100 text-sky-600 text-sm font-bold rounded-full mb-3 shadow-inner">
                                Flip Code: <span className="font-mono">{grid.flipCode}</span>
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight flex items-center gap-3">
                                {grid.icon && <span>{grid.icon}</span>}
                                {grid.title}
                            </h1>
                            <p className="text-slate-500 font-medium">Manage your topics and student responses.</p>
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
                                        className="flex items-center gap-2 px-5 py-3 border border-slate-200 text-slate-500 font-bold rounded-full hover:bg-slate-50 transition-all shadow-sm hover:text-sky-600"
                                    >
                                        <Settings size={18} />
                                        Settings
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (confirm("Delete this entire GRID? This action accepts no gravity and cannot be undone.")) {
                                                await deleteGrid(grid.id);
                                                router.push("/dashboard");
                                            }
                                        }}
                                        className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-600 font-bold rounded-full hover:bg-red-100 transition-all shadow-sm hover:shadow-md"
                                    >
                                        <Trash2 size={18} />
                                        Delete Grid
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-4 py-12">
                {/* Create Topic Form */}
                {isOwner && (
                    <div className="mb-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-full -mr-8 -mt-8 opacity-50" />

                        <div className="flex items-center gap-4 mb-8 relative">
                            <div className="size-12 rounded-2xl bg-sky-500 flex items-center justify-center text-white shadow-lg rotate-3 group-hover:rotate-6 transition-transform">
                                <Plus size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">Add a New Topic</h2>
                                <p className="text-slate-500">Spark a discussion with your students.</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateTopic} className="space-y-4 relative">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Topic Title</label>
                                <input
                                    type="text"
                                    value={newTopicTitle}
                                    onChange={(e) => setNewTopicTitle(e.target.value)}
                                    placeholder="e.g., Weekly Reflection, Book Report"
                                    className="w-full px-5 py-4 rounded-xl border-2 border-slate-100 bg-slate-50 text-black focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-bold text-lg outline-none placeholder:font-normal placeholder:text-slate-400"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Prompt</label>
                                <textarea
                                    value={newTopicPrompt}
                                    onChange={(e) => setNewTopicPrompt(e.target.value)}
                                    placeholder="What do you want your students to discuss?"
                                    className="w-full px-5 py-4 rounded-xl border-2 border-slate-100 bg-slate-50 text-black focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all min-h-[120px] outline-none placeholder:text-slate-400 resize-y"
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={isCreatingTopic || !newTopicTitle.trim()}
                                    className="px-8 py-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                                >
                                    {isCreatingTopic ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={20} />
                                            Create Topic
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Topics List Controls */}
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <span className="bg-slate-900 text-white size-6 rounded flex items-center justify-center text-xs">{topics.length}</span>
                            Active Topics
                        </h2>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search topics..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-shadow"
                                />
                            </div>
                            <div className="relative w-full sm:w-auto">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <ArrowDownUp size={16} />
                                </div>
                                <select
                                    value={sortOption}
                                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                                    className="w-full sm:w-auto pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-shadow appearance-none cursor-pointer"
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

                    <div className="grid gap-4">
                        {filteredAndSortedTopics.map((topic) => (
                            <div key={topic.id} className="group bg-white rounded-2xl p-1 border border-slate-200 hover:border-sky-500/30 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center gap-4 p-5">
                                    <Link href={`/grids/${grid.flipCode}/topics/${topic.id}`} className="flex-1 flex items-start gap-5">
                                        <div className="size-16 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex flex-col items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                                            {topic.icon ? (
                                                <span className="text-3xl">{topic.icon}</span>
                                            ) : (
                                                <Calendar size={28} className="text-white/90" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-sky-500 transition-colors mb-1 truncate">{topic.title}</h3>
                                            <p className="text-slate-500 line-clamp-2 leading-relaxed text-sm pr-12">{topic.promptText}</p>
                                            <div className="flex items-center gap-3 mt-3 text-xs font-semibold">
                                                <span className={`${topic.responseCount ? 'text-slate-700 bg-slate-100' : 'text-slate-400 bg-slate-50'} px-2.5 py-1 rounded-md transition-colors`}>
                                                    {topic.responseCount || 0} Responses
                                                </span>
                                                {topic.settings?.moderation && (topic.pendingCount || 0) > 0 && (
                                                    <span className="text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                                        </span>
                                                        {topic.pendingCount} Pending Review
                                                    </span>
                                                )}
                                                {topic.lastResponseAt && (
                                                    <span className="text-slate-400 font-medium ml-auto">
                                                        Active {Math.floor((Date.now() - topic.lastResponseAt) / 86400000) === 0 ? "today" : `${Math.floor((Date.now() - topic.lastResponseAt) / 86400000)}d ago`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <Link
                                            href={`/grids/${grid.flipCode}/topics/${topic.id}`}
                                            className="px-4 py-2 bg-sky-50 text-sky-600 font-bold rounded-lg hover:bg-sky-100 transition-colors hidden sm:block"
                                        >
                                            View
                                        </Link>

                                        {isOwner && (
                                            <button
                                                onClick={() => handleDeleteTopic(topic.id)}
                                                className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                title="Delete Topic"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {topics.length === 0 && (
                        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                            <div className="mx-auto size-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
                                <Calendar size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">No topics yet</h3>
                            <p className="text-slate-500 max-w-sm mx-auto">Create your first topic to get the conversation started.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Grid Settings Modal */}
            {grid && isSettingsOpen && (
                <GridSettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    grid={grid}
                    onSave={async (id, updates) => {
                        await updateGrid(id, updates);
                        // Refresh grid details
                        const updated = await getGridByFlipCode(updates.flipCode || grid.flipCode);
                        if (updated) {
                            // If flip code changed, we need to redirect
                            if (updates.flipCode && updates.flipCode !== params.flipCode) {
                                router.push(`/grids/${updates.flipCode}`);
                            } else {
                                setGrid(updated);
                            }
                        }
                    }}
                />
            )}
        </div>
    );
}
