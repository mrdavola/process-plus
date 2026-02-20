"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Response, UserProfile, Project } from "@/lib/types";
import { getUserProfile, getProject } from "@/lib/firestore";
import { BookOpen, Calendar, Share, Clock, Play } from "lucide-react";
import Navbar from "@/components/layout/Navbar";

export default function StudentTimeline() {
    const params = useParams();
    const studentId = params.id as string;

    const [student, setStudent] = useState<UserProfile | null>(null);
    const [entries, setEntries] = useState<(Response & { projectData?: Project })[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchTimeline() {
            if (!studentId) return;
            try {
                // 1. Get student profile
                const profile = await getUserProfile(studentId);
                setStudent(profile);

                // 2. Get all active responses for this student
                const responsesQuery = query(
                    collection(db, "responses"),
                    where("userId", "==", studentId),
                    where("status", "==", "active"),
                    orderBy("createdAt", "desc")
                );

                const responsesSnap = await getDocs(responsesQuery);
                const rawResponses = responsesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Response));

                // 3. fetch associated project data for context
                const responsesWithContext = await Promise.all(
                    rawResponses.map(async (res) => {
                        const project = await getProject(res.projectId);
                        return { ...res, projectData: project || undefined };
                    })
                );

                setEntries(responsesWithContext);
            } catch (error) {
                console.error("Error fetching timeline:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchTimeline();
    }, [studentId]);

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Timeline link copied to clipboard!");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-brand-cream text-brand-warm flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <BookOpen size={48} className="text-brand-amber/50" />
                    <p className="font-medium text-brand-slate">Loading learning journey...</p>
                </div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="min-h-screen bg-brand-cream text-brand-warm flex items-center justify-center">
                <p className="font-bold text-xl text-brand-slate">Student not found.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-cream text-brand-warm pb-24">
            <Navbar />

            <div className="max-w-4xl mx-auto px-6 mt-12 mb-16">
                <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-12 border-b border-brand-slate/10 pb-8">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-warm mb-3 leading-tight">
                            {student.displayName}&lsquo;s <br />
                            <span className="text-brand-amber">Learning Journey</span>
                        </h1>
                        <p className="text-brand-slate font-medium flex items-center gap-2">
                            <BookOpen size={18} />
                            Documenting process since {new Date(student.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </p>
                    </div>

                    <button
                        onClick={handleShare}
                        className="px-6 py-3 bg-white border border-brand-slate/20 hover:border-brand-amber hover:text-brand-amber rounded-full text-sm font-bold flex items-center gap-2 transition-all shadow-soft"
                    >
                        <Share size={16} />
                        Share Timeline
                    </button>
                </header>

                <div className="relative">
                    {/* Timeline vertical line */}
                    <div className="absolute left-4 md:left-8 top-0 bottom-0 w-px bg-brand-slate/20 z-0"></div>

                    <div className="space-y-12">
                        {entries.length === 0 ? (
                            <p className="text-brand-slate italic pl-12 md:pl-20">No learning entries yet. The journey is just beginning.</p>
                        ) : (
                            entries.map((entry) => (
                                <div key={entry.id} className="relative z-10 pl-16 md:pl-24 group">
                                    {/* Timeline dot */}
                                    <div className="absolute left-[11px] md:left-[27px] top-6 w-3 h-3 bg-brand-amber rounded-full shadow-[0_0_0_6px_var(--brand-cream)] transition-transform group-hover:scale-150"></div>

                                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-soft border border-brand-slate/5 transition-all hover:shadow-float">
                                        <div className="flex items-center gap-3 text-sm font-medium text-brand-sage mb-6">
                                            <Calendar size={16} />
                                            <time dateTime={new Date(entry.createdAt || 0).toISOString()}>
                                                {new Date(entry.createdAt || 0).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                            </time>

                                            {entry.projectData && (
                                                <>
                                                    <span className="text-brand-slate/30">•</span>
                                                    <span className="bg-brand-sage/10 text-brand-sage px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                                        {entry.projectData.title}
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex flex-col md:flex-row gap-8">
                                            {/* Video Thumbnail */}
                                            <div className="w-full md:w-64 shrink-0">
                                                <div className="aspect-[3/4] rounded-2xl overflow-hidden relative group/vid bg-black">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={entry.thumbnailUrl}
                                                        alt="Entry thumbnail"
                                                        className="w-full h-full object-cover opacity-80 group-hover/vid:opacity-100 transition-opacity"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/40 drop-shadow-lg group-hover/vid:scale-110 transition-transform">
                                                            <Play fill="currentColor" size={24} className="ml-1" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Reflections */}
                                            <div className="flex-1 flex flex-col justify-center">
                                                {entry.reflections && entry.reflections.length > 0 ? (
                                                    <div className="space-y-6">
                                                        {entry.reflections.map((reflection, idx) => (
                                                            <div key={idx} className="relative">
                                                                <span className="absolute -left-4 -top-2 text-4xl text-brand-slate/10 font-display">"</span>
                                                                <p className="text-lg md:text-xl text-brand-slate leading-relaxed font-serif italic text-pretty">
                                                                    {reflection}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center border-2 border-dashed border-brand-slate/10 rounded-2xl p-8">
                                                        <p className="text-brand-slate/50 italic font-medium flex items-center gap-2">
                                                            <Clock size={16} /> Fast-tracked entry (No written reflections)
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
