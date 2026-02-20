"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

interface RecordingStateProps {
    status: string;
    pauseRecording: () => void;
    resumeRecording: () => void;
    onFinish: () => void;
    maxDuration?: number;
    promptText?: string;
    stream?: MediaStream;
    canPauseResume?: boolean;
}

export default function RecordingState({
    status,
    pauseRecording,
    resumeRecording,
    onFinish,
    maxDuration = 120,
    canPauseResume = true,
}: RecordingStateProps) {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onFinishRef = useRef(onFinish);
    useEffect(() => {
        onFinishRef.current = onFinish;
    }, [onFinish]);

    // Fixed: start elapsed time at 0 and countdown based on maxDuration
    const [elapsed, setElapsed] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Timer: only counts while actively recording (not paused)
    useEffect(() => {
        if (status === "recording") {
            intervalRef.current = setInterval(() => {
                setElapsed(prev => {
                    if (prev + 1 >= maxDuration) {
                        onFinishRef.current();
                        return maxDuration;
                    }
                    return prev + 1;
                });
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [status, maxDuration]);

    const timeLeft = maxDuration - elapsed;
    const progress = (elapsed / maxDuration) * 100;



    return (
        <div ref={containerRef} className="absolute inset-0 flex flex-col items-center bg-transparent pointer-events-none">
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-800 z-20 shrink-0">
                <div
                    className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex-1 relative w-full bg-transparent pointer-events-none">
                {/* Recording indicator */}
                <div className="absolute top-6 left-6 flex items-center gap-2 z-30 bg-black/50 rounded-full px-3 py-1.5 backdrop-blur">
                    <div className={`w-2.5 h-2.5 bg-red-500 rounded-full ${status === "recording" ? "animate-pulse" : ""}`} />
                    <span className="text-white text-xs font-bold uppercase tracking-wider">
                        {status === "paused" ? "Paused" : "Recording"}
                    </span>
                </div>

                {/* Timer Countdown */}
                <div className="absolute top-6 right-6 z-30 bg-black/50 rounded-full px-4 py-1.5 backdrop-blur">
                    <span className="text-white font-mono font-bold text-sm">
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")} remaining
                    </span>
                </div>

                {/* Dark bg while recording */}
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                    <div className="text-white/30 text-sm font-mono drop-shadow-md">
                        {status === "paused" ? "⏸ Paused" : "● Recording"}
                    </div>
                </div>

                {/* Controls */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 z-30 pointer-events-auto">
                    {canPauseResume ? (
                        status === "recording" ? (
                            <button
                                onClick={pauseRecording}
                                className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition-all"
                            >
                                <Pause size={32} className="fill-current" />
                            </button>
                        ) : (
                            <button
                                onClick={resumeRecording}
                                className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition-all"
                            >
                                <Play size={32} className="fill-current ml-1" />
                            </button>
                        )
                    ) : (
                        <div className="w-16 h-16 opacity-0" />
                    )}

                    <button
                        onClick={onFinish}
                        className="w-24 h-24 rounded-full border-8 border-white/20 flex items-center justify-center group transition-all hover:scale-105"
                    >
                        <div className="w-10 h-10 bg-red-500 rounded-lg group-hover:rounded-sm transition-all duration-300" />
                    </button>

                    <div className="w-16 h-16 opacity-0" />
                </div>
            </div>

            {/* Gradient overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/70 to-transparent z-10 pointer-events-none" />
        </div>
    );
}
