"use client";

import { useEffect, useState } from "react";
import { Loader2, BookOpen } from "lucide-react";
import Link from "next/link";
import { getResponsesForProject, getProjectsForStudio } from "@/lib/firestore";
import { Response } from "@/lib/types";

interface StudentRosterProps {
    studioId: string;
}

interface StudentEntry {
    userId: string;
    displayName: string;
    responseCount: number;
}

export default function StudentRoster({ studioId }: StudentRosterProps) {
    const [students, setStudents] = useState<StudentEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const projects = await getProjectsForStudio(studioId);
            const allResponses: Response[] = [];
            await Promise.all(
                projects.map(async (p) => {
                    const resps = await getResponsesForProject(p.id);
                    allResponses.push(...resps);
                })
            );

            const byUser = new Map<string, StudentEntry>();
            for (const r of allResponses) {
                if (!byUser.has(r.userId)) {
                    byUser.set(r.userId, { userId: r.userId, displayName: r.userDisplayName, responseCount: 0 });
                }
                byUser.get(r.userId)!.responseCount++;
            }

            setStudents(Array.from(byUser.values()).sort((a, b) => b.responseCount - a.responseCount));
            setIsLoading(false);
        }
        load();
    }, [studioId]);

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-brand-amber" size={28} />
            </div>
        );
    }

    if (students.length === 0) {
        return (
            <div className="text-center py-16 text-brand-slate">
                <p className="font-semibold">No student responses yet.</p>
                <p className="text-sm mt-1">Students appear here once they post their first response.</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-brand-amber/10">
            {students.map((s) => (
                <div key={s.userId} className="flex items-center justify-between py-4">
                    <div>
                        <p className="font-semibold text-brand-warm">{s.displayName}</p>
                        <p className="text-sm text-brand-slate">{s.responseCount} response{s.responseCount !== 1 ? "s" : ""}</p>
                    </div>
                    <Link
                        href={`/journey?userId=${s.userId}&studioId=${studioId}`}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-brand-amber/20 hover:border-brand-amber hover:bg-brand-cream transition-all text-brand-warm"
                    >
                        <BookOpen size={16} style={{ color: '#c2410c' }} />
                        View Journey
                    </Link>
                </div>
            ))}
        </div>
    );
}
