"use client";

import { useEffect, useState } from "react";
import { Share2, Copy, Video, Play, Search } from "lucide-react";
import { useParams } from "next/navigation";
import { Topic, Response, Grid } from "@/lib/types";
import { getGridByFlipCode, getTopic } from "@/lib/firestore";
import { onSnapshot, collection, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import ResponseCard from "@/components/topic/ResponseCard";
import TheaterModal from "@/components/topic/TheaterModal";
import dynamic from "next/dynamic";

const RecorderModal = dynamic(() => import("@/components/recorder/RecorderModal"), { ssr: false });

export default function TopicPage() {
    const params = useParams<{ flipCode: string; topicId: string }>();
    const { user } = useAuth();

    const [grid, setGrid] = useState<Grid | null>(null);
    const [topic, setTopic] = useState<Topic | null>(null);
    const [responses, setResponses] = useState<Response[]>([]);
    const [isRecorderOpen, setIsRecorderOpen] = useState(false);
    const [theaterIndex, setTheaterIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Load grid + topic
    useEffect(() => {
        if (!params.flipCode || !params.topicId) return;
        getGridByFlipCode(params.flipCode).then(setGrid);
        getTopic(params.topicId).then(setTopic);
    }, [params.flipCode, params.topicId]);

    // Real-time listener for responses
    useEffect(() => {
        if (!params.topicId) return;
        const q = query(
            collection(db, "responses"),
            where("topicId", "==", params.topicId),
            where("status", "==", "active"),
            orderBy("createdAt", "desc")
        );
        const unsub = onSnapshot(q, snap => {
            setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Response)));
        });
        return unsub;
    }, [params.topicId]);

    const filteredResponses = searchQuery
        ? responses.filter(r => r.userDisplayName.toLowerCase().includes(searchQuery.toLowerCase()))
        : responses;

    if (!topic) {
        return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 font-display flex flex-col">
            {/* Nav */}
            <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-sky-100 text-sky-500">
                            <Video size={24} className="fill-current" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900">Flipgrid</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {user ? (
                            <a href="/dashboard" className="text-sm font-bold text-sky-500 hover:text-sky-600 transition-colors">My Dashboard</a>
                        ) : (
                            <a href="/login" className="text-sm font-bold text-sky-500 hover:text-sky-600 transition-colors">Teacher Login</a>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">

                {/* Topic Header */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                    <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
                        {grid && (
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full">{grid.title}</span>
                            </div>
                        )}

                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.1]">
                            {topic.title}
                        </h1>

                        <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl">
                            {topic.promptText}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 pt-2">
                            {grid && (
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Join Code</span>
                                    <span className="text-lg font-bold text-sky-500 font-mono">{grid.flipCode}</span>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(grid.flipCode)}
                                        className="text-slate-400 hover:text-sky-500 transition-colors"
                                        aria-label="Copy join code"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={() => navigator.clipboard.writeText(window.location.href)}
                                className="flex items-center gap-2 text-slate-900 font-bold hover:text-sky-500 transition-colors"
                            >
                                <span className="flex items-center justify-center size-8 rounded-full bg-slate-100">
                                    <Share2 size={16} />
                                </span>
                                Share Topic
                            </button>
                        </div>
                    </div>

                    {topic.mediaResource && (
                        <div className="lg:col-span-5">
                            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-soft group cursor-pointer bg-slate-900">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={topic.mediaResource.url}
                                    alt="Topic Media"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="size-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
                                        <Play size={32} className="fill-white text-white ml-1" />
                                    </div>
                                </div>
                            </div>
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

                        <div className="flex items-center gap-3 flex-1 md:justify-end">
                            <div className="relative flex-1 md:flex-none md:w-64">
                                <input
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all text-sm"
                                    placeholder="Search responses..."
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
                {filteredResponses.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-slate-400 text-lg">No responses yet. Be the first!</p>
                    </div>
                ) : (
                    <div className="columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6 pb-24">
                        {filteredResponses.map((response, idx) => (
                            <div key={response.id} className="break-inside-avoid">
                                <ResponseCard response={response} onClick={() => setTheaterIndex(idx)} />
                            </div>
                        ))}
                    </div>
                )}

                {/* FAB */}
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
            </main>

            <RecorderModal
                isOpen={isRecorderOpen}
                onClose={() => setIsRecorderOpen(false)}
                topicId={params.topicId}
                topicTitle={topic.title}
                promptText={topic.promptText}
                maxDuration={topic.settings.maxDuration}
                userId={user?.uid ?? "guest"}
            />

            <TheaterModal
                responses={filteredResponses}
                currentIndex={theaterIndex}
                onClose={() => setTheaterIndex(null)}
                onNavigate={setTheaterIndex}
            />
        </div>
    );
}
