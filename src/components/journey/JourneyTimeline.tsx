"use client";

import { useMemo } from "react";
import { BookOpen, Pin } from "lucide-react";
import JourneyMoment, { EnrichedMoment } from "./JourneyMoment";
import JourneyEntryCard from "./JourneyEntryCard";
import { JourneyEntry, JourneyRecommendation } from "@/lib/types";

type TimelineItem =
    | { kind: "moment"; data: EnrichedMoment }
    | { kind: "entry"; data: JourneyEntry };

interface JourneyTimelineProps {
    moments: EnrichedMoment[];
    entries?: JourneyEntry[];
    isReadOnly?: boolean;
    pinnedIds?: Set<string>;
    onTogglePin?: (responseId: string, newPinned: boolean) => void;
    onDeleteEntry?: (id: string) => void;
    recsByResponseId?: Map<string, JourneyRecommendation[]>;
    onRecommend?: (responseId: string) => void;
    currentTeacherId?: string;
}

function formatMonthYear(ts: number | undefined): string {
    if (!ts) return "Unknown";
    return new Date(ts).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function JourneyTimeline({
    moments,
    entries,
    isReadOnly = false,
    pinnedIds,
    onTogglePin,
    onDeleteEntry,
    recsByResponseId,
    onRecommend,
    currentTeacherId,
}: JourneyTimelineProps) {
    const allItems = useMemo((): TimelineItem[] => {
        const items: TimelineItem[] = [
            ...moments.map(m => ({ kind: "moment" as const, data: m })),
            ...(entries ?? []).map(e => ({ kind: "entry" as const, data: e })),
        ];
        items.sort((a, b) => (a.data.createdAt as number) - (b.data.createdAt as number));
        return items;
    }, [moments, entries]);

    // Group all items by month+year
    const grouped = useMemo(() => {
        const groups: { label: string; items: TimelineItem[] }[] = [];
        let currentLabel = "";
        for (const item of allItems) {
            const label = formatMonthYear(item.data.createdAt as number);
            if (label !== currentLabel) {
                currentLabel = label;
                groups.push({ label, items: [] });
            }
            groups[groups.length - 1].items.push(item);
        }
        return groups;
    }, [allItems]);

    if (moments.length === 0 && (!entries || entries.length === 0)) {
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
                                recommendations={recsByResponseId?.get(m.id)}
                                onRecommend={onRecommend}
                                currentTeacherId={currentTeacherId}
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

                        <div className="space-y-6">
                            {group.items.map((item) =>
                                item.kind === "moment" ? (
                                    <JourneyMoment
                                        key={item.data.id}
                                        moment={item.data}
                                        isReadOnly={isReadOnly}
                                        isPinned={pinnedIds?.has(item.data.id)}
                                        onTogglePin={onTogglePin}
                                        recommendations={recsByResponseId?.get(item.data.id)}
                                        onRecommend={onRecommend}
                                        currentTeacherId={currentTeacherId}
                                    />
                                ) : (
                                    <JourneyEntryCard
                                        key={item.data.id}
                                        entry={item.data}
                                        onDelete={onDeleteEntry}
                                    />
                                )
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
