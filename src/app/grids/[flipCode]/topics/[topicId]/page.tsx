"use client";

import { useEffect, useState } from "react";
import { Share2, Copy, Video, Play, Search, Plus, Settings, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { getGridByFlipCode, getTopic, createResponse, approveResponse, hideResponse, deleteResponse, deleteTopic, deleteGrid, updateTopic } from "@/lib/firestore";
import type { Grid, Topic, Response } from "@/lib/types";
import { onSnapshot, collection, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import ResponseCard from "@/components/topic/ResponseCard";
import Link from "next/link";
import TheaterModal from "@/components/topic/TheaterModal";
import RecorderModal from "@/components/recorder/RecorderModal";
import Navbar from "@/components/layout/Navbar";
import TopicSettingsModal from "@/components/topic/TopicSettingsModal";

function getYouTubeEmbedUrl(url: string) {
    let videoId = "";
    if (url.includes("youtube.com/watch")) {
        try {
            videoId = new URL(url).searchParams.get("v") || "";
        } catch (e) { }
    } else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
    } else if (url.includes("youtube.com/embed/")) {
        videoId = url.split("youtube.com/embed/")[1]?.split("?")[0] || "";
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

export default function TopicPage() {
    const params = useParams<{ flipCode: string; topicId: string }>();
    const { user } = useAuth();

    const [grid, setGrid] = useState<Grid | null>(null);
    const [topic, setTopic] = useState<Topic | null>(null);
    const [responses, setResponses] = useState<Response[]>([]);
    const [isRecorderOpen, setIsRecorderOpen] = useState(false);
    const [theaterIndex, setTheaterIndex] = useState<number | null>(null);
    const [replyToId, setReplyToId] = useState<string | undefined>();
    const [searchQuery, setSearchQuery] = useState("");
    const [copiedTopic, setCopiedTopic] = useState(false);
    const [copiedGrid, setCopiedGrid] = useState(false);
    const [copiedShare, setCopiedShare] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    type SortOption = "newest" | "oldest" | "most_liked" | "most_viewed" | "random";
    type FilterOption = "all" | "approved" | "pending";
    const [sortOption, setSortOption] = useState<SortOption>("newest");
    const [filterOption, setFilterOption] = useState<FilterOption>("all");

    const handleCopy = (text: string, setter: (val: boolean) => void) => {
        navigator.clipboard.writeText(text);
        setter(true);
        setTimeout(() => setter(false), 2000);
    };

    const isOwner = user && grid ? user.uid === grid.ownerId : false;

    // Load grid + topic
    useEffect(() => {
        if (!params.flipCode || !params.topicId) return;
        getGridByFlipCode(params.flipCode).then(setGrid).catch(console.error);
        getTopic(params.topicId).then(setTopic).catch(console.error);
    }, [params.flipCode, params.topicId]);

    // Real-time listener: Owner sees ALL, Student/Guest sees ACTIVE only
    useEffect(() => {
        if (!params.topicId) return;

        let q;
        if (isOwner) {
            q = query(
                collection(db, "responses"),
                where("topicId", "==", params.topicId),
                orderBy("createdAt", "desc")
            );
        } else {
            q = query(
                collection(db, "responses"),
                where("topicId", "==", params.topicId),
                where("status", "==", "active"),
                orderBy("createdAt", "desc")
            );
        }

        const unsub = onSnapshot(
            q,
            snap => {
                setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Response)));
            },
            err => {
                console.error("Firestore listener error:", err);
            }
        );
        return unsub;
    }, [params.topicId, isOwner]);

    // Admin Handlers
    const handleApprove = async (id: string) => {
        if (!isOwner) return;
        await approveResponse(id);
    };

    const handleHide = async (id: string) => {
        if (!isOwner) return;
        await hideResponse(id);
    };

    const handleDelete = async (id: string) => {
        if (!isOwner) return;
        if (confirm("Are you sure you want to delete this response?")) {
            await deleteResponse(id);
        }
    };

    const handleSpark = (id: string) => {
        alert("✨ Spark Response: This feature will turn this response into a new Topic! (Coming soon)");
    };

    const handleMixTape = (id: string) => {
        alert("📼 Add to MixTape: This feature will add this response to a combined playlist! (Coming soon)");
    };

    const filteredResponses = responses.filter(r => {
        if (searchQuery && !r.userDisplayName.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        if (isOwner) {
            if (filterOption === "approved" && r.status !== "active") return false;
            if (filterOption === "pending" && r.status !== "hidden") return false;
        }
        return true;
    });

    const sortedResponses = [...filteredResponses].sort((a, b) => {
        if (sortOption === "newest") {
            return (b.createdAt || 0) - (a.createdAt || 0);
        }
        if (sortOption === "oldest") {
            return (a.createdAt || 0) - (b.createdAt || 0);
        }
        if (sortOption === "most_liked") {
            const likesA = a.reactionsCount ?? a.reactions?.length ?? 0;
            const likesB = b.reactionsCount ?? b.reactions?.length ?? 0;
            return likesB - likesA;
        }
        if (sortOption === "most_viewed") {
            return (b.views || 0) - (a.views || 0);
        }
        if (sortOption === "random") {
            return Math.random() - 0.5;
        }
        return 0;
    });

    const topLevelResponses = sortedResponses.filter(r => !r.replyToId);

    // We keep track of which specific response is open by ID, rather than index.
    const [theaterResponseId, setTheaterResponseId] = useState<string | null>(null);

    // Provide legacy currentIndex behavior by finding the index in the active list.
    // If theaterResponseId is set, find its index in filteredResponses to pass to TheaterModal
    const currentTheaterIndex = theaterResponseId
        ? filteredResponses.findIndex(r => r.id === theaterResponseId)
        : null;

    useEffect(() => {
        if (currentTheaterIndex === -1) {
            setTheaterResponseId(null);
        }
    }, [currentTheaterIndex]);

    if (!topic) {
        return <div className="min-h-screen flex items-center justify-center text-slate-500 font-display">Loading...</div>;
    }

    if (!isOwner && topic.status === "hidden") {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-display p-4">
                <Video size={64} className="text-slate-300 mb-6" />
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Topic Unavailable</h2>
                <p className="text-lg mb-8">This topic is currently hidden by the educator.</p>
                {grid && (
                    <Link href={`/grids/${grid.flipCode}`} className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-full font-bold transition-all">
                        Return to Grid
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-display flex flex-col">
            <Navbar />

            <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">

                {/* Topic Header */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                    <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
                        {isOwner && grid && (
                            <nav className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
                                <Link href="/dashboard" className="hover:text-sky-500 transition-colors">Dashboard</Link>
                                <span>/</span>
                                <Link href={`/grids/${grid.flipCode}`} className="hover:text-sky-500 transition-colors">{grid.title}</Link>
                                <span>/</span>
                                <span className="text-slate-800">{topic.title}</span>
                            </nav>
                        )}

                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.1] flex items-center gap-3">
                            {topic.icon && <span>{topic.icon}</span>}
                            {topic.title}
                        </h1>

                        <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl whitespace-pre-wrap">
                            {topic.promptText}
                        </p>

                        {topic.topicTip && (
                            <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 flex items-start gap-3 max-w-2xl">
                                <span className="text-xl">💡</span>
                                <div>
                                    <h4 className="font-bold text-sky-900 text-sm uppercase tracking-wide mb-1">Topic Tip</h4>
                                    <p className="text-sky-800 text-sm leading-relaxed">{topic.topicTip}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 pt-4">
                            {/* Topic Join Code */}
                            {topic && topic.joinCode && (
                                <button
                                    onClick={() => handleCopy(topic.joinCode, setCopiedTopic)}
                                    className={`flex items-center gap-2 border rounded-full px-5 py-2.5 shadow-sm transition-all group ${copiedTopic
                                        ? "bg-emerald-50 border-emerald-200"
                                        : "bg-white border-slate-200 hover:border-sky-300"
                                        }`}
                                    aria-label="Copy topic join code"
                                >
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Topic Code</span>
                                    {copiedTopic ? (
                                        <span className="text-sm font-bold text-emerald-600 ml-1">Copied!</span>
                                    ) : (
                                        <>
                                            <span className="text-lg font-bold text-sky-500 font-mono ml-1">{topic.joinCode}</span>
                                            <Copy size={16} className="text-slate-400 group-hover:text-sky-500 transition-colors ml-1" />
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Share Link */}
                            <button
                                onClick={() => handleCopy(window.location.href, setCopiedShare)}
                                className={`flex items-center gap-2 px-5 py-2.5 border rounded-full shadow-sm transition-all font-bold ${copiedShare
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                                    }`}
                            >
                                <Share2 size={18} />
                                <span>{copiedShare ? "Copied!" : "Share Link"}</span>
                            </button>

                            {/* Grid Link (Secondary) */}
                            {isOwner && grid && (
                                <button
                                    onClick={() => handleCopy(grid.flipCode, setCopiedGrid)}
                                    className={`flex items-center gap-2 px-5 py-2.5 bg-transparent border-none hover:bg-slate-100 rounded-full transition-all group`}
                                    aria-label="Copy grid join code"
                                >
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Grid Code</span>
                                    {copiedGrid ? (
                                        <span className="text-sm font-bold text-emerald-600 ml-1">Copied!</span>
                                    ) : (
                                        <span className="text-sm font-bold text-slate-500 font-mono ml-1">{grid.flipCode}</span>
                                    )}
                                </button>
                            )}

                            {/* Admin Controls */}
                            {isOwner && (
                                <>
                                    <button
                                        onClick={() => setIsSettingsOpen(true)}
                                        className="p-2.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-full transition-colors ml-2"
                                        title="Topic Settings"
                                    >
                                        <Settings size={20} />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (confirm("Delete this TOPIC? This cannot be undone.")) {
                                                await deleteTopic(params.topicId);
                                                window.location.href = `/grids/${params.flipCode}`;
                                            }
                                        }}
                                        className="p-2.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                        title="Delete Topic"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {topic.mediaResource && (
                        <div className="lg:col-span-5 relative w-full aspect-video rounded-2xl overflow-hidden shadow-soft bg-slate-900 border border-slate-200/50">
                            {topic.mediaResource.type === "youtube" ? (
                                <iframe
                                    src={getYouTubeEmbedUrl(topic.mediaResource.url)}
                                    className="w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            ) : (
                                <div className="group cursor-pointer relative w-full h-full">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={topic.mediaResource.url}
                                        alt="Topic Media"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="size-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg">
                                            <Play size={32} className="fill-white text-white ml-1" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Stats Bar */}
                <div className="sticky top-16 z-30 bg-slate-50/95 backdrop-blur-sm py-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-slate-200/50 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-slate-900 leading-none">{responses.length}</span>
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Responses</span>
                            </div>
                            <div className="w-px h-8 bg-slate-300" />
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-lg">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                </span>
                                <span className="text-xs font-bold uppercase">Live</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 flex-1 md:justify-end flex-wrap">
                            {isOwner && topic.settings.moderation && (
                                <div className="relative">
                                    <select
                                        value={filterOption}
                                        onChange={(e) => setFilterOption(e.target.value as FilterOption)}
                                        className="w-full sm:w-auto pl-4 pr-8 py-2 border border-slate-200 bg-white text-slate-700 font-medium rounded-xl appearance-none text-sm focus:ring-2 focus:ring-sky-500/50 outline-none"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                            backgroundPosition: `right 0.5rem center`,
                                            backgroundRepeat: `no-repeat`,
                                            backgroundSize: `1.5em 1.5em`
                                        }}
                                    >
                                        <option value="all">All Responses</option>
                                        <option value="approved">Approved Only</option>
                                        <option value="pending">Pending Only</option>
                                    </select>
                                </div>
                            )}

                            <div className="relative">
                                <select
                                    value={sortOption}
                                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                                    className="w-full sm:w-auto pl-4 pr-8 py-2 border border-slate-200 bg-white text-slate-700 font-medium rounded-xl appearance-none text-sm focus:ring-2 focus:ring-sky-500/50 outline-none"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                        backgroundPosition: `right 0.5rem center`,
                                        backgroundRepeat: `no-repeat`,
                                        backgroundSize: `1.5em 1.5em`
                                    }}
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="most_liked">Most Liked</option>
                                    <option value="most_viewed">Most Viewed</option>
                                    <option value="random">Randomize</option>
                                </select>
                            </div>

                            <div className="relative w-full sm:w-auto sm:flex-1 md:flex-none md:w-64">
                                <input
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all text-sm"
                                    placeholder="Search by name..."
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Masonry Grid */}
                {topLevelResponses.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-slate-400 text-lg">No responses yet. Be the first!</p>
                    </div>
                ) : (
                    <div className="columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6 pb-24">
                        {topLevelResponses.map((response, idx) => (
                            <div key={response.id} className="break-inside-avoid">
                                <ResponseCard
                                    response={response}
                                    onClick={() => setTheaterResponseId(response.id)}
                                    isOwner={isOwner}
                                    onApprove={handleApprove}
                                    onHide={handleHide}
                                    onDelete={handleDelete}
                                    onSpark={handleSpark}
                                    onMixTape={handleMixTape}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* FAB */}
                {(!isOwner && topic.status !== "active") ? (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                        <div className="bg-slate-800 text-white px-6 py-3 rounded-full shadow-lg font-bold text-sm tracking-wide flex items-center gap-2">
                            <span>⛄️</span> Topic is {topic.status}
                        </div>
                    </div>
                ) : (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                        <button
                            onClick={() => setIsRecorderOpen(true)}
                            className="flex items-center gap-3 bg-sky-500 hover:bg-sky-600 text-white px-8 py-4 rounded-full shadow-xl shadow-sky-500/40 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 active:scale-95 group"
                        >
                            <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                                <Video size={24} className="fill-current" />
                            </div>
                            <span className="text-lg font-bold tracking-wide">Record a Response</span>
                        </button>
                    </div>
                )}
            </main>

            <RecorderModal
                isOpen={isRecorderOpen}
                onClose={() => {
                    setIsRecorderOpen(false);
                    setReplyToId(undefined); // Reset
                }}
                topicId={params.topicId}
                topicTitle={topic.title}
                promptText={topic.promptText}
                topicSettings={topic.settings}
                userId={user?.uid ?? "guest"}
                replyToId={replyToId}
            />

            <TheaterModal
                responses={filteredResponses}
                allResponses={filteredResponses}
                currentIndex={currentTheaterIndex}
                onClose={() => setTheaterResponseId(null)}
                onNavigate={(idx) => {
                    const newId = filteredResponses[idx]?.id;
                    if (newId) setTheaterResponseId(newId);
                }}
                topic={topic}
                currentUserId={user?.uid}
                isOwner={isOwner}
                onReply={(responseId: string) => {
                    setReplyToId(responseId);
                    setTheaterResponseId(null); // Optional: close theater when replying
                    setIsRecorderOpen(true);
                }}
                onViewReply={(replyId: string) => {
                    setTheaterResponseId(replyId);
                }}
            />

            <TopicSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                topic={topic}
                onSave={updateTopic}
            />
        </div>
    );
}
