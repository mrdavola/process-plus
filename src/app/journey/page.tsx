"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BookOpen, Share2, Check, Loader2, Bookmark } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import JourneyTimeline from "@/components/journey/JourneyTimeline";
import JourneyFilter, { JourneyFilterState } from "@/components/journey/JourneyFilter";
import { EnrichedMoment } from "@/components/journey/JourneyMoment";
import { useAuth } from "@/lib/auth-context";
import { getResponsesForUser, getOrCreateJourneyToken, getProject, getStudio, getUserProfile } from "@/lib/firestore";
import { Response, Project, Studio, UserProfile } from "@/lib/types";

const ORANGE = "#c2410c";

// Enrich responses with project + studio data
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

            let studio: Studio | null | undefined = undefined;
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

function JourneyContent() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Teachers can view any student's journey via ?userId=xxx&studioId=xxx
    const viewingUserId = searchParams.get("userId") ?? user?.uid;
    const filterStudioId = searchParams.get("studioId"); // teacher pre-filter

    const [student, setStudent] = useState<UserProfile | null>(null);
    const [moments, setMoments] = useState<EnrichedMoment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<JourneyFilterState>({
        studioId: filterStudioId ?? null,
        projectId: null,
    });
    const [sharing, setSharing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [shareError, setShareError] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!viewingUserId) return;

        async function load() {
            setIsLoading(true);
            try {
                const [profile, responses] = await Promise.all([
                    getUserProfile(viewingUserId!),
                    getResponsesForUser(viewingUserId!),
                ]);
                setStudent(profile);
                const enriched = await enrich(responses);
                setMoments(enriched);
            } catch (e) {
                console.error("Journey load error:", e);
            } finally {
                setIsLoading(false);
            }
        }

        load();
    }, [viewingUserId]);

    // Apply filter
    const visibleMoments = useMemo(() => {
        return moments.filter((m) => {
            if (filter.studioId && m.studio?.id !== filter.studioId) return false;
            if (filter.projectId && m.project?.id !== filter.projectId) return false;
            return true;
        });
    }, [moments, filter]);

    const isOwnJourney = user?.uid === viewingUserId;

    const handleShare = async () => {
        if (!user || !viewingUserId) return;
        setSharing(true);
        setShareError(false);
        try {
            const displayName = student?.displayName || user.displayName || "Student";
            const token = await getOrCreateJourneyToken(viewingUserId, displayName);
            const url = `${window.location.origin}/j/${token}`;
            // Try clipboard API, fall back to prompt
            try {
                await navigator.clipboard.writeText(url);
            } catch {
                window.prompt("Copy this link:", url);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (e) {
            console.error("Share error:", e);
            setShareError(true);
            setTimeout(() => setShareError(false), 4000);
        } finally {
            setSharing(false);
        }
    };;

    if (authLoading || (isLoading && !moments.length)) {
        return (
            <div className="min-h-screen bg-brand-cream flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <BookOpen size={48} style={{ color: ORANGE }} className="opacity-40" />
                    <p className="text-slate-500 font-medium">Loading journey…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-cream text-brand-warm pb-24">
            <Navbar />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
                {/* Header */}
                <header className="mb-10">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-8 border-b border-slate-200">
                        <div>
                            <div
                                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-3 px-3 py-1.5 rounded-full"
                                style={{ backgroundColor: '#fff8f2', color: ORANGE }}
                            >
                                <Bookmark size={14} />
                                {isOwnJourney ? "My Journey" : `${student?.displayName || "Student"}'s Journey`}
                            </div>
                            <h1 className="text-4xl md:text-5xl font-display leading-tight text-brand-warm">
                                {isOwnJourney
                                    ? <>My <span style={{ color: ORANGE }}>Learning Story</span></>
                                    : <>{student?.displayName}&apos;s <span style={{ color: ORANGE }}>Journey</span></>
                                }
                            </h1>
                            <p className="mt-2 text-slate-500 font-medium">
                                {moments.length} Moment{moments.length !== 1 ? "s" : ""} across all studios
                            </p>
                        </div>

                        <div className="flex gap-3 shrink-0">
                            <button
                                onClick={handleShare}
                                disabled={sharing}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border transition-all shadow-sm ${shareError
                                        ? 'border-red-300 bg-red-50 text-red-600'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                {sharing ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : shareError ? (
                                    <span className="text-red-500">✕</span>
                                ) : copied ? (
                                    <Check size={16} className="text-green-600" />
                                ) : (
                                    <Share2 size={16} />
                                )}
                                {shareError ? 'Failed — try again' : copied ? 'Link copied!' : 'Share Journey'}
                            </button>
                        </div>
                    </div>
                </header>

                {/* What is a Journey? — soft explanation */}
                {isOwnJourney && (
                    <div className="mb-8 p-5 rounded-2xl border border-orange-100 bg-white/60 flex gap-4 items-start">
                        <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base" style={{ backgroundColor: '#fff8f2' }}>
                            🗺️
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 text-sm mb-1">What is My Journey?</p>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Your Journey is your <strong className="text-slate-700">personal learning timeline</strong> — every video Moment you&apos;ve posted across all your Studios, collected in one place in the order you made them. It builds itself automatically as you post. You can share a private link with a parent, teacher, or portfolio reviewer so they can see your growth over time.
                            </p>
                        </div>
                    </div>
                )}

                {/* Filter */}
                <JourneyFilter
                    moments={moments}
                    filter={filter}
                    onChange={setFilter}
                />

                {/* Timeline */}
                <JourneyTimeline moments={visibleMoments} isReadOnly={false} />
            </div>
        </div>
    );
}

export default function JourneyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-brand-cream flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <BookOpen size={48} style={{ color: '#c2410c' }} className="opacity-40" />
                    <p className="text-slate-500 font-medium">Loading journey…</p>
                </div>
            </div>
        }>
            <JourneyContent />
        </Suspense>
    );
}
