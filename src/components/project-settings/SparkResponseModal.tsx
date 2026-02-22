"use client";

import { useState } from "react";
import { X, Zap, Loader2, ArrowRight, Check, Sparkles } from "lucide-react";
import { Response, Project } from "@/lib/types";
import { createProject } from "@/lib/firestore";
import Link from "next/link";

interface SparkResponseModalProps {
    response: Response;
    project: Project;
    studioId: string;
    studioCode: string;
    onClose: () => void;
}

type Step = "intro" | "generating" | "edit" | "creating" | "done";

export default function SparkResponseModal({ response, project, studioId, studioCode, onClose }: SparkResponseModalProps) {
    const [step, setStep] = useState<Step>("intro");
    const [generatedTitle, setGeneratedTitle] = useState("");
    const [generatedPrompt, setGeneratedPrompt] = useState("");
    const [newProjectId, setNewProjectId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const hasReflections = response.reflections && response.reflections.length > 0;

    const generateSpark = async () => {
        setStep("generating");
        setError(null);
        try {
            const res = await fetch("/api/spark-response", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reflections: response.reflections || [],
                    originalPrompt: project.promptText,
                }),
            });
            if (!res.ok) throw new Error("Failed to generate");
            const data = await res.json();
            setGeneratedTitle(data.title);
            setGeneratedPrompt(data.promptText);
            setStep("edit");
        } catch (e) {
            console.error(e);
            setError("Couldn't generate a spark. Try again.");
            setStep("intro");
        }
    };

    const createSparkedProject = async () => {
        if (!generatedTitle.trim() || !generatedPrompt.trim()) return;
        setStep("creating");
        try {
            const id = await createProject({
                studioId,
                title: generatedTitle.trim(),
                promptText: generatedPrompt.trim(),
                status: "active",
                settings: { ...project.settings },
            });
            setNewProjectId(id);
            setStep("done");
        } catch (e) {
            console.error(e);
            setError("Failed to create project. Try again.");
            setStep("edit");
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Zap size={18} className="text-purple-600" />
                        </div>
                        <h2 className="text-lg font-black text-slate-900">Spark Response</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {/* INTRO */}
                    {step === "intro" && (
                        <div className="space-y-5">
                            <p className="text-slate-600 leading-relaxed">
                                Turn this student's thinking into a new project for your whole class. The AI will read their reflections and generate a prompt that invites everyone to explore that idea.
                            </p>

                            {/* Student reflections preview */}
                            {hasReflections ? (
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        {response.userDisplayName}'s reflections
                                    </p>
                                    {response.reflections!.map((r, i) => (
                                        <p key={i} className="text-sm text-slate-700 italic leading-relaxed border-l-2 border-purple-200 pl-3">
                                            "{r}"
                                        </p>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                                    <p className="text-sm text-amber-700">
                                        This response has no written reflections. The AI will use the original project prompt to generate a spark.
                                    </p>
                                </div>
                            )}

                            {error && (
                                <p className="text-red-600 text-sm font-medium">{error}</p>
                            )}

                            <button
                                onClick={generateSpark}
                                className="w-full py-3.5 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 shadow-md"
                                style={{ backgroundColor: '#7c3aed' }}
                            >
                                <Sparkles size={18} />
                                Generate Spark with AI
                            </button>
                        </div>
                    )}

                    {/* GENERATING */}
                    {step === "generating" && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center">
                                <Loader2 size={28} className="animate-spin text-purple-600" />
                            </div>
                            <p className="text-slate-600 font-medium">Reading the reflection and generating a spark…</p>
                        </div>
                    )}

                    {/* EDIT */}
                    {step === "edit" && (
                        <div className="space-y-5">
                            <p className="text-sm text-slate-500">The AI drafted this new project. Edit anything before creating it.</p>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Project Title</label>
                                <input
                                    type="text"
                                    value={generatedTitle}
                                    onChange={(e) => setGeneratedTitle(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Prompt for Students</label>
                                <textarea
                                    value={generatedPrompt}
                                    onChange={(e) => setGeneratedPrompt(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none transition-all resize-none"
                                />
                            </div>

                            <p className="text-xs text-slate-400 bg-purple-50 rounded-lg px-3 py-2">
                                ✨ Sparked from {response.userDisplayName}'s response to "{project.title}"
                            </p>

                            {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

                            <div className="flex gap-3">
                                <button
                                    onClick={generateSpark}
                                    className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                                >
                                    Regenerate
                                </button>
                                <button
                                    onClick={createSparkedProject}
                                    disabled={!generatedTitle.trim() || !generatedPrompt.trim()}
                                    className="flex-1 py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                                    style={{ backgroundColor: '#7c3aed' }}
                                >
                                    Create Project <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* CREATING */}
                    {step === "creating" && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <Loader2 size={28} className="animate-spin text-purple-600" />
                            <p className="text-slate-600 font-medium">Creating project…</p>
                        </div>
                    )}

                    {/* DONE */}
                    {step === "done" && (
                        <div className="flex flex-col items-center text-center py-6 gap-5">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                <Check size={32} className="text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 mb-1">Project Sparked! ⚡</h3>
                                <p className="text-slate-500 text-sm">"{generatedTitle}" is now live in your studio.</p>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button onClick={onClose} className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm">
                                    Close
                                </button>
                                {newProjectId && (
                                    <Link
                                        href={`/studio/${studioCode}/projects/${newProjectId}`}
                                        className="flex-1 py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm"
                                        style={{ backgroundColor: '#c2410c' }}
                                        onClick={onClose}
                                    >
                                        Go to Project <ArrowRight size={16} />
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
