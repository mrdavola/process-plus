"use client";

import { useState } from "react";
import { Sparkles, Loader2, Bot, ChevronDown, ChevronUp } from "lucide-react";

interface FeedbackCoachProps {
    reflections: string[];
    isTeacher?: boolean;
}

export default function FeedbackCoach({ reflections, isTeacher = false }: FeedbackCoachProps) {
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const getCoachFeedback = async () => {
        setIsLoading(true);
        setIsExpanded(true);

        try {
            const res = await fetch("/api/feedback-coach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reflections }),
            });

            if (!res.ok) throw new Error("Failed to get feedback");

            const data = await res.json();
            if (data.feedback) setFeedback(data.feedback);

        } catch (error) {
            console.error(error);
            setFeedback("The coach is currently taking a break. Please try again later!");
        } finally {
            setIsLoading(false);
        }
    };

    if (!reflections || reflections.length === 0) return null;

    const label = isTeacher ? "Preview Process Coach" : "Process Coach";
    const sublabel = isTeacher
        ? "See what the AI coach will tell this student"
        : "Get Socratic feedback on your reflection";

    return (
        <div className="mt-6 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 overflow-hidden text-left w-full mx-auto container max-w-2xl px-2">
            {!hasAttemptedOrExpanded(feedback, isExpanded) ? (
                <button
                    onClick={getCoachFeedback}
                    className="w-full p-4 flex items-center justify-between text-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                            <Bot size={20} />
                        </div>
                        <div className="text-left">
                            <h4 className="font-bold text-sm">{label}</h4>
                            <p className="text-xs text-indigo-600/70">{sublabel}</p>
                        </div>
                    </div>
                    <Sparkles size={18} className="text-indigo-400" />
                </button>
            ) : (
                <div className="p-5">
                    <div
                        className="flex items-center justify-between cursor-pointer border-b border-indigo-100 pb-4 mb-4"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                                <Bot size={20} />
                            </div>
                            <h4 className="font-bold text-indigo-900 text-sm">Process Coach insights</h4>
                        </div>
                        {isExpanded ? <ChevronUp size={20} className="text-indigo-400" /> : <ChevronDown size={20} className="text-indigo-400" />}
                    </div>

                    {isExpanded && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-6 gap-3">
                                    <Loader2 className="animate-spin text-indigo-500" size={24} />
                                    <span className="text-indigo-500/80 text-sm font-medium">The coach is thinking...</span>
                                </div>
                            ) : (
                                <div>
                                    <div className="prose prose-sm prose-indigo max-w-none text-indigo-900/80 leading-relaxed font-medium">
                                        {feedback}
                                    </div>
                                    <button
                                        onClick={getCoachFeedback}
                                        className="mt-3 text-xs text-indigo-400 hover:text-indigo-600 font-medium transition-colors"
                                    >
                                        ↺ Regenerate
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function hasAttemptedOrExpanded(feedback: string | null, isExpanded: boolean) {
    return feedback !== null || isExpanded;
}
