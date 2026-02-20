"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { X, Mic } from "lucide-react";

import IdleState from "./IdleState";
import PreviewState from "./PreviewState";
import CountdownState from "./CountdownState";
import RecordingState from "./RecordingState";
import ReviewState from "./ReviewState";
import SelfieState from "./SelfieState";
import SubmitState from "./SubmitState";
import StickieOverlay from "./StickieOverlay";
import ReflectionState from "./ReflectionState";
import { ProjectSettings } from "@/lib/types";

type RecorderState = "IDLE" | "PREVIEW" | "COUNTDOWN" | "RECORDING" | "REVIEW" | "REFLECTION" | "SELFIE" | "SUBMIT";

interface RecorderModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectTitle: string;
    promptText: string;
    projectSettings?: ProjectSettings;
    userId: string;
    replyToId?: string;
}

export default function RecorderModal({
    isOpen,
    onClose,
    projectId,
    projectTitle,
    promptText,
    projectSettings,
    userId,
    replyToId,
}: RecorderModalProps) {
    const [recorderState, setRecorderState] = useState<RecorderState>("IDLE");
    const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
    const [reflections, setReflections] = useState<string[]>([]);
    const previewStreamRef = useRef<MediaStream | null>(null);
    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

    const defaultPrompts = [
        "What were you thinking when you started this?",
        "What changed as you worked through it?",
        "What would you do differently next time?"
    ];

    const isMicOnly = projectSettings?.micOnly ?? false;

    const { status, startRecording, stopRecording, pauseRecording, resumeRecording, mediaBlobUrl, clearBlobUrl } =
        useReactMediaRecorder({ video: !isMicOnly, askPermissionOnMount: false });

    const stopCamera = useCallback(() => {
        previewStreamRef.current?.getTracks().forEach(t => t.stop());
        previewStreamRef.current = null;
        setPreviewStream(null);
    }, []);

    // Clean up on close or unmount
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                stopCamera();
                setRecorderState("IDLE");
                setSelfieBlob(null);
                setReflections([]);
            }, 0);
        }
    }, [isOpen, stopCamera]);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const openPreview = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: !isMicOnly, audio: true });
            previewStreamRef.current = stream;
            setPreviewStream(stream);
            setRecorderState("PREVIEW");
        } catch (err) {
            console.error("Camera access denied:", err);
        }
    };

    const beginCountdown = () => {
        setRecorderState("COUNTDOWN");
    };

    const startActualRecording = () => {
        // We will keep the preview stream alive so the user can see themselves
        startRecording();
        setRecorderState("RECORDING");
    };

    const handleFinish = () => {
        stopRecording();
        setRecorderState("REVIEW");
    };

    if (!isOpen) return null;

    const showPromptOverlay = recorderState === "IDLE" || recorderState === "PREVIEW" || recorderState === "COUNTDOWN" || recorderState === "RECORDING" || recorderState === "REVIEW";
    const isStreamActive = recorderState === "PREVIEW" || recorderState === "COUNTDOWN" || recorderState === "RECORDING";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-5xl h-full max-h-[90vh] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">

                {/* Header Overlay */}
                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-30 pointer-events-none">
                    {showPromptOverlay ? (
                        <div className="pointer-events-auto">
                            <div className="bg-[#FFDD00] text-black p-4 rounded-xl shadow-lg rotate-[-2deg] max-w-xs hover:rotate-0 transition-transform duration-300">
                                <h3 className="font-bold text-xs uppercase tracking-wider mb-1 opacity-60">Prompt</h3>
                                <p className="font-medium leading-snug text-sm">{promptText}</p>
                            </div>
                        </div>
                    ) : (
                        <div />
                    )}
                    <button
                        onClick={() => { stopCamera(); if (recorderState === "RECORDING") stopRecording(); onClose(); }}
                        className="pointer-events-auto bg-black/40 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur transition-all shrink-0"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* State Machine */}
                <div className="flex-1 relative bg-black overflow-hidden mt-20">
                    {/* Global Video Stream */}
                    {isMicOnly ? (
                        <div className={`absolute inset-0 flex flex-col items-center justify-center bg-slate-900 transition-opacity duration-300 ${isStreamActive ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none'}`}>
                            <div className={`size-32 rounded-full bg-sky-500/20 flex items-center justify-center ${status === "recording" ? "animate-pulse" : ""}`}>
                                <Mic size={64} className="text-sky-400" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-10" />
                            <StickieOverlay visible={isStreamActive} />
                        </div>
                    ) : (
                        <div className={`absolute inset-0 transition-opacity duration-300 ${isStreamActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            {previewStream && (
                                <video
                                    ref={(el) => {
                                        if (el && previewStream) el.srcObject = previewStream;
                                    }}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover transform -scale-x-100"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-10" />
                            <StickieOverlay visible={isStreamActive} />
                        </div>
                    )}

                    <div className="absolute inset-0 z-20 flex flex-col pointer-events-none">
                        <div className="flex-1 w-full pointer-events-auto">
                            {recorderState === "IDLE" && (
                                <IdleState
                                    onRecord={openPreview}
                                    isMicOnly={isMicOnly}
                                    canUploadClip={projectSettings?.uploadClip ?? false}
                                />
                            )}

                            {recorderState === "PREVIEW" && previewStream && (
                                <PreviewState
                                    stream={previewStream}
                                    onRecord={beginCountdown}
                                    onCancel={() => { stopCamera(); setRecorderState("IDLE"); }}
                                />
                            )}

                            {recorderState === "COUNTDOWN" && previewStream && (
                                <CountdownState
                                    stream={previewStream}
                                    onComplete={startActualRecording}
                                />
                            )}

                            {recorderState === "RECORDING" && previewStream && (
                                <RecordingState
                                    status={status}
                                    stream={previewStream}
                                    pauseRecording={pauseRecording}
                                    resumeRecording={resumeRecording}
                                    onFinish={handleFinish}
                                    maxDuration={projectSettings?.maxDuration ?? 120}
                                    promptText={promptText}
                                    canPauseResume={projectSettings?.pauseResume ?? true}
                                />
                            )}

                            {recorderState === "REVIEW" && mediaBlobUrl && (
                                <ReviewState
                                    videoUrl={mediaBlobUrl}
                                    onRetake={() => {
                                        clearBlobUrl();
                                        setRecorderState("IDLE");
                                    }}
                                    onConfirm={() => setRecorderState("REFLECTION")}
                                />
                            )}

                            {recorderState === "REFLECTION" && (
                                <ReflectionState
                                    prompts={defaultPrompts}
                                    onComplete={(resps) => {
                                        setReflections(resps);
                                        setRecorderState("SELFIE");
                                    }}
                                />
                            )}

                            {recorderState === "SELFIE" && (
                                <SelfieState
                                    onConfirm={(blob) => {
                                        setSelfieBlob(blob);
                                        setRecorderState("SUBMIT");
                                    }}
                                    onRetake={() => setRecorderState("REVIEW")}
                                    allowDecorations={projectSettings?.selfieDecorations ?? true}
                                />
                            )}

                            {recorderState === "SUBMIT" && mediaBlobUrl && selfieBlob && (
                                <SubmitState
                                    videoBlobUrl={mediaBlobUrl}
                                    selfieBlob={selfieBlob}
                                    reflections={reflections}
                                    projectId={projectId}
                                    projectTitle={projectTitle}
                                    userId={userId}
                                    moderation={projectSettings?.moderation ?? false}
                                    replyToId={replyToId}
                                    onSuccess={() => {
                                        onClose();
                                        clearBlobUrl();
                                        setRecorderState("IDLE");
                                        setSelfieBlob(null);
                                        setReflections([]);
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
