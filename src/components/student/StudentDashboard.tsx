"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, BookOpen, Video, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { Studio } from "@/lib/types";
import { getResponsesForUser, getStudio, getProject } from "@/lib/firestore";
import { EnrichedMoment } from "@/components/journey/JourneyMoment";

type Tab = "studios" | "responses" | "journey";

interface StudentDashboardProps {
    userId: string;
}

export default function StudentDashboard({ userId }: StudentDashboardProps) {
    const [tab, setTab] = useState<Tab>("studios");
    const [responses, setResponses] = useState<EnrichedMoment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            try {
                const rawResponses = await getResponsesForUser(userId);
                const projectCache = new Map<string, any>();
                const studioCache = new Map<string, any>();
                const enriched = await Promise.all(rawResponses.map(async (r) => {
                    let project = projectCache.get(r.projectId);
                    if (!project) {
                        project = await getProject(r.projectId);
                        projectCache.set(r.projectId, project);
                    }
                    let studio = project ? studioCache.get(project.studioId) : null;
                    if (project && !studio) {
                        studio = await getStudio(project.studioId);
                        studioCache.set(project.studioId, studio);
                    }
                    return { ...r, project: project ?? null, studio: studio ?? null };
                }));
                setResponses(enriched.reverse());
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, [userId]);

    const studios = useMemo(() => {
        const seen = new Map<string, { studio: Studio; count: number }>();
        for (const r of responses) {
            if (r.studio && !seen.has(r.studio.id)) {
                seen.set(r.studio.id, { studio: r.studio, count: 0 });
            }
            if (r.studio) {
                seen.get(r.studio.id)!.count++;
            }
        }
        return Array.from(seen.values());
    }, [responses]);

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: "studios", label: "My Studios", icon: <LayoutGrid size={18} /> },
        { id: "responses", label: "My Responses", icon: <Video size={18} /> },
        { id: "journey", label: "My Journey", icon: <BookOpen size={18} /> },
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            {/* Tab bar */}
            <div className="flex gap-2 mb-8 border-b border-brand-amber/10 pb-0">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-t-xl transition-colors -mb-px border-b-2 ${
                            tab === t.id
                                ? "border-brand-amber text-brand-warm"
                                : "border-transparent text-brand-slate hover:text-brand-warm"
                        }`}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-brand-amber" size={32} />
                </div>
            ) : (
                <>
                    {tab === "studios" && (
                        <div>
                            {studios.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-3xl border border-brand-amber/10">
                                    <LayoutGrid size={40} className="mx-auto text-slate-300 mb-4" />
                                    <p className="text-brand-warm font-semibold">You haven&apos;t joined any studios yet.</p>
                                    <p className="text-brand-slate text-sm mt-2">Ask your teacher for a studio or project code, then use the Join button.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {studios.map(({ studio, count }) => (
                                        <Link
                                            key={studio.id}
                                            href={`/studio/${studio.processPlusCode}`}
                                            className="group bg-white rounded-2xl p-6 border border-brand-amber/10 hover:border-brand-amber hover:shadow-md transition-all"
                                        >
                                            <div className="size-12 rounded-xl bg-brand-cream text-brand-amber flex items-center justify-center font-bold text-xl mb-4 group-hover:scale-110 transition-transform">
                                                {studio.icon ?? studio.title.charAt(0).toUpperCase()}
                                            </div>
                                            <h3 className="font-bold text-lg text-brand-warm truncate">{studio.title}</h3>
                                            <p className="text-brand-slate text-sm mt-1">{count} response{count !== 1 ? "s" : ""} posted</p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === "responses" && (
                        <div>
                            {responses.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-3xl border border-brand-amber/10">
                                    <Video size={40} className="mx-auto text-slate-300 mb-4" />
                                    <p className="text-brand-warm font-semibold">No responses yet.</p>
                                    <p className="text-brand-slate text-sm mt-2">Join a project and record your first video.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {responses.map((r) => (
                                        <Link
                                            key={r.id}
                                            href={`/studio/${r.studio?.processPlusCode}/projects/${r.projectId}`}
                                            className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={r.thumbnailUrl} alt={r.project?.title ?? "Response"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                                <p className="font-bold text-sm truncate">{r.project?.title ?? "Unknown Project"}</p>
                                                <p className="text-xs text-white/60 truncate">{r.studio?.title ?? ""}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === "journey" && (
                        <div className="text-center py-16 bg-white rounded-3xl border border-brand-amber/10">
                            <BookOpen size={48} style={{ color: '#c2410c' }} className="mx-auto mb-4 opacity-70" />
                            <h3 className="text-xl font-bold text-brand-warm mb-2">Your Learning Journey</h3>
                            <p className="text-brand-slate max-w-md mx-auto mb-6">
                                Your Journey collects every Moment you&apos;ve posted — across all studios — into a single personal timeline. Pin highlights, add journal entries, and share with your teacher.
                            </p>
                            <Link
                                href="/journey"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold shadow-md transition-all hover:opacity-90"
                                style={{ backgroundColor: '#c2410c' }}
                            >
                                <BookOpen size={18} /> Open My Journey
                            </Link>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
