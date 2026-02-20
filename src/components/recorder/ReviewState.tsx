
import { RefreshCcw, Check, Play, Pause } from "lucide-react";
import { useRef, useState } from "react";

interface ReviewStateProps {
    videoUrl: string | null;
    onRetake: () => void;
    onConfirm: () => void;
}

export default function ReviewState({ videoUrl, onRetake, onConfirm }: ReviewStateProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);

    // Auto-play when mounted

    if (!videoUrl) return <div className="text-white">Processing...</div>;

    return (
        <div className="absolute inset-0 bg-black flex flex-col">
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="h-full w-auto object-cover"
                    autoPlay
                    loop
                    playsInline
                    onClick={() => {
                        if (videoRef.current?.paused) {
                            videoRef.current.play();
                            setIsPlaying(true);
                        } else {
                            videoRef.current?.pause();
                            setIsPlaying(false);
                        }
                    }}
                />

                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center backdrop-blur">
                            <Play size={40} className="text-white fill-current ml-2" />
                        </div>
                    </div>
                )}
            </div>

            <div className="h-24 bg-black border-t border-white/10 flex items-center justify-center gap-6 px-6">
                <button
                    onClick={onRetake}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl hover:bg-white/10 text-white transition-colors"
                >
                    <RefreshCcw size={20} />
                    Retake
                </button>

                <button
                    onClick={onConfirm}
                    className="flex-1 max-w-sm flex items-center justify-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transform hover:scale-[1.02] transition-all"
                >
                    Next
                    <Check size={20} />
                </button>
            </div>
        </div>
    );
}
