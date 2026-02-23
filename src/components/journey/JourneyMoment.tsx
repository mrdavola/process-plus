"use client";

import { useState, useRef } from "react";
import { Calendar, ChevronDown, ChevronUp, Star, Play, Pin } from "lucide-react";
import { Response, Project, Studio } from "@/lib/types";

export interface EnrichedMoment extends Response {
    project?: Project | null;
    studio?: Studio | null;
}

interface JourneyMomentProps {
    moment: EnrichedMoment;
    isReadOnly?: boolean;
    isPinned?: boolean;
    onTogglePin?: (responseId: string, newPinned: boolean) => void;
}

const ORANGE = "#c2410c";

function formatDate(ts: number | undefined): string {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function getPullQuote(reflections: string[] | undefined): string {
    if (!reflections || reflections.length === 0) return "";
    const first = reflections[0].trim();
    // Take first 2 sentences or 200 chars max
    const sentences = first.split(/(?<=[.!?])\s+/);
    const snippet = sentences.slice(0, 2).join(" ");
    return snippet.length > 220 ? snippet.substring(0, 220) + "…" : snippet;
}

export default function JourneyMoment({ moment, isReadOnly = false, isPinned, onTogglePin }: JourneyMomentProps) {
    const [expanded, setExpanded] = useState(false);
    const [playing, setPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const pullQuote = getPullQuote(moment.reflections);

    const handlePlay = () => {
        setExpanded(true);
        setPlaying(true);
        setTimeout(() => videoRef.current?.play(), 100);
    };

    return (
        <div className="relative z-10 pl-14 md:pl-20 group">
            {/* Timeline dot */}
            <div
                className="absolute left-[9px] md:left-[23px] top-7 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-transform group-hover:scale-125 z-20"
                style={{ backgroundColor: isPinned ? '#d97706' : ORANGE }}
            />

            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 transition-all hover:shadow-md">
                {/* Meta bar */}
                <div className="flex flex-wrap items-center gap-2 px-6 pt-5 pb-3">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                        <Calendar size={14} />
                        {formatDate(moment.createdAt as number)}
                    </span>

                    {moment.studio && (
                        <span
                            className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: ORANGE }}
                        >
                            {moment.studio.title}
                        </span>
                    )}

                    {moment.project && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                            {moment.project.title}
                        </span>
                    )}

                    {moment.isFeatured && (
                        <span className="flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Star size={12} fill="currentColor" />
                            Featured by teacher
                        </span>
                    )}

                    {onTogglePin && (
                        <button
                            onClick={() => onTogglePin(moment.id, !isPinned)}
                            className={`ml-auto flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold border transition-all ${
                                isPinned
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-white text-slate-400 border-slate-200 hover:border-amber-200 hover:text-amber-600"
                            }`}
                        >
                            <Pin size={12} fill={isPinned ? "currentColor" : "none"} />
                            {isPinned ? "Pinned" : "Pin"}
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="px-6 pb-5">
                    <div className="flex flex-col sm:flex-row gap-5">
                        {/* Thumbnail / Video */}
                        <div className="shrink-0 w-full sm:w-44">
                            {playing ? (
                                <video
                                    ref={videoRef}
                                    src={moment.videoUrl}
                                    controls
                                    className="w-full aspect-[3/4] rounded-2xl object-cover bg-black"
                                    onEnded={() => setPlaying(false)}
                                />
                            ) : (
                                <button
                                    onClick={handlePlay}
                                    className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 block group/thumb"
                                    title="Watch this Moment"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={moment.thumbnailUrl}
                                        alt="Moment thumbnail"
                                        className="w-full h-full object-cover opacity-80 group-hover/thumb:opacity-95 transition-opacity"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-12 h-12 bg-white/25 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40 group-hover/thumb:scale-110 transition-transform">
                                            <Play size={20} fill="white" className="text-white ml-0.5" />
                                        </div>
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* Reflection pull quote */}
                        <div className="flex-1 flex flex-col justify-center gap-3">
                            {pullQuote ? (
                                <>
                                    <blockquote className="relative">
                                        <span className="absolute -left-2 -top-3 text-5xl text-slate-200 font-serif leading-none select-none">"</span>
                                        <p className="text-lg text-slate-700 leading-relaxed italic font-serif pl-3">
                                            {pullQuote}
                                        </p>
                                    </blockquote>

                                    {/* Show all reflections expanded */}
                                    {!isReadOnly && moment.reflections && moment.reflections.length > 1 && (
                                        <button
                                            onClick={() => setExpanded(e => !e)}
                                            className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors self-start mt-1"
                                        >
                                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            {expanded ? "Less" : `${moment.reflections.length - 1} more reflection${moment.reflections.length - 1 > 1 ? "s" : ""}`}
                                        </button>
                                    )}

                                    {expanded && moment.reflections && moment.reflections.slice(1).map((r, i) => (
                                        <p key={i} className="text-base text-slate-500 leading-relaxed italic border-l-2 border-slate-200 pl-3">
                                            {r}
                                        </p>
                                    ))}
                                </>
                            ) : (
                                <p className="text-slate-400 italic text-sm">
                                    No written reflections for this Moment.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
