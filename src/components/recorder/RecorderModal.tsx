
"use client";

import { useState } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { X } from "lucide-react";

import IdleState from "./IdleState";
import RecordingState from "./RecordingState";
import ReviewState from "./ReviewState";
import SelfieState from "./SelfieState";
import SubmitState from "./SubmitState";

type RecorderState = "IDLE" | "RECORDING" | "REVIEW" | "SELFIE" | "SUBMIT";

interface RecorderModalProps {
    isOpen: boolean;
    onClose: () => void;
    topicTitle: string;
    promptText: string;
    // Optional props for Firebase integration (wired in TopicPage)
    topicId?: string;
    maxDuration?: number;
    userId?: string;
}

export default function RecorderModal({ isOpen, onClose, topicTitle, promptText }: RecorderModalProps) {
    const [recorderState, setRecorderState] = useState<RecorderState>("IDLE");
    const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);

    const { status, startRecording, stopRecording, pauseRecording, resumeRecording, mediaBlobUrl, clearBlobUrl, previewStream } =
        useReactMediaRecorder({ video: true, askPermissionOnMount: true });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-5xl h-full max-h-[90vh] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">

                {/* Header / Controls Overlay */}
                {recorderState !== "SUBMIT" && (
                    <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 pointer-events-none">
                        <div className="pointer-events-auto">
                            {/* Sticky Note / Prompt */}
                            <div className="bg-[#FFDD00] text-black p-4 rounded-xl shadow-lg rotate-[-2deg] max-w-xs cursor-move hover:rotate-0 transition-transform duration-300">
                                <h3 className="font-bold text-sm uppercase tracking-wider mb-1 opacity-70">Prompt</h3>
                                <p className="font-medium leading-snug">{promptText}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="pointer-events-auto bg-black/40 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>
                )}

                {/* State Machine */}
                <div className="flex-1 relative bg-gray-900">
                    {recorderState === "IDLE" && (
                        <IdleState
                            onRecord={() => {
                                setRecorderState("RECORDING");
                                startRecording();
                            }}
                        />
                    )}

                    {recorderState === "RECORDING" && (
                        <RecordingState
                            status={status}
                            previewStream={previewStream}
                            startRecording={startRecording}
                            stopRecording={stopRecording}
                            pauseRecording={pauseRecording}
                            resumeRecording={resumeRecording}
                            onFinish={() => setRecorderState("REVIEW")}
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

                    {recorderState === "SUBMIT" && (
                        <SubmitState
                            videoBlobUrl={mediaBlobUrl!}
                            selfieBlob={selfieBlob!}
                            topicTitle={topicTitle}
                            onSuccess={() => {
                                onClose();
                                // Optional: Trigger a refresh or toast
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
