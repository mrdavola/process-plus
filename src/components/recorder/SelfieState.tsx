"use client";

import { Camera, RefreshCcw, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SelfieStateProps {
    onConfirm: (blob: Blob) => void;
    onRetake?: () => void;
}

export default function SelfieState({ onConfirm, onRetake }: SelfieStateProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(s => {
                if (!active) {
                    s.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = s;
                if (videoRef.current) videoRef.current.srcObject = s;
            })
            .catch(err => console.error("Selfie camera error:", err));

        return () => {
            active = false;
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        };
    }, []);

    const takePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const vid = videoRef.current;
        const cvs = canvasRef.current;
        cvs.width = vid.videoWidth;
        cvs.height = vid.videoHeight;
        const ctx = cvs.getContext("2d");
        if (!ctx) return;
        ctx.translate(cvs.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(vid, 0, 0);
        setCapturedImage(cvs.toDataURL("image/jpeg", 0.85));
    };

    const confirmPhoto = async () => {
        if (!capturedImage) return;
        streamRef.current?.getTracks().forEach(t => t.stop());
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        onConfirm(blob);
    };

    return (
        <div className="absolute inset-0 bg-black flex flex-col">
            <div className="flex-1 relative overflow-hidden">
                <canvas ref={canvasRef} className="hidden" />

                {capturedImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={capturedImage} alt="Selfie" className="w-full h-full object-cover" />
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                    />
                )}

                {!capturedImage && (
                    <div className="absolute top-6 inset-x-0 text-center pointer-events-none">
                        <span className="bg-black/60 text-white px-4 py-2 rounded-full text-sm font-bold backdrop-blur">
                            Take your selfie thumbnail!
                        </span>
                    </div>
                )}
            </div>

            <div className="h-28 bg-black border-t border-white/10 flex items-center justify-center gap-6">
                {!capturedImage ? (
                    <>
                        {onRetake && (
                            <button
                                onClick={onRetake}
                                className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                            >
                                <RefreshCcw size={18} />
                                Re-record
                            </button>
                        )}
                        <button
                            onClick={takePhoto}
                            className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all border-4 border-gray-300"
                        >
                            <Camera size={32} className="text-gray-800" />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setCapturedImage(null)}
                            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                        >
                            <RefreshCcw size={20} />
                            Retake
                        </button>
                        <button
                            onClick={confirmPhoto}
                            className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                        >
                            Use This Photo
                            <Check size={20} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
