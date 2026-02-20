"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BookOpen, Video } from "lucide-react";
import Link from "next/link";
import JourneyTimeline from "@/components/journey/JourneyTimeline";
import { EnrichedMoment } from "@/components/journey/JourneyMoment";
import { getJourneyByToken, getResponsesForUser, getProject, getStudio } from "@/lib/firestore";
import { Response, Project, Studio, JourneyShare } from "@/lib/types";

const ORANGE = "#c2410c";

async function enrich(responses: Response[]): Promise<EnrichedMoment[]> {
    const projectCache = new Map<string, Project | null>();
    const studioCache = new Map<string, Studio | null>();

    return Promise.all(
        responses.map(async (r) => {
            let project = projectCache.get(r.projectId);
            if (project === undefined) {
                project = await getProject(r.projectId);
                projectCache.set(r.projectId, project);
            }
            let studio: Studio | null | undefined;
            if (project) {
                studio = studioCache.get(project.studioId);
                if (studio === undefined) {
                    studio = await getStudio(project.studioId);
                    studioCache.set(project.studioId, studio);
                }
            }
            return { ...r, project: project ?? null, studio: studio ?? null };
        })
    );
}

export default function SharedJourneyPage() {
    const { token } = useParams<{ token: string }>();
    const [journey, setJourney] = useState<JourneyShare | null>(null);
    const [moments, setMoments] = useState<EnrichedMoment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!token) return;

        async function load() {
            setIsLoading(true);
            try {
                const share = await getJourneyByToken(token);
                if (!share) {
                    setNotFound(true);
                    return;
                }
                setJourney(share);

                const responses = await getResponsesForUser(share.userId);
                const enriched = await enrich(responses);
                setMoments(enriched);
            } catch (e) {
                console.error("Shared journey load error:", e);
                setNotFound(true);
            } finally {
                setIsLoading(false);
            }
        }

        load();
    }, [token]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-brand-cream flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <BookOpen size={48} style={{ color: ORANGE }} className="opacity-40" />
                    <p className="text-slate-500 font-medium">Loading journey…</p>
                </div>
            </div>
        );
    }

    if (notFound || !journey) {
        return (
            <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center gap-6 text-center px-4">
                <BookOpen size={56} className="text-slate-300" />
                <h1 className="text-2xl font-bold text-slate-700">Journey not found</h1>
                <p className="text-slate-500 max-w-sm">This link may have expired or been removed.</p>
                <Link
                    href="/"
                    className="mt-2 px-6 py-3 rounded-full text-white font-bold text-sm"
                    style={{ backgroundColor: ORANGE }}
                >
                    Go to Process+
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-cream text-brand-warm pb-24">
            {/* Minimal header — no login, no nav clutter */}
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div
                            className="flex items-center justify-center size-8 rounded-lg"
                            style={{ backgroundColor: '#fff8f2' }}
                        >
                            <Video size={18} style={{ color: ORANGE }} />
                        </div>
                        <span className="font-display text-lg text-brand-warm">
                            Process<span style={{ color: ORANGE }}>+</span>
                        </span>
                    </div>

                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Learning Journey · Read Only
                    </span>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
                {/* Title */}
                <div className="mb-10 pb-8 border-b border-slate-200">
                    <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: ORANGE }}>
                        Process+ Journey
                    </p>
                    <h1 className="text-4xl md:text-5xl font-display leading-tight text-brand-warm">
                        {journey.displayName}&apos;s{" "}
                        <span style={{ color: ORANGE }}>Learning Story</span>
                    </h1>
                    <p className="mt-3 text-slate-500 font-medium">
                        {moments.length} Moment{moments.length !== 1 ? "s" : ""} — tracked over time
                    </p>
                </div>

                {/* Timeline — read-only, no expand/collapse */}
                <JourneyTimeline moments={moments} isReadOnly={true} />

                {/* Footer attribution */}
                <div className="mt-16 pt-8 border-t border-slate-200 text-center">
                    <p className="text-xs text-slate-400">
                        Created with{" "}
                        <Link href="/" className="font-bold hover:underline" style={{ color: ORANGE }}>
                            Process+
                        </Link>{" "}
                        — Document the process, not just the product.
                    </p>
                </div>
            </div>
        </div>
    );
}
