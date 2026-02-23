"use client";

import { useMemo } from "react";
import { BookOpen, Pin } from "lucide-react";
import JourneyMoment, { EnrichedMoment } from "./JourneyMoment";

interface JourneyTimelineProps {
    moments: EnrichedMoment[];
    isReadOnly?: boolean;
    pinnedIds?: Set<string>;
    onTogglePin?: (responseId: string, newPinned: boolean) => void;
}

function formatMonthYear(ts: number | undefined): string {
    if (!ts) return "Unknown";
    return new Date(ts).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function JourneyTimeline({ moments, isReadOnly = false, pinnedIds, onTogglePin }: JourneyTimelineProps) {
    // Group moments by month+year
    const grouped = useMemo(() => {
        const groups: { label: string; items: EnrichedMoment[] }[] = [];
        let currentLabel = "";
        for (const m of moments) {
            const label = formatMonthYear(m.createdAt as number);
            if (label !== currentLabel) {
                currentLabel = label;
                groups.push({ label, items: [] });
            }
            groups[groups.length - 1].items.push(m);
        }
        return groups;
    }, [moments]);

    if (moments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                <BookOpen size={48} className="text-slate-300" />
                <p className="text-xl font-semibold text-slate-400">The journey is just beginning.</p>
                <p className="text-slate-400 max-w-sm">
                    Moments posted to any Studio will appear here automatically.
                </p>
            </div>
        );
    }

    const pinned = pinnedIds ? moments.filter(m => pinnedIds.has(m.id)) : [];

    return (
        <div className="relative">
            {/* Pinned Highlights section */}
            {pinned.length > 0 && (
                <div className="mb-10 p-6 bg-amber-50 rounded-3xl border border-amber-200">
                    <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-4 flex items-center gap-2">
                        <Pin size={14} /> Pinned Highlights
                    </p>
                    <div className="space-y-4">
                        {pinned.map(m => (
                            <JourneyMoment
                                key={m.id}
                                moment={m}
                                isReadOnly={isReadOnly}
                                isPinned={true}
                                onTogglePin={onTogglePin}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Vertical connecting line */}
            <div className="absolute left-[17px] md:left-[31px] top-0 bottom-0 w-0.5 bg-orange-100 z-0" />

            <div className="space-y-4">
                {grouped.map((group) => (
                    <div key={group.label}>
                        {/* Month label */}
                        <div className="relative z-10 flex items-center gap-4 pl-14 md:pl-20 mb-6 mt-8 first:mt-0">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400 bg-brand-cream px-3 py-1 rounded-full border border-slate-200">
                                {group.label}
                            </span>
                        </div>

                        {/* Moments in this group */}
                        <div className="space-y-6">
                            {group.items.map((moment) => (
                                <JourneyMoment
                                    key={moment.id}
                                    moment={moment}
                                    isReadOnly={isReadOnly}
                                    isPinned={pinnedIds?.has(moment.id)}
                                    onTogglePin={onTogglePin}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
