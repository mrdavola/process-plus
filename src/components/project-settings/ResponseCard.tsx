
import { Play, Eye, MoreHorizontal, Check, Ban, Trash2, Zap, ListVideo } from "lucide-react";
import { Response } from "@/lib/types";
import { useState } from "react";

interface ResponseCardProps {
    response: Response;
    onClick: () => void;
    isOwner?: boolean;
    onApprove?: (id: string) => void;
    onHide?: (id: string) => void;
    onDelete?: (id: string) => void;
    onSpark?: (id: string) => void;
    onMixTape?: (id: string) => void;
}

export default function ResponseCard({ response, onClick, isOwner, onApprove, onHide, onDelete, onSpark, onMixTape }: ResponseCardProps) {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="relative group">
            <div
                onClick={onClick}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={response.thumbnailUrl}
                    alt={response.userDisplayName}
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${response.status === 'hidden' ? 'opacity-50 grayscale' : ''}`}
                />

                {/* Status Badge */}
                {response.status === 'hidden' && (
                    <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-md shadow-sm z-20">
                        Pending Approval
                    </div>
                )}

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                        <Play size={24} className="fill-white ml-1" />
                    </div>
                </div>

                {/* Footer Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-bold text-lg leading-tight truncate">{response.userDisplayName}</h3>
                    <div className="flex items-center gap-2 mt-1 text-white/70 text-sm font-medium">
                        <span className="flex items-center gap-1">
                            {/* Time ago could go here */}
                            just now
                        </span>
                    </div>
                </div>
            </div>

            {/* Admin Controls */}
            {isOwner && (
                <div className="absolute top-2 right-2 z-30">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                        <MoreHorizontal size={16} />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1 animate-in fade-in zoom-in duration-200">
                            {response.status === 'hidden' ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onApprove?.(response.id); setShowMenu(false); }}
                                    className="w-full text-left px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                                >
                                    <Check size={14} /> Approve
                                </button>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onHide?.(response.id); setShowMenu(false); }}
                                    className="w-full text-left px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                                >
                                    <Ban size={14} /> Hide
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete?.(response.id); setShowMenu(false); }}
                                className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                            <hr className="my-1 border-slate-100" />
                            <button
                                onClick={(e) => { e.stopPropagation(); onSpark?.(response.id); setShowMenu(false); }}
                                className="w-full text-left px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 flex items-center gap-2"
                            >
                                <Zap size={14} /> Spark Response
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onMixTape?.(response.id); setShowMenu(false); }}
                                className="w-full text-left px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                            >
                                <ListVideo size={14} /> Add to MixTape
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
