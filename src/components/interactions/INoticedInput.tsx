"use client";

import { useState } from "react";
import { Send, Eye } from "lucide-react";

interface INoticedInputProps {
    responseId: string;
    currentUserId?: string;
    onSubmit: (observation: string) => Promise<void>;
}

export default function INoticedInput({ responseId, currentUserId, onSubmit }: INoticedInputProps) {
    const [observation, setObservation] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentUserId) {
            alert("You must be signed in to share an observation.");
            return;
        }

        if (!observation.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(`I noticed ${observation.trim()}`);
            setObservation("");
            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 3000);
        } catch (error) {
            console.error("Failed to submit observation", error);
            alert("Failed to submit observation.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="w-full py-4 px-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-medium flex items-center justify-center gap-2 animate-in fade-in duration-300">
                <Eye size={18} />
                Observation recorded!
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="w-full relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <span className="text-white/50 font-medium">I noticed...</span>
            </div>
            <input
                type="text"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="what stood out to you"
                className="w-full py-4 pl-28 pr-14 bg-white/5 border border-white/10 hover:border-white/20 focus:border-amber-500 rounded-xl text-white font-medium placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
            />
            <button
                type="submit"
                disabled={isSubmitting || !observation.trim()}
                className="absolute inset-y-2 right-2 px-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-amber-500 text-white rounded-lg flex items-center justify-center transition-colors"
                aria-label="Submit observation"
            >
                {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <Send size={16} />
                )}
            </button>
        </form>
    );
}
