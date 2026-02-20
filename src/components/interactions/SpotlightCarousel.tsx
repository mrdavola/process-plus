"use client";

import { Response } from "@/lib/types";
import { Play, Star } from "lucide-react";

interface SpotlightCarouselProps {
    responses: Response[];
    onSelect: (id: string) => void;
}

export default function SpotlightCarousel({ responses, onSelect }: SpotlightCarouselProps) {
    const spotlighted = responses.filter(r => r.isSpotlighted);

    if (spotlighted.length === 0) return null;

    return (
        <div className="w-full mb-12">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand-amber/10 rounded-xl">
                    <Star className="text-brand-amber fill-brand-amber" size={20} />
                </div>
                <h3 className="text-xl font-bold font-display text-slate-800">Teacher Spotlights</h3>
            </div>

            <div className="flex overflow-x-auto pb-6 gap-4 snap-x no-scrollbar">
                {spotlighted.map(entry => (
                    <div
                        key={entry.id}
                        onClick={() => onSelect(entry.id)}
                        className="snap-start shrink-0 w-64 aspect-[3/4] relative rounded-2xl overflow-hidden cursor-pointer group hover:-translate-y-1 outline outline-2 outline-transparent hover:outline-brand-amber transition-all flex border-2 border-slate-200"
                    >
                        {/* Background Thumbnail */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={entry.thumbnailUrl}
                            alt={`${entry.userDisplayName}'s entry`}
                            className="w-full h-full object-cover opacity-90 group-hover:scale-105 group-hover:opacity-100 transition-all duration-500"
                        />

                        {/* Overlay Solid Gradient for Flat Look */}
                        <div className="absolute inset-0 bg-gradient-to-t from-brand-warm via-brand-warm/60 to-transparent" />

                        {/* Content */}
                        <div className="absolute inset-0 p-5 flex flex-col justify-end">
                            <h4 className="text-white font-bold text-lg mb-1 drop-shadow-md">
                                {entry.userDisplayName}
                            </h4>
                            {entry.reflections && entry.reflections.length > 0 && (
                                <p className="text-white/80 text-xs font-medium line-clamp-2 italic border-l-2 border-brand-amber pl-2">
                                    "{entry.reflections[0]}"
                                </p>
                            )}
                        </div>

                        {/* Play Icon - Appears on Hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-14 h-14 bg-brand-amber text-white rounded-full flex items-center justify-center border-4 border-white/20 scale-90 group-hover:scale-100 transition-transform">
                                <Play fill="currentColor" size={24} className="ml-1" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
