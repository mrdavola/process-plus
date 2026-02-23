"use client";

import Link from "next/link";
import { Studio } from "@/lib/types";
import { ExternalLink } from "lucide-react";

interface StudioTableProps {
    studios: Studio[];
}

export default function StudioTable({ studios }: StudioTableProps) {
    const sorted = [...studios].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="text-left px-4 py-3 font-bold text-slate-600">Studio</th>
                        <th className="text-left px-4 py-3 font-bold text-slate-600">Code</th>
                        <th className="text-left px-4 py-3 font-bold text-slate-600">Status</th>
                        <th className="text-left px-4 py-3 font-bold text-slate-600">Created</th>
                        <th className="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {sorted.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-800">{s.title}</td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-xs">{s.processPlusCode}</td>
                            <td className="px-4 py-3">
                                <span className={`text-xs font-bold border rounded-full px-2.5 py-1 ${
                                    s.status === "active"
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : "bg-slate-100 text-slate-500 border-slate-200"
                                }`}>
                                    {s.status}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs">
                                {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-4 py-3">
                                <Link
                                    href={`/studio/${s.processPlusCode}`}
                                    target="_blank"
                                    className="flex items-center gap-1 text-xs font-bold text-brand-amber hover:underline"
                                >
                                    View <ExternalLink size={12} />
                                </Link>
                            </td>
                        </tr>
                    ))}
                    {studios.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No studios yet.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
