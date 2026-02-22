"use client";

import { useState } from "react";
import { ArrowRight, MessageCircle, SkipForward } from "lucide-react";

interface ReflectionStateProps {
    prompts: string[];
    required?: boolean;
    onComplete: (responses: string[]) => void;
    onSkip: () => void;
}

export default function ReflectionState({ prompts, required = true, onComplete, onSkip }: ReflectionStateProps) {
    const [responses, setResponses] = useState<string[]>(new Array(prompts.length).fill(""));

    const handleResponseChange = (index: number, value: string) => {
        const newResponses = [...responses];
        newResponses[index] = value;
        setResponses(newResponses);
    };

    const isComplete = responses.every(r => r.trim().length > 0);
    const hasAny = responses.some(r => r.trim().length > 0);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (required ? isComplete : hasAny || !required) {
            onComplete(responses.map(r => r.trim()).filter(r => r.length > 0));
        }
    };

    return (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center p-6 overflow-y-auto">
            <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl my-auto">
                <div className="w-16 h-16 bg-brand-amber/10 text-brand-amber/90 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MessageCircle size={32} />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Process Plus Reflection</h2>
                <p className="text-gray-500 mb-8 text-center">
                    {required
                        ? "Take a moment to reflect on your learning process before submitting."
                        : "Take a moment to reflect — or skip if you're short on time."}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {prompts.map((prompt, index) => (
                        <div key={index}>
                            <label className="block text-left text-sm font-bold text-slate-700 mb-2 ml-1">
                                {prompt}
                                {!required && <span className="ml-2 text-xs font-normal text-slate-400">(optional)</span>}
                            </label>
                            <textarea
                                value={responses[index]}
                                onChange={(e) => handleResponseChange(index, e.target.value)}
                                placeholder="Your reflection..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-amber transition-all text-gray-900 font-medium min-h-[100px] resize-y"
                            />
                        </div>
                    ))}

                    <button
                        type="submit"
                        disabled={required ? !isComplete : false}
                        className="w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all mt-8"
                        style={{ backgroundColor: '#c2410c' }}
                    >
                        Review & Submit <ArrowRight size={20} />
                    </button>

                    {!required && (
                        <button
                            type="button"
                            onClick={onSkip}
                            className="w-full py-3 text-slate-400 hover:text-slate-600 font-medium flex items-center justify-center gap-2 transition-colors text-sm"
                        >
                            <SkipForward size={16} />
                            Skip reflections
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}
