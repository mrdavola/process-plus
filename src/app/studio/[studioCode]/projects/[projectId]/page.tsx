"use client";

import { useEffect, useState } from "react";
import { Share2, Copy, Video, Play, Search, Settings, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { getStudioByProcessPlusCode, getProject, createResponse, approveResponse, hideResponse, deleteResponse, deleteProject, updateProject, setResponseFeatured } from "@/lib/firestore";
import type { Studio, Project, Response } from "@/lib/types";
import SparkResponseModal from "@/components/project-settings/SparkResponseModal";
import { onSnapshot, collection, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import ResponseCard from "@/components/project-settings/ResponseCard";
import Link from "next/link";
import TheaterModal from "@/components/project-settings/TheaterModal";
import RecorderModal from "@/components/recorder/RecorderModal";
import ProjectSettingsModal from "@/components/project-settings/ProjectSettingsModal";
import SpotlightCarousel from "@/components/interactions/SpotlightCarousel";
import Navbar from "@/components/layout/Navbar";

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

export default function ProjectPage() {
    const params = useParams<{ studioCode: string; projectId: string }>();
    const { user } = useAuth();

    const [studio, setStudio] = useState<Studio | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [responses, setResponses] = useState<Response[]>([]);
    const [isRecorderOpen, setIsRecorderOpen] = useState(false);
    const [theaterIndex, setTheaterIndex] = useState<number | null>(null);
    const [replyToId, setReplyToId] = useState<string | undefined>();
    const [searchQuery, setSearchQuery] = useState("");
    const [copiedProject, setCopiedProject] = useState(false);
    const [copiedStudio, setCopiedStudio] = useState(false);
    const [copiedShare, setCopiedShare] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [sparkResponseId, setSparkResponseId] = useState<string | null>(null);

    type SortOption = "newest" | "oldest" | "most_responses" | "most_viewed" | "random";
    type FilterOption = "all" | "approved" | "pending";
    const [sortOption, setSortOption] = useState<SortOption>("newest");
    const [filterOption, setFilterOption] = useState<FilterOption>("all");

    const handleCopy = (text: string, setter: (val: boolean) => void) => {
        navigator.clipboard.writeText(text);
        setter(true);
        setTimeout(() => setter(false), 2000);
    };

    const isOwner = user && studio ? user.uid === studio.ownerId : false;

    // Load studio + project
    useEffect(() => {
        if (!params.studioCode || !params.projectId) return;
        getStudioByProcessPlusCode(params.studioCode).then(setStudio).catch(console.error);
        getProject(params.projectId).then(setProject).catch(console.error);
    }, [params.studioCode, params.projectId]);

    // Real-time listener: Owner sees ALL, Student/Guest sees ACTIVE only
    useEffect(() => {
        if (!params.projectId) return;

        let q;
        if (isOwner) {
            q = query(
                collection(db, "responses"),
                where("projectId", "==", params.projectId),
                orderBy("createdAt", "desc")
            );
        } else {
            q = query(
                collection(db, "responses"),
                where("projectId", "==", params.projectId),
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
    }, [params.projectId, isOwner]);

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
        setSparkResponseId(id);
    };

    const handleFeature = async (id: string, isFeatured: boolean) => {
        if (!isOwner) return;
        await setResponseFeatured(id, isFeatured);
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
        if (sortOption === "most_responses") {
            const obsA = a.observationsCount ?? 0;
            const obsB = b.observationsCount ?? 0;
            return obsB - obsA;
        }
        if (sortOption === "most_viewed") {
            return (b.views || 0) - (a.views || 0);
        }
        if (sortOption === "random") {
            // eslint-disable-next-line react-hooks/purity
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

    if (!project) {
        return <div className="min-h-screen flex items-center justify-center text-brand-slate font-display">Loading...</div>;
    }

    if (!isOwner && project.status === "hidden") {
        return (
            <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center text-brand-slate font-display p-4">
                <Video size={64} className="text-brand-amber/30 mb-6" />
                <h2 className="text-3xl font-bold text-brand-warm mb-2">Project Unavailable</h2>
                <p className="text-lg mb-8">This project is currently hidden by the educator.</p>
                {studio && (
                    <Link href={`/studio/${studio.processPlusCode}`} className="bg-brand-amber hover:bg-brand-amber/90 text-white px-6 py-3 rounded-full font-bold transition-all">
                        Return to Studio
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-cream font-display flex flex-col">
            <Navbar />

            <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">

                {/* Project Header */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                    <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
                        {isOwner && studio && (
                            <nav className="flex items-center gap-2 text-sm font-medium text-brand-slate mb-2">
                                <Link href="/dashboard" className="hover:text-brand-amber transition-colors">Dashboard</Link>
                                <span>/</span>
                                <Link href={`/studio/${studio.processPlusCode}`} className="hover:text-brand-amber transition-colors">{studio.title}</Link>
                                <span>/</span>
                                <span className="text-brand-warm">{project.title}</span>
                            </nav>
                        )}

                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-brand-warm leading-[1.1] flex items-center gap-3">
                            {project.icon && <span>{project.icon}</span>}
                            {project.title}
                        </h1>

                        <p className="text-lg md:text-xl text-brand-slate leading-relaxed max-w-2xl whitespace-pre-wrap">
                            {project.promptText}
                        </p>

                        {project.projectTip && (
                            <div className="bg-brand-amber/5 border border-brand-amber/20 rounded-xl p-4 flex items-start gap-3 max-w-2xl">
                                <span className="text-xl">💡</span>
                                <div>
                                    <h4 className="font-bold text-brand-warm text-sm uppercase tracking-wide mb-1">Project Tip</h4>
                                    <p className="text-brand-warm text-sm leading-relaxed">{project.projectTip}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 pt-4">
                            {/* Project Join Code */}
                            {project && project.joinCode && (
                                <button
                                    onClick={() => handleCopy(project.joinCode, setCopiedProject)}
                                    className={`flex items-center gap-2 border rounded-full px-5 py-2.5 shadow-sm transition-all group ${copiedProject
                                        ? "bg-emerald-50 border-emerald-200"
                                        : "bg-white border-slate-200 hover:border-brand-amber/50"
                                        }`}
                                    aria-label="Copy project join code"
                                >
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Project Code</span>
                                    {copiedProject ? (
                                        <span className="text-sm font-bold text-emerald-600 ml-1">Copied!</span>
                                    ) : (
                                        <>
                                            <span className="text-lg font-bold text-brand-amber font-mono ml-1">{project.joinCode}</span>
                                            <Copy size={16} className="text-slate-400 group-hover:text-brand-amber transition-colors ml-1" />
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

                            {/* Studio Link (Secondary) */}
                            {isOwner && studio && (
                                <button
                                    onClick={() => handleCopy(studio.processPlusCode, setCopiedStudio)}
                                    className={`flex items-center gap-2 px-5 py-2.5 bg-transparent border-none hover:bg-slate-100 rounded-full transition-all group`}
                                    aria-label="Copy studio join code"
                                >
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Studio Code</span>
                                    {copiedStudio ? (
                                        <span className="text-sm font-bold text-emerald-600 ml-1">Copied!</span>
                                    ) : (
                                        <span className="text-sm font-bold text-slate-500 font-mono ml-1">{studio.processPlusCode}</span>
                                    )}
                                </button>
                            )}

                            {/* Admin Controls */}
                            {isOwner && (
                                <>
                                    <button
                                        onClick={() => setIsSettingsOpen(true)}
                                        className="p-2.5 text-slate-400 hover:text-brand-amber hover:bg-brand-amber/10 rounded-full transition-colors ml-2"
                                        title="Project Settings"
                                    >
                                        <Settings size={20} />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (confirm("Delete this TOPIC? This cannot be undone.")) {
                                                await deleteProject(params.projectId);
                                                window.location.href = `/studio/${params.studioCode}`;
                                            }
                                        }}
                                        className="p-2.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                        title="Delete Project"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {project.mediaResource && (
                        <div className="lg:col-span-5 relative w-full aspect-video rounded-2xl overflow-hidden shadow-soft bg-slate-900 border border-slate-200/50">
                            {project.mediaResource.type === "youtube" ? (
                                <iframe
                                    src={getYouTubeEmbedUrl(project.mediaResource.url)}
                                    className="w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            ) : (
                                <div className="group cursor-pointer relative w-full h-full">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={project.mediaResource.url}
                                        alt="Project Media"
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
                <div className="sticky top-16 z-30 bg-brand-cream/95 backdrop-blur-sm py-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-brand-amber/10 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-brand-warm leading-none">{responses.length}</span>
                                <span className="text-xs font-medium text-brand-slate uppercase tracking-wide mt-1">Responses</span>
                            </div>
                            <div className="w-px h-8 bg-brand-amber/20" />
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-lg">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                </span>
                                <span className="text-xs font-bold uppercase">Live</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 flex-1 md:justify-end flex-wrap">
                            {isOwner && project.settings.moderation && (
                                <div className="relative">
                                    <select
                                        value={filterOption}
                                        onChange={(e) => setFilterOption(e.target.value as FilterOption)}
                                        className="w-full sm:w-auto pl-4 pr-8 py-2 border border-brand-amber/20 bg-white text-brand-warm font-medium rounded-xl appearance-none text-sm focus:ring-2 focus:ring-brand-amber/50 outline-none"
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
                                    className="w-full sm:w-auto pl-4 pr-8 py-2 border border-brand-amber/20 bg-white text-brand-warm font-medium rounded-xl appearance-none text-sm focus:ring-2 focus:ring-brand-amber/50 outline-none"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                        backgroundPosition: `right 0.5rem center`,
                                        backgroundRepeat: `no-repeat`,
                                        backgroundSize: `1.5em 1.5em`
                                    }}
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="most_observed">Most Observed</option>
                                    <option value="most_viewed">Most Viewed</option>
                                    <option value="random">Randomize</option>
                                </select>
                            </div>

                            <div className="relative w-full sm:w-auto sm:flex-1 md:flex-none md:w-64">
                                <input
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-amber/20 bg-white text-brand-warm placeholder-brand-slate focus:ring-2 focus:ring-brand-amber focus:border-transparent outline-none transition-all text-sm"
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

                <SpotlightCarousel
                    responses={filteredResponses}
                    onSelect={(id) => setTheaterResponseId(id)}
                />

                {/* Masonry Studio */}
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
                                    onFeature={handleFeature}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* FAB */}
                {(!isOwner && project.status !== "active") ? (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                        <div className="bg-slate-800 text-white px-6 py-3 rounded-full shadow-lg font-bold text-sm tracking-wide flex items-center gap-2">
                            <span>⛄️</span> Project is {project.status}
                        </div>
                    </div>
                ) : (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                        <button
                            onClick={() => setIsRecorderOpen(true)}
                            className="flex items-center gap-3 text-white px-8 py-4 rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 active:scale-95 group"
                            style={{ backgroundColor: '#c2410c' }}
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
                projectId={params.projectId}
                projectTitle={project.title}
                promptText={project.promptText}
                projectSettings={project.settings}
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
                project={project}
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

            <ProjectSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                project={project}
                onSave={async (id, updates) => {
                    await updateProject(id, updates);
                    // Refresh project state so new settings (e.g. maxDuration) take effect immediately
                    const refreshed = await getProject(id);
                    if (refreshed) setProject(refreshed);
                }}
            />

            {sparkResponseId && studio && (
                <SparkResponseModal
                    response={responses.find(r => r.id === sparkResponseId)!}
                    project={project}
                    studioId={studio.id}
                    studioCode={params.studioCode}
                    onClose={() => setSparkResponseId(null)}
                />
            )}
        </div>
    );
}
