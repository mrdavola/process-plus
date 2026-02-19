"use client";

import { X, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { Response } from "@/lib/types";
import { useEffect } from "react";

interface TheaterModalProps {
    responses: Response[];
    currentIndex: number | null;
    onClose: () => void;
    onNavigate: (index: number) => void;
}

export default function TheaterModal({ responses, currentIndex, onClose, onNavigate }: TheaterModalProps) {
    const response = currentIndex !== null ? responses[currentIndex] : null;

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

    if (!response || currentIndex === null) return null;

    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < responses.length - 1;

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

                <div className="w-full md:w-80 bg-gray-900 border-l border-white/10 p-6 flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
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

                    <p className="text-white/30 text-sm mb-4">{currentIndex + 1} of {responses.length}</p>

                    <div className="flex-1" />

                    <div className="pt-6 border-t border-white/10">
                        <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                            <Heart size={20} />
                            Like Response
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
