"use client";

import { Video, Upload, Mic } from "lucide-react";

interface IdleStateProps {
    onRecord: () => void;
}

export default function IdleState({ onRecord }: IdleStateProps) {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
            <div className="relative group">
                <div className="absolute inset-0 bg-sky-400 blur-[80px] opacity-15 group-hover:opacity-30 transition-opacity duration-500 rounded-full" />
                <button
                    onClick={onRecord}
                    className="relative w-32 h-32 md:w-40 md:h-40 bg-sky-500 hover:bg-sky-400 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-sky-500/30 transform group-hover:scale-105 transition-all duration-300"
                >
                    <Video size={52} className="fill-current" />
                </button>
            </div>

            <h2 className="mt-8 text-2xl font-bold text-white tracking-tight">Add your response</h2>
            <p className="mt-2 text-white/50 text-sm">Click to turn on your camera</p>

            <div className="mt-12 flex gap-4">
                <button disabled className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white/40 text-sm font-medium opacity-50 cursor-not-allowed">
                    <Upload size={18} />
                    Import Video
                </button>
                <button disabled className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white/40 text-sm font-medium opacity-50 cursor-not-allowed">
                    <Mic size={18} />
                    Mic Only
                </button>
            </div>
        </div>
    );
}
