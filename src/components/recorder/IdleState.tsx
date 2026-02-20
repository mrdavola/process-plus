"use client";

import { Video, Upload, Mic } from "lucide-react";

interface IdleStateProps {
    onRecord: () => void;
    isMicOnly: boolean;
    canUploadClip: boolean;
}

export default function IdleState({ onRecord, isMicOnly, canUploadClip }: IdleStateProps) {
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

            <h2 className="mt-8 text-2xl font-bold text-white tracking-tight">{isMicOnly ? "Record an audio response" : "Add your response"}</h2>
            <p className="mt-2 text-white/50 text-sm">Click to turn on your {isMicOnly ? "mic" : "camera"}</p>

            <div className="mt-12 flex gap-4">
                {canUploadClip && (
                    <button
                        onClick={() => alert("Coming Soon: Upload clip functionality")}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-colors bg-white/10 border border-white/20 text-white hover:bg-white/20"
                    >
                        <Upload size={18} />
                        Import Video
                    </button>
                )}

                {isMicOnly && (
                    <button
                        disabled
                        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium bg-sky-500/20 border-sky-500/50 text-sky-400"
                    >
                        <Mic size={18} />
                        Audio Only Mode
                    </button>
                )}
            </div>
        </div>
    );
}
