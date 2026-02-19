"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, ArrowLeft, Copy, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getGrid, getTopicsForGrid } from "@/lib/firestore";
import { Grid, Topic } from "@/lib/types";
import CreateTopicModal from "@/components/topics/CreateTopicModal";
import Link from "next/link";

export default function GridDetailPage() {
    const { gridId } = useParams<{ gridId: string }>();
    const { user, loading } = useAuth();
    const router = useRouter();
    const [grid, setGrid] = useState<Grid | null>(null);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [showCreateTopic, setShowCreateTopic] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading, router]);

    useEffect(() => {
        if (gridId) {
            getGrid(gridId).then(setGrid);
            getTopicsForGrid(gridId).then(setTopics);
        }
    }, [gridId]);

    const handleTopicCreated = (t: Topic) => {
        setTopics(prev => [t, ...prev]);
        setShowCreateTopic(false);
    };

    const copyJoinLink = () => {
        if (grid) {
            navigator.clipboard.writeText(`${window.location.origin}/join?code=${grid.flipCode}`);
        }
    };

    if (loading || !grid) {
        return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-black text-slate-900 text-lg truncate">{grid.title}</h1>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Join Code:</span>
                            <span className="text-xs font-bold text-sky-500 font-mono">{grid.flipCode}</span>
                            <button onClick={copyJoinLink} className="text-slate-400 hover:text-sky-500 transition-colors" aria-label="Copy join link">
                                <Copy size={12} />
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateTopic(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                        <Plus size={16} />
                        New Topic
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {topics.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                        <p className="text-slate-400 mb-4">No topics yet</p>
                        <button
                            onClick={() => setShowCreateTopic(true)}
                            className="px-6 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-colors"
                        >
                            Create First Topic
                        </button>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {topics.map(topic => (
                            <div key={topic.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <h3 className="font-bold text-slate-900 leading-tight">{topic.title}</h3>
                                        <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                                            topic.status === "active"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-slate-100 text-slate-500"
                                        }`}>
                                            {topic.status}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 text-sm line-clamp-2 mb-4">{topic.promptText}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                                        <span>Max: {topic.settings.maxDuration}s</span>
                                        {topic.settings.moderation && (
                                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                                Moderated
                                            </span>
                                        )}
                                    </div>
                                    <Link
                                        href={`/grids/${grid.flipCode}/topics/${topic.id}`}
                                        className="flex items-center gap-1 text-sky-500 text-sm font-bold hover:text-sky-600 transition-colors"
                                    >
                                        <ExternalLink size={14} />
                                        View Topic Page
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {showCreateTopic && (
                <CreateTopicModal
                    gridId={gridId}
                    onClose={() => setShowCreateTopic(false)}
                    onCreated={handleTopicCreated}
                />
            )}
        </div>
    );
}
