"use client";

import { X, Heart, ChevronLeft, ChevronRight, MessageSquare, Send, Play } from "lucide-react";
import { Response, Topic } from "@/lib/types";
import { useEffect, useState } from "react";
import { toggleResponseReaction, addResponseFeedback } from "@/lib/firestore";

interface TheaterModalProps {
    responses: Response[];
    allResponses?: Response[];
    currentIndex: number | null;
    onClose: () => void;
    onNavigate: (index: number) => void;
    topic: Topic;
    currentUserId?: string;
    isOwner: boolean;
    onReply?: (id: string) => void;
    onViewReply?: (id: string) => void;
}

export default function TheaterModal({ responses, allResponses, currentIndex, onClose, onNavigate, topic, currentUserId, isOwner, onReply, onViewReply }: TheaterModalProps) {
    const response = currentIndex !== null ? responses[currentIndex] : null;
    const [feedbackText, setFeedbackText] = useState("");
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

    useEffect(() => {
        if (currentIndex === null) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                onNavigate(Math.min(currentIndex + 1, responses.length - 1));
            }
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                onNavigate(Math.max(currentIndex - 1, 0));
            }
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [currentIndex, responses.length, onNavigate, onClose]);

    useEffect(() => {
        if (response) {
            setFeedbackText(response.feedback?.text || "");
        }
    }, [response?.id]);

    if (!response || currentIndex === null) return null;

    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < responses.length - 1;

    const hasLiked = currentUserId ? (response.reactions || []).includes(currentUserId) : false;
    const replies = (allResponses || responses).filter(r => r.replyToId === response.id);

    const handleLike = async () => {
        if (!currentUserId) {
            alert("You must be signed in to like a response!");
            return;
        }
        try {
            await toggleResponseReaction(response.id, currentUserId, hasLiked);
        } catch (error) {
            console.error("Failed to toggle reaction:", error);
            alert("Failed to update reaction.");
        }
    };

    const handleFeedbackSubmit = async () => {
        if (!isOwner || !feedbackText.trim()) return;
        setIsSubmittingFeedback(true);
        try {
            await addResponseFeedback(response.id, feedbackText.trim());
            alert("Feedback saved!");
        } catch (error) {
            console.error("Failed to save feedback", error);
            alert("Failed to save feedback.");
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <button
                onClick={onClose}
                className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-10"
                aria-label="Close"
            >
                <X size={32} />
            </button>

            {hasPrev && (
                <button
                    onClick={() => onNavigate(currentIndex - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
                    aria-label="Previous response"
                >
                    <ChevronLeft size={28} />
                </button>
            )}

            {hasNext && (
                <button
                    onClick={() => onNavigate(currentIndex + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
                    aria-label="Next response"
                >
                    <ChevronRight size={28} />
                </button>
            )}

            <div className="w-full max-w-6xl h-full flex flex-col md:flex-row bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                <div className="flex-1 bg-black relative flex items-center justify-center">
                    <video
                        key={response.id}
                        src={response.videoUrl}
                        controls
                        autoPlay
                        className="max-h-full max-w-full object-contain"
                    />
                </div>

                <div className="w-full md:w-96 bg-gray-900 border-l border-white/10 p-6 flex flex-col overflow-y-auto">
                    <div className="flex items-center gap-4 mb-6 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={response.thumbnailUrl}
                            alt={response.userDisplayName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                        />
                        <div>
                            <h3 className="text-white font-bold">{response.userDisplayName}</h3>
                            <p className="text-white/50 text-xs">{response.views} views</p>
                        </div>
                    </div>

                    <p className="text-white/30 text-sm mb-4 shrink-0">{currentIndex + 1} of {responses.length}</p>

                    <div className="flex-1 space-y-6">
                        {/* Teacher Feedback Display (visible to everyone if exists, but only editable by owner) */}
                        {isOwner ? (
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <h4 className="text-white/70 text-sm font-bold mb-3 flex items-center gap-2">
                                    <MessageSquare size={16} /> Edit Teacher Feedback
                                </h4>
                                <textarea
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    placeholder="Leave private feedback..."
                                    className="w-full bg-black/40 text-white p-3 rounded-lg border border-white/10 focus:border-sky-500 outline-none text-sm resize-none mb-3"
                                    rows={4}
                                />
                                <button
                                    onClick={handleFeedbackSubmit}
                                    disabled={isSubmittingFeedback || !feedbackText.trim() || feedbackText === response.feedback?.text}
                                    className="w-full py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:hover:bg-sky-500 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                                >
                                    {isSubmittingFeedback ? "Saving..." : "Save Feedback"}
                                </button>
                            </div>
                        ) : response.feedback?.text ? (
                            <div className="bg-sky-500/10 p-4 rounded-xl border border-sky-500/20">
                                <h4 className="text-sky-400 text-sm font-bold mb-2 flex items-center gap-2">
                                    <MessageSquare size={16} /> Teacher Feedback
                                </h4>
                                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                                    {response.feedback.text}
                                </p>
                            </div>
                        ) : null}
                    </div>

                    <div className="pt-6 border-t border-white/10 shrink-0 space-y-3 mt-6">
                        {topic.settings.studentReplies && onReply && (
                            <button
                                onClick={() => onReply(response.id)}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                                <MessageSquare size={20} />
                                Add Reply
                            </button>
                        )}
                        {topic.settings.videoReactions && (
                            <button
                                onClick={handleLike}
                                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${hasLiked
                                    ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/50"
                                    : "bg-white/10 text-white hover:bg-white/20 border border-transparent"
                                    }`}
                            >
                                <Heart size={20} className={hasLiked ? "fill-current" : ""} />
                                {response.reactions?.length || 0} Likes
                            </button>
                        )}
                    </div>

                    {replies.length > 0 && (
                        <div className="pt-6 border-t border-white/10 shrink-0 space-y-4 mt-6">
                            <h4 className="text-white/70 text-sm font-bold flex items-center gap-2">
                                <MessageSquare size={16} /> Replies ({replies.length})
                            </h4>
                            <div className="space-y-3">
                                {replies.map(reply => (
                                    <div key={reply.id} className="flex gap-3 items-center bg-white/5 p-3 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => {
                                        const idx = (allResponses || responses).findIndex(r => r.id === reply.id);
                                        if (onViewReply) {
                                            onViewReply(reply.id);
                                        }
                                    }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={reply.thumbnailUrl} alt={reply.userDisplayName} className="w-10 h-10 rounded-full object-cover" />
                                        <div>
                                            <p className="text-white text-sm font-bold">{reply.userDisplayName}</p>
                                            <p className="text-white/50 text-xs">{reply.views} views</p>
                                        </div>
                                        <div className="ml-auto">
                                            <Play size={16} className="text-white/50" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
