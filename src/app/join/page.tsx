"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Video, ArrowRight } from "lucide-react";
import { getGridByFlipCode, getTopicsForGrid } from "@/lib/firestore";
import { Grid, Topic } from "@/lib/types";

function JoinContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [code, setCode] = useState(searchParams.get("code") ?? "");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [grid, setGrid] = useState<Grid | null>(null);
    const [topics, setTopics] = useState<Topic[]>([]);

    useEffect(() => {
        const urlCode = searchParams.get("code");
        if (urlCode) {
            resolveCode(urlCode);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const resolveCode = async (flipCode: string) => {
        setBusy(true);
        setError(null);
        try {
            const g = await getGridByFlipCode(flipCode.trim().toLowerCase());
            if (!g) {
                setError("No grid found with that code. Check the code and try again.");
                return;
            }
            const t = await getTopicsForGrid(g.id);
            const activeTopics = t.filter(topic => topic.status === "active");
            setGrid(g);
            setTopics(activeTopics);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusy(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        resolveCode(code);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="flex items-center gap-3 mb-8 justify-center">
                    <div className="flex items-center justify-center size-10 rounded-xl bg-sky-50 text-sky-500">
                        <Video size={24} className="fill-current" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">Flipgrid <span className="text-sky-500">Rebuild</span></span>
                </div>

                {!grid ? (
                    <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
                        <h1 className="text-2xl font-black text-slate-900 mb-2 text-center">Join a Grid</h1>
                        <p className="text-slate-500 text-center mb-8">Enter the code your teacher gave you</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                type="text"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                placeholder="Enter join code..."
                                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 text-center text-xl font-bold tracking-widest font-mono"
                                autoFocus
                            />
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            <button
                                type="submit"
                                disabled={busy || !code.trim()}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold rounded-xl text-lg transition-colors"
                            >
                                {busy ? "Finding..." : "Join"}
                                {!busy && <ArrowRight size={20} />}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-slate-400">
                            Are you a teacher?{" "}
                            <a href="/login" className="text-sky-500 font-bold hover:underline">Sign in here</a>
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                        <div className="bg-gradient-to-br from-sky-400 to-indigo-500 p-8 text-white">
                            <h2 className="text-2xl font-black mb-1">{grid.title}</h2>
                            <p className="opacity-75 text-sm">Choose a topic to respond to</p>
                        </div>
                        <div className="p-4 divide-y divide-slate-100">
                            {topics.length === 0 ? (
                                <p className="py-8 text-center text-slate-400">No active topics in this grid yet.</p>
                            ) : (
                                topics.map(topic => (
                                    <button
                                        key={topic.id}
                                        onClick={() => router.push(`/grids/${grid.flipCode}/topics/${topic.id}`)}
                                        className="w-full text-left p-4 hover:bg-slate-50 transition-colors rounded-xl group"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-bold text-slate-900 group-hover:text-sky-500 transition-colors">{topic.title}</h3>
                                                <p className="text-slate-500 text-sm mt-1 line-clamp-2">{topic.promptText}</p>
                                            </div>
                                            <ArrowRight size={18} className="text-slate-300 group-hover:text-sky-400 transition-colors shrink-0 mt-1" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100">
                            <button
                                onClick={() => { setGrid(null); setTopics([]); setCode(""); }}
                                className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                Enter a different code
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function JoinPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>}>
            <JoinContent />
        </Suspense>
    );
}
