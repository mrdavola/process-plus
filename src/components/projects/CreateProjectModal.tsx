"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createProject } from "@/lib/firestore";
import { Project } from "@/lib/types";

interface CreateProjectModalProps {
    studioId: string;
    onClose: () => void;
    onCreated: (project: Project) => void;
}

const DURATION_OPTIONS = [15, 30, 60, 90, 180, 300];

export default function CreateProjectModal({ studioId, onClose, onCreated }: CreateProjectModalProps) {
    const [title, setTitle] = useState("");
    const [promptText, setPromptText] = useState("");
    const [maxDuration, setMaxDuration] = useState(120);
    const [moderation, setModeration] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !promptText.trim()) return;
        setBusy(true);
        setError(null);
        try {
            const projectData = {
                studioId,
                title: title.trim(),
                promptText: promptText.trim(),
                settings: {
                    maxDuration,
                    moderation,
                    micOnly: false,
                    uploadClip: true,
                    pauseResume: true,
                    selfieDecorations: true,
                    studentReplies: false, // Defaulting to false as requested
                    videoReactions: true,
                    feedbackbackType: "none" as const,
                    privatefeedbackback: false
                },
                status: "active" as const,
            };
            const id = await createProject(projectData);
            onCreated({ id, ...projectData, joinCode: "pending", createdAt: Date.now() });
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to create project");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 border border-slate-100 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-slate-900">New Project</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Project Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Show & Tell: Your Favorite Hobby"
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-amber text-slate-900"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Prompt / Question</label>
                        <textarea
                            value={promptText}
                            onChange={e => setPromptText(e.target.value)}
                            placeholder="What should students talk about in their video?"
                            required
                            rows={4}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-amber text-slate-900 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Max Recording Duration</label>
                        <div className="flex flex-wrap gap-2">
                            {DURATION_OPTIONS.map(d => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setMaxDuration(d)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${maxDuration === d
                                        ? "bg-brand-amber text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                >
                                    {d < 60 ? `${d}s` : `${d / 60}m`}
                                </button>
                            ))}
                        </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={moderation}
                            onClick={() => setModeration(!moderation)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${moderation ? "bg-brand-amber" : "bg-slate-200"}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${moderation ? "translate-x-7" : "translate-x-1"}`} />
                        </button>
                        <div>
                            <span className="font-bold text-slate-900 text-sm">Video Moderation</span>
                            <p className="text-xs text-slate-400">Responses stay hidden until you approve them</p>
                        </div>
                    </label>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={busy || !title.trim() || !promptText.trim()}
                        className="w-full py-3 bg-brand-amber hover:bg-brand-amber/90 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
                    >
                        {busy ? "Creating..." : "Post Project"}
                    </button>
                </form>
            </div>
        </div>
    );
}
