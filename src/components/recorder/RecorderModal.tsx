"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { X } from "lucide-react";

import IdleState from "./IdleState";
import PreviewState from "./PreviewState";
import CountdownState from "./CountdownState";
import RecordingState from "./RecordingState";
import ReviewState from "./ReviewState";
import SelfieState from "./SelfieState";
import SubmitState from "./SubmitState";

type RecorderState = "IDLE" | "PREVIEW" | "COUNTDOWN" | "RECORDING" | "REVIEW" | "SELFIE" | "SUBMIT";

interface RecorderModalProps {
    isOpen: boolean;
    onClose: () => void;
    topicId: string;
    topicTitle: string;
    promptText: string;
    maxDuration?: number;
    userId: string;
}

export default function RecorderModal({
    isOpen,
    onClose,
    topicId,
    topicTitle,
    promptText,
    maxDuration = 120,
    userId,
}: RecorderModalProps) {
    const [recorderState, setRecorderState] = useState<RecorderState>("IDLE");
    const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
    const previewStreamRef = useRef<MediaStream | null>(null);
    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

    const { status, startRecording, stopRecording, pauseRecording, resumeRecording, mediaBlobUrl, clearBlobUrl } =
        useReactMediaRecorder({ video: true, askPermissionOnMount: false });

    const stopCamera = useCallback(() => {
        previewStreamRef.current?.getTracks().forEach(t => t.stop());
        previewStreamRef.current = null;
        setPreviewStream(null);
    }, []);

    // Clean up on close or unmount
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            setRecorderState("IDLE");
            setSelfieBlob(null);
        }
    }, [isOpen, stopCamera]);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const openPreview = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
        // Stop the preview stream - react-media-recorder opens its own
        stopCamera();
        startRecording();
        setRecorderState("RECORDING");
    };

    const handleFinish = () => {
        stopRecording();
        setRecorderState("REVIEW");
    };

    if (!isOpen) return null;

    const showPromptOverlay = recorderState === "IDLE" || recorderState === "PREVIEW" || recorderState === "COUNTDOWN" || recorderState === "REVIEW";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-5xl h-full max-h-[90vh] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">

                {/* Header Overlay */}
                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 pointer-events-none">
                    {showPromptOverlay && (
                        <div className="pointer-events-auto">
                            <div className="bg-[#FFDD00] text-black p-4 rounded-xl shadow-lg rotate-[-2deg] max-w-xs hover:rotate-0 transition-transform duration-300">
                                <h3 className="font-bold text-xs uppercase tracking-wider mb-1 opacity-60">Prompt</h3>
                                <p className="font-medium leading-snug text-sm">{promptText}</p>
                            </div>
                        </div>
                    )}
                    {!showPromptOverlay && <div />}
                    <button
                        onClick={() => { stopCamera(); if (recorderState === "RECORDING") stopRecording(); onClose(); }}
                        className="pointer-events-auto bg-black/40 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* State Machine */}
                <div className="flex-1 relative bg-gray-900">
                    {recorderState === "IDLE" && (
                        <IdleState onRecord={openPreview} />
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

                    {recorderState === "RECORDING" && (
                        <RecordingState
                            status={status}
                            pauseRecording={pauseRecording}
                            resumeRecording={resumeRecording}
                            onFinish={handleFinish}
                            maxDuration={maxDuration}
                            promptText={promptText}
                        />
                    )}

                    {recorderState === "REVIEW" && (
                        <ReviewState
                            videoUrl={mediaBlobUrl || null}
                            onRetake={() => {
                                clearBlobUrl();
                                setRecorderState("IDLE");
                            }}
                            onConfirm={() => setRecorderState("SELFIE")}
                        />
                    )}

                    {recorderState === "SELFIE" && (
                        <SelfieState
                            onConfirm={(blob) => {
                                setSelfieBlob(blob);
                                setRecorderState("SUBMIT");
                            }}
                            onRetake={() => setRecorderState("REVIEW")}
                        />
                    )}

                    {recorderState === "SUBMIT" && mediaBlobUrl && selfieBlob && (
                        <SubmitState
                            videoBlobUrl={mediaBlobUrl}
                            selfieBlob={selfieBlob}
                            topicId={topicId}
                            topicTitle={topicTitle}
                            userId={userId}
                            onSuccess={() => {
                                onClose();
                                clearBlobUrl();
                                setRecorderState("IDLE");
                                setSelfieBlob(null);
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
