"use client";

import { PenLine, Trash2 } from "lucide-react";
import { JourneyEntry } from "@/lib/types";

interface JourneyEntryCardProps {
    entry: JourneyEntry;
    onDelete?: (id: string) => void;
}

export default function JourneyEntryCard({ entry, onDelete }: JourneyEntryCardProps) {
    return (
        <div className="relative z-10 pl-14 md:pl-20 group">
            {/* Timeline dot — pencil style */}
            <div className="absolute left-[9px] md:left-[23px] top-5 w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow-sm z-20" />

            <div className="bg-white/70 rounded-2xl border border-dashed border-slate-200 px-6 py-4 flex items-start gap-4">
                <PenLine size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <p className="text-slate-600 text-sm leading-relaxed italic flex-1">{entry.text}</p>
                {onDelete && (
                    <button
                        onClick={() => onDelete(entry.id)}
                        className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}
