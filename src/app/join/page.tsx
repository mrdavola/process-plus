"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Video, ArrowRight } from "lucide-react";
import { getStudioByProcessPlusCode, getProjectsForStudio } from "@/lib/firestore";
import { Studio, Project } from "@/lib/types";

function JoinContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [code, setCode] = useState(searchParams.get("code") ?? "");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [studio, setStudio] = useState<Studio | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        const urlCode = searchParams.get("code");
        if (urlCode) {
            resolveCode(urlCode);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const resolveCode = async (processPlusCode: string) => {
        setBusy(true);
        setError(null);
        try {
            const g = await getStudioByProcessPlusCode(processPlusCode.trim().toLowerCase());
            if (!g) {
                setError("No studio found with that code. Check the code and try again.");
                return;
            }
            const t = await getProjectsForStudio(g.id);
            const activeProjects = t.filter(project => project.status === "active");
            setStudio(g);
            setProjects(activeProjects);
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
        <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="flex items-center gap-3 mb-8 justify-center">
                    <div className="flex items-center justify-center size-10 rounded-xl bg-brand-amber/20 text-brand-amber">
                        <Video size={24} className="fill-current" />
                    </div>
                    <span className="text-2xl font-display tracking-tight text-brand-warm">Process<span className="text-brand-amber">+</span></span>
                </div>

                {!studio ? (
                    <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
                        <h1 className="text-2xl font-display text-brand-warm mb-2 text-center">Join a Studio</h1>
                        <p className="text-brand-slate text-center mb-8">Enter the code your teacher gave you</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                type="text"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                placeholder="Enter join code..."
                                className="w-full px-4 py-4 bg-brand-cream border border-brand-amber/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-amber text-brand-warm text-center text-xl font-bold tracking-widest font-mono"
                                autoFocus
                            />
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            <button
                                type="submit"
                                disabled={busy || !code.trim()}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-brand-amber hover:bg-brand-amber/90 disabled:opacity-50 text-white font-bold rounded-xl text-lg transition-colors"
                            >
                                {busy ? "Finding..." : "Join"}
                                {!busy && <ArrowRight size={20} />}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-brand-slate">
                            Are you a teacher?{" "}
                            <a href="/login" className="text-brand-amber font-bold hover:underline">Sign in here</a>
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                        <div className="bg-brand-amber p-8 text-white">
                            <h2 className="text-2xl font-display mb-1">{studio.title}</h2>
                            <p className="opacity-75 text-sm">Choose a project to respond to</p>
                        </div>
                        <div className="p-4 divide-y divide-slate-100">
                            {projects.length === 0 ? (
                                <p className="py-8 text-center text-slate-400">No active projects in this studio yet.</p>
                            ) : (
                                projects.map(project => (
                                    <button
                                        key={project.id}
                                        onClick={() => router.push(`/studio/${studio.processPlusCode}/projects/${project.id}`)}
                                        className="w-full text-left p-4 hover:bg-slate-50 transition-colors rounded-xl group"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-bold text-brand-warm group-hover:text-brand-amber transition-colors">{project.title}</h3>
                                                <p className="text-brand-slate text-sm mt-1 line-clamp-2">{project.promptText}</p>
                                            </div>
                                            <ArrowRight size={18} className="text-brand-slate/50 group-hover:text-brand-amber transition-colors shrink-0 mt-1" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100">
                            <button
                                onClick={() => { setStudio(null); setProjects([]); setCode(""); }}
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
