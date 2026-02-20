"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, X } from "lucide-react";

interface Stickie {
    id: string;
    text: string;
    x: number;
    y: number;
}

interface StickieOverlayProps {
    visible: boolean;
}

export default function StickieOverlay({ visible }: StickieOverlayProps) {
    const [stickies, setStickies] = useState<Stickie[]>([]);
    const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const addStickie = () => {
        const id = Math.random().toString(36).slice(2);
        setStickies(s => [...s, { id, text: "", x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 75 }]);
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
            // Allow dragging anywhere within the container without Strict bounds for better UX
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

    // Even if not visible, we maintain state, but just render null to hide
    if (!visible) return null;

    return (
        <div ref={containerRef} className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            {/* Draggable Stickies */}
            {stickies.map(stickie => (
                <div
                    key={stickie.id}
                    className="absolute z-40 w-52 select-none pointer-events-auto"
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

            {/* Add Stickie Button */}
            <button
                onClick={addStickie}
                className="absolute bottom-24 right-6 z-30 flex items-center gap-2 px-4 py-2 bg-[#FFDD00] hover:bg-[#f5cf00] text-black font-bold rounded-xl shadow-lg transition-all hover:scale-105 pointer-events-auto"
            >
                <Plus size={16} />
                Stickie
            </button>
        </div>
    );
}
