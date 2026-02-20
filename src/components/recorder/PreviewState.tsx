"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface PreviewStateProps {
    stream: MediaStream;
    onRecord: () => void;
    onCancel: () => void;
}

export default function PreviewState({ stream, onRecord, onCancel }: PreviewStateProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="absolute inset-0 flex flex-col bg-transparent">
            <div className="flex-1 relative overflow-hidden pointer-events-none" />

            <div className="h-28 bg-transparent border-t border-white/10 flex items-center justify-center gap-8 pointer-events-auto mt-auto">
                <button
                    onClick={onCancel}
                    className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                >
                    <X size={18} />
                    Cancel
                </button>

                <button
                    onClick={onRecord}
                    className="flex items-center gap-3 px-8 py-4 bg-brand-amber hover:bg-brand-amber/80 text-white font-bold rounded-2xl shadow-xl shadow-brand-amber/30 transform hover:scale-105 transition-all duration-200"
                >
                    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                    </div>
                    Start Recording
                </button>
            </div>
        </div>
    );
}
