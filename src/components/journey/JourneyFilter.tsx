"use client";

import { useMemo } from "react";
import { EnrichedMoment } from "./JourneyMoment";
import { Studio, Project } from "@/lib/types";

export interface JourneyFilterState {
    studioId: string | null;
    projectId: string | null;
}

interface JourneyFilterProps {
    moments: EnrichedMoment[];
    filter: JourneyFilterState;
    onChange: (f: JourneyFilterState) => void;
}

const ORANGE = "#c2410c";

export default function JourneyFilter({ moments, filter, onChange }: JourneyFilterProps) {
    // Collect unique studios from moments
    const studios = useMemo(() => {
        const map = new Map<string, Studio>();
        for (const m of moments) {
            if (m.studio && !map.has(m.studio.id)) {
                map.set(m.studio.id, m.studio);
            }
        }
        return Array.from(map.values());
    }, [moments]);

    // Collect projects for the selected studio
    const projects = useMemo(() => {
        if (!filter.studioId) return [];
        const map = new Map<string, Project>();
        for (const m of moments) {
            if (m.studio?.id === filter.studioId && m.project && !map.has(m.project.id)) {
                map.set(m.project.id, m.project);
            }
        }
        return Array.from(map.values());
    }, [moments, filter.studioId]);

    const handleStudio = (studioId: string | null) => {
        onChange({ studioId, projectId: null });
    };

    const handleProject = (projectId: string | null) => {
        onChange({ ...filter, projectId });
    };

    if (studios.length <= 1) return null; // only show filter if multiple studios

    return (
        <div className="space-y-2 mb-8">
            <div className="flex flex-wrap gap-2">
                <FilterPill
                    active={filter.studioId === null}
                    onClick={() => handleStudio(null)}
                    color={ORANGE}
                >
                    All Studios
                </FilterPill>
                {studios.map((s) => (
                    <FilterPill
                        key={s.id}
                        active={filter.studioId === s.id}
                        onClick={() => handleStudio(s.id)}
                        color={ORANGE}
                    >
                        {s.title}
                    </FilterPill>
                ))}
            </div>

            {filter.studioId && projects.length > 1 && (
                <div className="flex flex-wrap gap-2 pl-2 border-l-2 border-orange-100">
                    <FilterPill
                        active={filter.projectId === null}
                        onClick={() => handleProject(null)}
                        color="#64748b"
                    >
                        All Chapters
                    </FilterPill>
                    {projects.map((p) => (
                        <FilterPill
                            key={p.id}
                            active={filter.projectId === p.id}
                            onClick={() => handleProject(p.id)}
                            color="#64748b"
                        >
                            {p.title}
                        </FilterPill>
                    ))}
                </div>
            )}
        </div>
    );
}

function FilterPill({
    children,
    active,
    onClick,
    color,
}: {
    children: React.ReactNode;
    active: boolean;
    onClick: () => void;
    color: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all ${active
                ? "text-white border-transparent shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
            style={active ? { backgroundColor: color, borderColor: color } : {}}
        >
            {children}
        </button>
    );
}
