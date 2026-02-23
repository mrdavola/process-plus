"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BookOpen, Share2, Check, Loader2, Bookmark, PenLine, ImagePlus, X } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import JourneyTimeline from "@/components/journey/JourneyTimeline";
import JourneyFilter, { JourneyFilterState } from "@/components/journey/JourneyFilter";
import { EnrichedMoment } from "@/components/journey/JourneyMoment";
import { useAuth } from "@/lib/auth-context";
import {
    getResponsesForUser,
    getOrCreateJourneyToken,
    getProject,
    getStudio,
    getUserProfile,
    toggleJourneyPin,
    toggleHideFromJourney,
    createJourneyEntry,
    getJourneyEntries,
    deleteJourneyEntry,
    addJourneyRecommendation,
    getJourneyRecommendationsForStudent,
    removeJourneyRecommendation,
} from "@/lib/firestore";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Response, Project, Studio, UserProfile, JourneyEntry, JourneyRecommendation } from "@/lib/types";

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
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const viewingUserId = searchParams.get("userId") ?? user?.uid;
    const filterStudioId = searchParams.get("studioId");

    const [student, setStudent] = useState<UserProfile | null>(null);
    const [moments, setMoments] = useState<EnrichedMoment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<JourneyFilterState>({
        studioId: filterStudioId ?? null,
        projectId: null,
    });
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

    // Teacher journal entries
    const [entries, setEntries] = useState<JourneyEntry[]>([]);
    const [showEntryInput, setShowEntryInput] = useState(false);
    const [entryDraft, setEntryDraft] = useState("");
    const [entryImage, setEntryImage] = useState<File | null>(null);
    const [entryImagePreview, setEntryImagePreview] = useState<string | null>(null);
    const [savingEntry, setSavingEntry] = useState(false);

    // Recommendations
    const [recommendations, setRecommendations] = useState<JourneyRecommendation[]>([]);

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
                const [viewedProfile, responses, entriesData, recs] = await Promise.all([
                    getUserProfile(viewingUserId!),
                    getResponsesForUser(viewingUserId!),
                    getJourneyEntries(viewingUserId!),
                    getJourneyRecommendationsForStudent(viewingUserId!),
                ]);
                setStudent(viewedProfile);
                const enriched = await enrich(responses);
                setMoments(enriched);
                setEntries(entriesData);
                setRecommendations(recs);
                if (user) {
                    const myProfile = await getUserProfile(user.uid);
                    setPinnedIds(new Set(myProfile?.pinnedResponseIds ?? []));
                    // Student's hidden moments: always load from the viewed user's profile
                    setHiddenIds(new Set(viewedProfile?.hiddenResponseIds ?? []));
                }
            } catch (e) {
                console.error("Journey load error:", e);
            } finally {
                setIsLoading(false);
            }
        }

        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewingUserId]);

    const isOwnJourney = user?.uid === viewingUserId;

    const visibleMoments = useMemo(() => {
        return moments.filter((m) => {
            if (!isOwnJourney && hiddenIds.has(m.id)) return false;
            if (filter.studioId && m.studio?.id !== filter.studioId) return false;
            if (filter.projectId && m.project?.id !== filter.projectId) return false;
            return true;
        });
    }, [moments, filter, isOwnJourney, hiddenIds]);

    const recsByResponseId = useMemo(() => {
        const map = new Map<string, JourneyRecommendation[]>();
        for (const r of recommendations) {
            if (!map.has(r.responseId)) map.set(r.responseId, []);
            map.get(r.responseId)!.push(r);
        }
        return map;
    }, [recommendations]);

    const handleTogglePin = async (responseId: string, newPinned: boolean) => {
        if (!user) return;
        await toggleJourneyPin(user.uid, responseId, newPinned);
        setPinnedIds(prev => {
            const next = new Set(prev);
            newPinned ? next.add(responseId) : next.delete(responseId);
            return next;
        });
    };

    const handleAddEntry = async () => {
        if (!user || !profile || !entryDraft.trim() || !viewingUserId) return;
        setSavingEntry(true);
        try {
            let imageUrl: string | undefined;
            if (entryImage) {
                const storageRef = ref(storage, `journeyEntries/${viewingUserId}/${Date.now()}_${entryImage.name}`);
                await uploadBytes(storageRef, entryImage);
                imageUrl = await getDownloadURL(storageRef);
            }
            const entry = await createJourneyEntry(
                viewingUserId,
                entryDraft,
                user.uid,
                profile.displayName,
                imageUrl,
            );
            setEntries(prev => [...prev, entry].sort((a, b) => a.createdAt - b.createdAt));
            setEntryDraft("");
            setEntryImage(null);
            setEntryImagePreview(null);
            setShowEntryInput(false);
        } finally {
            setSavingEntry(false);
        }
    };

    const handleToggleHide = async (responseId: string, newHidden: boolean) => {
        if (!viewingUserId) return;
        await toggleHideFromJourney(viewingUserId, responseId, newHidden);
        setHiddenIds(prev => {
            const next = new Set(prev);
            newHidden ? next.add(responseId) : next.delete(responseId);
            return next;
        });
    };

    const handleDeleteEntry = async (id: string) => {
        await deleteJourneyEntry(id);
        setEntries(prev => prev.filter(e => e.id !== id));
    };

    const handleRecommend = async (responseId: string) => {
        if (!user || !profile || isOwnJourney) return;
        const existing = recommendations.find(r => r.responseId === responseId && r.teacherId === user.uid);
        if (existing) {
            await removeJourneyRecommendation(existing.id);
            setRecommendations(prev => prev.filter(r => r.id !== existing.id));
        } else {
            const rec = await addJourneyRecommendation(
                user.uid,
                profile.displayName,
                viewingUserId!,
                responseId,
            );
            setRecommendations(prev => [...prev, rec]);
        }
    };

    const handleShare = async () => {
        if (!user || !viewingUserId) return;
        setSharing(true);
        setShareError(false);
        try {
            const displayName = student?.displayName || user.displayName || "Student";
            const token = await getOrCreateJourneyToken(viewingUserId, displayName);
            const url = `${window.location.origin}/j/${token}`;
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
    };

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
                            {!isOwnJourney && user && (
                                <button
                                    onClick={() => setShowEntryInput(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border border-slate-200 bg-white text-slate-700 hover:border-slate-300 transition-all shadow-sm"
                                >
                                    <PenLine size={16} /> Add Note
                                </button>
                            )}
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

                {/* Teacher note input */}
                {showEntryInput && (
                    <div className="mb-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <textarea
                            autoFocus
                            value={entryDraft}
                            onChange={e => setEntryDraft(e.target.value)}
                            placeholder="Add a note or observation for this student..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-amber text-gray-900 font-medium min-h-[100px] resize-y"
                        />
                        {/* Image preview */}
                        {entryImagePreview && (
                            <div className="relative mt-3 inline-block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={entryImagePreview} alt="Preview" className="max-h-40 rounded-xl border border-slate-200 object-cover" />
                                <button
                                    onClick={() => { setEntryImage(null); setEntryImagePreview(null); }}
                                    className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-0.5 text-slate-500 hover:text-red-500 shadow-sm"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-3 mt-3">
                            <label className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                <ImagePlus size={15} />
                                {entryImage ? "Change photo" : "Add photo"}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setEntryImage(file);
                                            setEntryImagePreview(URL.createObjectURL(file));
                                        }
                                    }}
                                />
                            </label>
                            <div className="flex gap-3 ml-auto">
                                <button onClick={() => { setShowEntryInput(false); setEntryDraft(""); setEntryImage(null); setEntryImagePreview(null); }} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                                <button
                                    onClick={handleAddEntry}
                                    disabled={!entryDraft.trim() || savingEntry}
                                    className="px-5 py-2 text-sm font-bold text-white rounded-xl disabled:opacity-50 flex items-center gap-2"
                                    style={{ backgroundColor: '#c2410c' }}
                                >
                                    {savingEntry && <Loader2 size={14} className="animate-spin" />}
                                    Save Note
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* What is a Journey? — soft explanation */}
                {isOwnJourney && (
                    <div className="mb-8 p-5 rounded-2xl border border-orange-100 bg-white/60 flex gap-4 items-start">
                        <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base" style={{ backgroundColor: '#fff8f2' }}>
                            🗺️
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 text-sm mb-1">What is My Journey?</p>
                            {profile?.role === "teacher" ? (
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    Your Journey collects every video Moment you&apos;ve posted — across all your Studios — into a single personal timeline. Add notes and reflections, and share a private link with others.
                                </p>
                            ) : (
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    Your Journey is your <strong className="text-slate-700">personal learning timeline</strong> — every video Moment you&apos;ve posted across all your Studios, collected in one place in the order you made them. It builds itself automatically as you post. You can share a private link with a parent, teacher, or portfolio reviewer so they can see your growth over time.
                                </p>
                            )}
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
                <JourneyTimeline
                    moments={visibleMoments}
                    entries={isOwnJourney || !filterStudioId ? entries : []}
                    isReadOnly={!isOwnJourney}
                    pinnedIds={pinnedIds}
                    onTogglePin={isOwnJourney ? handleTogglePin : undefined}
                    hiddenIds={isOwnJourney ? hiddenIds : undefined}
                    onToggleHide={isOwnJourney ? handleToggleHide : undefined}
                    onDeleteEntry={isOwnJourney ? handleDeleteEntry : undefined}
                    recsByResponseId={recsByResponseId}
                    onRecommend={!isOwnJourney && user ? handleRecommend : undefined}
                    currentTeacherId={user?.uid}
                />
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
