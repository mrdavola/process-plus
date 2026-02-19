"use client";

import { useState } from "react";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { createResponse } from "@/lib/firestore";
import { v4 as uuidv4 } from "uuid";

interface SubmitStateProps {
    videoBlobUrl: string;
    selfieBlob: Blob;
    topicId: string;
    topicTitle: string;
    userId: string;
    onSuccess: () => void;
}

export default function SubmitState({ videoBlobUrl, selfieBlob, topicId, topicTitle, userId, onSuccess }: SubmitStateProps) {
    const [displayName, setDisplayName] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = displayName.trim();
        if (!trimmedName) return;
        if (trimmedName.length > 60) return;

        setIsUploading(true);
        setError(null);

        try {
            setUploadProgress("Preparing video...");
            const videoRes = await fetch(videoBlobUrl);
            const videoBlob = await videoRes.blob();

            setUploadProgress("Uploading video...");
            const videoStorageRef = ref(storage, `videos/${uuidv4()}.webm`);
            await uploadBytes(videoStorageRef, videoBlob);
            const videoDownloadUrl = await getDownloadURL(videoStorageRef);

            setUploadProgress("Uploading thumbnail...");
            const selfieStorageRef = ref(storage, `thumbnails/${uuidv4()}.jpg`);
            await uploadBytes(selfieStorageRef, selfieBlob);
            const selfieDownloadUrl = await getDownloadURL(selfieStorageRef);

            setUploadProgress("Saving response...");
            await createResponse({
                topicId,
                userId,
                userDisplayName: trimmedName,
                videoUrl: videoDownloadUrl,
                thumbnailUrl: selfieDownloadUrl,
                status: "active",
                views: 0,
                reactions: [],
                createdAt: Date.now(),
            });

            setDone(true);
            setTimeout(onSuccess, 1500);

        } catch (err: unknown) {
            console.error("Upload error:", err);
            setError(err instanceof Error ? err.message : "Failed to upload. Please try again.");
        } finally {
            setIsUploading(false);
            setUploadProgress("");
        }
    };

    if (done) {
        return (
            <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <CheckCircle size={72} className="text-emerald-500" />
                    <h2 className="text-2xl font-black text-white">Submitted!</h2>
                    <p className="text-white/60">Your response is live on the grid.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl text-center">
                <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Upload size={32} />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit to {topicTitle}</h2>
                <p className="text-gray-500 mb-8">Almost there! Add your name so everyone knows it&apos;s you.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-left text-xs font-bold uppercase text-gray-400 mb-1 ml-1">Display Name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="First Name Last Initial"
                            maxLength={60}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-gray-900 font-medium"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {isUploading && uploadProgress && (
                        <p className="text-sm text-sky-500 font-medium">{uploadProgress}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isUploading || !displayName.trim()}
                        className="w-full py-4 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all"
                    >
                        {isUploading ? "Uploading..." : "Submit Video"}
                    </button>
                </form>
            </div>
        </div>
    );
}
