"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Plus, X } from "lucide-react";

interface Stickie {
    id: string;
    text: string;
    x: number;
    y: number;
}

interface RecordingStateProps {
    status: string;
    pauseRecording: () => void;
    resumeRecording: () => void;
    onFinish: () => void;
    maxDuration?: number;
    promptText?: string;
}

export default function RecordingState({
    status,
    pauseRecording,
    resumeRecording,
    onFinish,
    maxDuration = 120,
}: RecordingStateProps) {
    const [elapsed, setElapsed] = useState(0);
    const [stickies, setStickies] = useState<Stickie[]>([]);
    const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onFinishRef = useRef(onFinish);
    onFinishRef.current = onFinish;

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

    const addStickie = () => {
        const id = Math.random().toString(36).slice(2);
        setStickies(s => [...s, { id, text: "", x: 40, y: 100 }]);
    };

    const removeStickie = (id: string) => setStickies(s => s.filter(st => st.id !== id));

    const updateStickie = (id: string, text: string) => {
        setStickies(s => s.map(st => st.id === id ? { ...st, text } : st));
    };

    const onMouseDown = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDragging({ id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top });
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!dragging || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - containerRect.left - dragging.offsetX;
            const y = e.clientY - containerRect.top - dragging.offsetY;
            setStickies(s => s.map(st => st.id === dragging.id ? { ...st, x, y } : st));
        };
        const onMouseUp = () => setDragging(null);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [dragging]);

    return (
        <div ref={containerRef} className="absolute inset-0 flex flex-col items-center bg-black overflow-hidden">
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-800 z-20 shrink-0">
                <div
                    className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex-1 relative w-full bg-slate-900">
                {/* Recording indicator */}
                <div className="absolute top-6 left-6 flex items-center gap-2 z-30 bg-black/50 rounded-full px-3 py-1.5 backdrop-blur">
                    <div className={`w-2.5 h-2.5 bg-red-500 rounded-full ${status === "recording" ? "animate-pulse" : ""}`} />
                    <span className="text-white text-xs font-bold uppercase tracking-wider">
                        {status === "paused" ? "Paused" : "Recording"}
                    </span>
                </div>

                {/* Timer */}
                <div className="absolute top-6 right-6 z-30 bg-black/50 rounded-full px-4 py-1.5 backdrop-blur">
                    <span className="text-white font-mono font-bold text-sm">
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                    </span>
                </div>

                {/* Dark bg while recording */}
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                    <div className="text-white/10 text-sm font-mono">
                        {status === "paused" ? "⏸ Paused" : "● Recording"}
                    </div>
                </div>

                {/* Draggable Stickies */}
                {stickies.map(stickie => (
                    <div
                        key={stickie.id}
                        className="absolute z-40 w-52 select-none"
                        style={{ left: stickie.x, top: stickie.y }}
                    >
                        <div
                            className="bg-[#FFDD00] rounded-xl shadow-xl overflow-hidden"
                            onMouseDown={e => onMouseDown(stickie.id, e)}
                            style={{ cursor: dragging?.id === stickie.id ? "grabbing" : "grab" }}
                        >
                            <div className="flex items-center justify-between px-3 py-2 bg-[#f5cf00]">
                                <span className="text-xs font-bold text-black/60 uppercase tracking-wide">Notes</span>
                                <button
                                    onMouseDown={e => e.stopPropagation()}
                                    onClick={() => removeStickie(stickie.id)}
                                    className="text-black/40 hover:text-black transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <textarea
                                value={stickie.text}
                                onChange={e => updateStickie(stickie.id, e.target.value)}
                                onMouseDown={e => e.stopPropagation()}
                                placeholder="Type your notes..."
                                className="w-full bg-transparent p-3 text-sm text-black placeholder-black/40 resize-none focus:outline-none"
                                rows={4}
                            />
                        </div>
                    </div>
                ))}

                {/* Add Stickie */}
                <button
                    onClick={addStickie}
                    className="absolute bottom-24 right-6 z-30 flex items-center gap-2 px-4 py-2 bg-[#FFDD00] hover:bg-[#f5cf00] text-black font-bold rounded-xl shadow-lg transition-all hover:scale-105"
                >
                    <Plus size={16} />
                    Stickie
                </button>

                {/* Controls */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 z-30">
                    {status === "recording" ? (
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
