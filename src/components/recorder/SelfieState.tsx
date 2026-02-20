"use client";

import { Camera, RefreshCcw, Check, Palette, Trash2, Pencil, Smile } from "lucide-react";
import { useEffect, useRef, useState, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";

interface SelfieStateProps {
    onConfirm: (blob: Blob) => void;
    onRetake?: () => void;
    allowDecorations?: boolean;
}

const COLORS = ["#FFDD00", "#FF0055", "#00DDFF", "#00FF66", "#FFFFFF", "#000000"];
const STICKERS = ["😎", "🤩", "🤯", "🔥", "✨", "💯", "💖", "🦄", "🚀", "👑"];

export default function SelfieState({ onConfirm, onRetake, allowDecorations }: SelfieStateProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    const [decoMode, setDecoMode] = useState<"draw" | "sticker" | null>(null);
    const [color, setColor] = useState(COLORS[0]);
    const [currentSticker, setCurrentSticker] = useState(STICKERS[0]);

    const isDrawing = useRef(false);
    const lastPos = useRef<{ x: number, y: number } | null>(null);

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

    // Resize drawing canvas to match container when image is captured
    useEffect(() => {
        if (capturedImage && drawingCanvasRef.current && containerRef.current) {
            const { clientWidth, clientHeight } = containerRef.current;
            drawingCanvasRef.current.width = clientWidth;
            drawingCanvasRef.current.height = clientHeight;
        }
    }, [capturedImage]);

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
        setDecoMode("draw"); // Default to draw mode after taking photo
    };

    const getCoordinates = (e: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>) => {
        const canvas = drawingCanvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleStartInteraction = (e: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>) => {
        if (!decoMode) return;
        const pos = getCoordinates(e);
        if (!pos) return;

        if (decoMode === "draw") {
            isDrawing.current = true;
            lastPos.current = pos;
        } else if (decoMode === "sticker") {
            const ctx = drawingCanvasRef.current?.getContext("2d");
            if (!ctx) return;
            ctx.font = "80px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(currentSticker, pos.x, pos.y);
        }
    };

    const handleMoveInteraction = (e: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing.current || decoMode !== "draw") return;
        const currentPos = getCoordinates(e);
        if (!currentPos || !lastPos.current) return;

        const ctx = drawingCanvasRef.current?.getContext("2d");
        if (!ctx) return;

        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 12;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        lastPos.current = currentPos;
    };

    const handleEndInteraction = () => {
        isDrawing.current = false;
        lastPos.current = null;
    };

    const confirmPhoto = async () => {
        if (!capturedImage) return;
        streamRef.current?.getTracks().forEach(t => t.stop());

        if (allowDecorations && drawingCanvasRef.current) {
            const finalCanvas = document.createElement("canvas");
            const img = new Image();

            await new Promise((resolve) => {
                img.onload = resolve;
                img.src = capturedImage;
            });

            const displayWidth = drawingCanvasRef.current.width;
            const displayHeight = drawingCanvasRef.current.height;

            finalCanvas.width = displayWidth;
            finalCanvas.height = displayHeight;
            const ctx = finalCanvas.getContext("2d");
            if (ctx) {
                // Object cover math
                const scale = Math.max(displayWidth / img.width, displayHeight / img.height);
                const x = (displayWidth / 2) - (img.width / 2) * scale;
                const y = (displayHeight / 2) - (img.height / 2) * scale;

                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                ctx.drawImage(drawingCanvasRef.current, 0, 0);

                finalCanvas.toBlob((blob) => {
                    if (blob) onConfirm(blob);
                }, "image/jpeg", 0.85);
                return;
            }
        }

        // Fallback or no decorations
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        onConfirm(blob);
    };

    return (
        <div className="absolute inset-0 bg-black flex flex-col">
            <div ref={containerRef} className="flex-1 relative overflow-hidden">
                <canvas ref={canvasRef} className="hidden" />

                {!capturedImage ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                    />
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={capturedImage} alt="Selfie" className="absolute inset-0 w-full h-full object-cover" />
                )}

                {/* Decoration Layer */}
                {capturedImage && allowDecorations && (
                    <canvas
                        ref={drawingCanvasRef}
                        className={`absolute inset-0 w-full h-full touch-none ${decoMode ? (decoMode === "draw" ? "cursor-crosshair" : "cursor-pointer") : "pointer-events-none"}`}
                        onMouseDown={handleStartInteraction}
                        onMouseMove={handleMoveInteraction}
                        onMouseUp={handleEndInteraction}
                        onMouseLeave={handleEndInteraction}
                        onTouchStart={handleStartInteraction}
                        onTouchMove={handleMoveInteraction}
                        onTouchEnd={handleEndInteraction}
                    />
                )}

                {!capturedImage && (
                    <div className="absolute top-6 inset-x-0 text-center pointer-events-none">
                        <span className="bg-black/60 text-white px-4 py-2 rounded-full text-sm font-bold backdrop-blur">
                            Take your selfie thumbnail!
                        </span>
                    </div>
                )}

                {/* Decoration Controls */}
                {capturedImage && allowDecorations && (
                    <>
                        <div className="absolute top-4 right-4 z-50 flex flex-col gap-3">
                            <button
                                onClick={() => setDecoMode(decoMode === "draw" ? null : "draw")}
                                className={`p-4 rounded-full shadow-lg transition-transform ${decoMode === "draw" ? "bg-brand-amber text-white scale-110" : "bg-white text-slate-800 hover:bg-slate-100 hover:scale-105"}`}
                            >
                                <Pencil size={24} />
                            </button>
                            <button
                                onClick={() => setDecoMode(decoMode === "sticker" ? null : "sticker")}
                                className={`p-4 rounded-full shadow-lg transition-transform ${decoMode === "sticker" ? "bg-rose-500 text-white scale-110" : "bg-white text-slate-800 hover:bg-slate-100 hover:scale-105"}`}
                            >
                                <Smile size={24} />
                            </button>
                            {decoMode && (
                                <button
                                    onClick={() => {
                                        const ctx = drawingCanvasRef.current?.getContext('2d');
                                        if (ctx && drawingCanvasRef.current) {
                                            ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
                                        }
                                    }}
                                    className="p-4 rounded-full bg-white text-slate-800 shadow-lg hover:bg-slate-100 transition-transform hover:scale-105 mt-2"
                                >
                                    <Trash2 size={24} />
                                </button>
                            )}
                        </div>

                        {/* Sub-toolbars */}
                        {decoMode === "draw" && (
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex gap-3 bg-black/50 p-3 rounded-full backdrop-blur-md">
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setColor(c)}
                                        style={{ backgroundColor: c }}
                                        className={`w-10 h-10 rounded-full border-4 transition-transform ${color === c ? 'border-white scale-110 shadow-xl' : 'border-black hover:scale-105'}`}
                                    />
                                ))}
                            </div>
                        )}

                        {decoMode === "sticker" && (
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-black/50 p-3 rounded-full backdrop-blur-md flex-wrap justify-center max-w-[80vw]">
                                {STICKERS.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setCurrentSticker(s)}
                                        className={`text-3xl transition-transform ${currentSticker === s ? 'scale-125 drop-shadow-lg' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}

                        {decoMode === "sticker" && (
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center pointer-events-none opacity-50">
                                <span className="bg-black/80 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                                    Tap anywhere to place
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="h-28 bg-black border-t border-white/10 flex items-center justify-center gap-6 z-10">
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
                            className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all border-4 border-slate-300"
                        >
                            <Camera size={32} className="text-slate-900" />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => {
                                setCapturedImage(null);
                                setDecoMode(null);
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-bold"
                        >
                            <RefreshCcw size={20} />
                            Retake
                        </button>
                        <button
                            onClick={confirmPhoto}
                            className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
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
