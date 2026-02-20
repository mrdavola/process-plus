"use client";

import { useState } from "react";
import { X, Image as ImageIcon, Clock, CalendarIcon, ShieldCheck, MessageSquare, RefreshCw } from "lucide-react";
import { Topic, TopicStatus } from "@/lib/types";
import EmojiPicker from "emoji-picker-react";

interface TopicSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    topic: Topic;
    onSave: (id: string, updates: Partial<Topic>) => Promise<void>;
}

const Toggle = ({ checked, onChange, title, description }: { checked: boolean; onChange: (c: boolean) => void; title: string; description?: string }) => (
    <label className="flex items-center justify-between cursor-pointer py-2">
        <div>
            <h4 className="font-bold text-slate-900">{title}</h4>
            {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        <div className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ml-4 ${checked ? 'bg-sky-500' : 'bg-slate-300'}`}>
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
            <div className={`absolute top-1 left-1 bg-white size-4 rounded-full transition-transform ${checked ? 'translate-x-6' : ''}`} />
        </div>
    </label>
);

export default function TopicSettingsModal({ isOpen, onClose, topic, onSave }: TopicSettingsModalProps) {
    const [title, setTitle] = useState(topic.title);
    const [promptText, setPromptText] = useState(topic.promptText);
    const [topicTip, setTopicTip] = useState(topic.topicTip || "");
    const [icon, setIcon] = useState(topic.icon || "");
    const [mediaUrl, setMediaUrl] = useState(topic.mediaResource?.url || "");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Recording Settings
    const [maxDuration, setMaxDuration] = useState(topic.settings.maxDuration ?? 120);
    const [micOnly, setMicOnly] = useState(topic.settings.micOnly ?? false);
    const [uploadClip, setUploadClip] = useState(topic.settings.uploadClip ?? true);
    const [pauseResume, setPauseResume] = useState(topic.settings.pauseResume ?? true);
    const [selfieDecorations, setSelfieDecorations] = useState(topic.settings.selfieDecorations ?? true);

    // Visibility
    const [status, setStatus] = useState<TopicStatus>(topic.status);
    const [scheduledRelease, setScheduledRelease] = useState(topic.scheduledRelease ? new Date(topic.scheduledRelease).toISOString().substring(0, 10) : "");
    const [closeDate, setCloseDate] = useState(topic.closeDate ? new Date(topic.closeDate).toISOString().substring(0, 10) : "");

    // Safety & Interaction
    const [moderation, setModeration] = useState(topic.settings.moderation ?? false);
    const [studentReplies, setStudentReplies] = useState(topic.settings.studentReplies ?? false);
    const [videoReactions, setVideoReactions] = useState(topic.settings.videoReactions ?? true);
    const [guestCode, setGuestCode] = useState(topic.settings.guestCode || "");

    // Feedback
    const [feedbackType, setFeedbackType] = useState<"basic" | "rubric" | "none">(topic.settings.feedbackType ?? "none");
    const [privateFeedback, setPrivateFeedback] = useState(topic.settings.privateFeedback ?? false);

    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(topic.id, {
                title,
                promptText,
                topicTip: topicTip.trim() || undefined,
                icon,
                status,
                scheduledRelease: scheduledRelease ? new Date(scheduledRelease).getTime() : undefined,
                closeDate: closeDate ? new Date(closeDate).getTime() : undefined,
                mediaResource: mediaUrl.trim() ? { type: mediaUrl.includes("youtube.com") || mediaUrl.includes("youtu.be") ? "youtube" : mediaUrl.includes(".gif") ? "giphy" : "image", url: mediaUrl.trim() } : undefined,
                settings: {
                    ...topic.settings,
                    maxDuration,
                    micOnly,
                    uploadClip,
                    pauseResume,
                    selfieDecorations,
                    moderation,
                    studentReplies,
                    videoReactions,
                    guestCode: guestCode.trim() || undefined,
                    feedbackType,
                    privateFeedback
                }
            });
            onClose();
        } catch (error) {
            console.error("Failed to save topic settings", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="sticky top-0 bg-white/80 backdrop-blur border-b border-slate-100 flex items-center justify-between px-6 py-4 z-20">
                    <h2 className="text-xl font-black text-slate-900">Edit Topic Settings</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-10">

                    {/* 1. Content Settings */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">1. Content Settings</h3>
                        <p className="text-sm text-slate-500 mb-4">These control what students see before recording.</p>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Topic Icon / Emoji</label>
                                <div className="flex gap-2 relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowEmojiPicker(prev => !prev)}
                                        className="size-12 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-2xl border border-slate-200 hover:bg-slate-200 transition-colors"
                                    >
                                        {icon || <ImageIcon size={20} className="text-slate-400" />}
                                    </button>
                                    <input
                                        type="text"
                                        value={icon}
                                        onChange={(e) => setIcon(e.target.value)}
                                        placeholder="Optional emoji or small icon 🚀"
                                        maxLength={2}
                                        className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-black focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-bold"
                                    />
                                    {showEmojiPicker && (
                                        <div className="absolute top-14 left-0 z-50 shadow-xl rounded-xl">
                                            <EmojiPicker onEmojiClick={(emojiData) => { setIcon(emojiData.emoji); setShowEmojiPicker(false); }} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-black focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-bold"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Prompt Text (Rich Text)</label>
                                <textarea
                                    value={promptText}
                                    onChange={(e) => setPromptText(e.target.value)}
                                    placeholder="Full description of the assignment..."
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-black focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all min-h-[100px]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Topic Tip (Optional)</label>
                                <input
                                    type="text"
                                    value={topicTip}
                                    onChange={(e) => setTopicTip(e.target.value)}
                                    placeholder="e.g., Use 2 pieces of evidence"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-black focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Media Resource URL (Optional)</label>
                                <input
                                    type="text"
                                    value={mediaUrl}
                                    onChange={(e) => setMediaUrl(e.target.value)}
                                    placeholder="Paste a YouTube, Image, or GIF link here"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-black focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-medium"
                                />
                                <p className="text-xs text-slate-500 ml-1 mt-1">Teachers can embed a YouTube link, an image, or a GIF as the prompt stimulus.</p>
                            </div>
                        </div>
                    </section>

                    {/* 2. Recording Rules */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">2. Recording Rules</h3>
                        <p className="text-sm text-slate-500 mb-4">These control how students record.</p>

                        <div className="space-y-3 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                            <div className="flex items-center justify-between py-2 border-b border-slate-200">
                                <div>
                                    <h4 className="font-bold text-slate-900 flex items-center gap-2"><Clock size={16} className="text-sky-500" /> Max Recording Duration</h4>
                                    <p className="text-sm text-slate-500">Applies only to future recordings.</p>
                                </div>
                                <select
                                    value={maxDuration}
                                    onChange={(e) => setMaxDuration(Number(e.target.value))}
                                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                                >
                                    <option value={15}>15 seconds</option>
                                    <option value={30}>30 seconds</option>
                                    <option value={60}>1 minute</option>
                                    <option value={90}>1.5 minutes</option>
                                    <option value={180}>3 minutes</option>
                                    <option value={300}>5 minutes</option>
                                </select>
                            </div>

                            <Toggle title="Mic-Only Mode" description="Students can submit audio-only responses." checked={micOnly} onChange={setMicOnly} />
                            <Toggle title="Upload Clip" description="Students can import pre-recorded videos." checked={uploadClip} onChange={setUploadClip} />
                            <Toggle title="Pause & Resume" description="Allows students to pause and continue recording." checked={pauseResume} onChange={setPauseResume} />
                            <Toggle title="Allow Selfie Decorations" description="Students can add stickers/drawing to thumbnail." checked={selfieDecorations} onChange={setSelfieDecorations} />
                        </div>
                    </section>

                    {/* 3. Visibility & Status */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">3. Visibility & Status</h3>

                        <div className="space-y-5 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <label className={`flex flex-col items-center justify-center cursor-pointer p-4 rounded-xl border-2 transition-all ${status === "active" ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                                    <input type="radio" value="active" checked={status === "active"} onChange={() => setStatus("active")} className="sr-only" />
                                    <span className="font-bold text-slate-900 mb-1">Active</span>
                                    <span className="text-xs text-slate-500 text-center">Can view & record</span>
                                </label>
                                <label className={`flex flex-col items-center justify-center cursor-pointer p-4 rounded-xl border-2 transition-all ${status === "frozen" ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                                    <input type="radio" value="frozen" checked={status === "frozen"} onChange={() => setStatus("frozen")} className="sr-only" />
                                    <span className="font-bold text-slate-900 mb-1">Frozen</span>
                                    <span className="text-xs text-slate-500 text-center">View only</span>
                                </label>
                                <label className={`flex flex-col items-center justify-center cursor-pointer p-4 rounded-xl border-2 transition-all ${status === "hidden" ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                                    <input type="radio" value="hidden" checked={status === "hidden"} onChange={() => setStatus("hidden")} className="sr-only" />
                                    <span className="font-bold text-slate-900 mb-1">Hidden</span>
                                    <span className="text-xs text-slate-500 text-center">Invisible to students</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1 ml-1 flex items-center gap-2"><CalendarIcon size={14} className="text-slate-400" /> Scheduled Release</label>
                                    <input type="date" value={scheduledRelease} onChange={(e) => setScheduledRelease(e.target.value)} className="w-full px-4 py-2 rounded-xl border-2 border-slate-100 bg-white text-slate-700 focus:border-sky-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1 ml-1 flex items-center gap-2"><CalendarIcon size={14} className="text-slate-400" /> Close Date</label>
                                    <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} className="w-full px-4 py-2 rounded-xl border-2 border-slate-100 bg-white text-slate-700 focus:border-sky-500 outline-none" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 4. Safety & Interaction */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">4. Moderation & Safety Controls</h3>
                        <div className="space-y-3 bg-slate-50 rounded-2xl p-5 border border-slate-100">

                            <Toggle title="Video Moderation" description="New videos stay hidden until you approve them." checked={moderation} onChange={setModeration} />

                            <hr className="border-slate-200 my-2" />

                            <Toggle title="Student-to-Student Replies" description="Students can record video replies to other responses." checked={studentReplies} onChange={setStudentReplies} />
                            <Toggle title="Video Reactions" description="Students can like videos." checked={videoReactions} onChange={setVideoReactions} />

                            <hr className="border-slate-200 my-2" />

                            <div className="pt-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Guest Code Access</label>
                                <p className="text-sm text-slate-500 mb-2">Generate a topic-specific guest code to bypass domain restrictions.</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={guestCode}
                                        onChange={(e) => setGuestCode(e.target.value)}
                                        placeholder="Optional Guest Code"
                                        className="flex-1 px-4 py-2 rounded-xl border-2 border-slate-100 bg-white text-black focus:border-sky-500 outline-none font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setGuestCode(Math.random().toString(36).substring(2, 8).toLowerCase())}
                                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl flex items-center gap-2 transition-colors"
                                    >
                                        <RefreshCw size={16} /> Generate
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 5. Feedback Controls */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">5. Feedback Controls</h3>
                        <div className="space-y-4 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                            <div className="flex items-center justify-between py-2 border-b border-slate-200">
                                <div>
                                    <h4 className="font-bold text-slate-900 flex items-center gap-2"><MessageSquare size={16} className="text-sky-500" /> Feedback Type</h4>
                                </div>
                                <select
                                    value={feedbackType}
                                    onChange={(e) => setFeedbackType(e.target.value as "basic" | "rubric" | "none")}
                                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                                >
                                    <option value="none">None</option>
                                    <option value="basic">Basic (Ideas / Performance)</option>
                                    <option value="rubric">Custom Rubric</option>
                                </select>
                            </div>

                            <Toggle title="Private Feedback" description="Allow teacher-only comments/video feedback." checked={privateFeedback} onChange={setPrivateFeedback} />
                        </div>
                    </section>


                    {/* Actions */}
                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 sticky bottom-0 bg-white py-4 z-10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-8 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                        >
                            {isSaving ? "Saving..." : "Save Settings"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
