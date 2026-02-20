"use client";

import { useState } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import { Studio } from "@/lib/types";
import EmojiPicker from "emoji-picker-react";

interface StudioSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    studio: Studio;
    onSave: (id: string, updates: Partial<Studio>) => Promise<void>;
}

export default function StudioSettingsModal({ isOpen, onClose, studio, onSave }: StudioSettingsModalProps) {
    const [title, setTitle] = useState(studio.title);
    const [icon, setIcon] = useState(studio.icon || "");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [processPlusCode, setProcessPlusCode] = useState(studio.processPlusCode);

    // Access Controls
    const [password, setPassword] = useState(studio.password || "");
    const [allowedEmailDomains, setAllowedEmailDomains] = useState(studio.allowedEmailDomains?.join(", ") || "");
    const [allowGuestAccess, setAllowGuestAccess] = useState(studio.settings?.allowGuestAccess ?? true);

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(studio.id, {
                title,
                icon,
                processPlusCode: processPlusCode.toLowerCase().replace(/[^a-z0-9]/g, ""), // Sanitize code
                password: password.trim() || undefined,
                allowedEmailDomains: allowedEmailDomains.split(",").map(d => d.trim()).filter(Boolean),
                settings: {
                    ...studio.settings,
                    allowGuestAccess
                }
            });
            onClose();
        } catch (error: any) {
            console.error("Failed to save studio settings", error);
            setError(error.message || "Failed to save settings. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100">
                    <h2 className="text-xl font-black text-slate-900">Edit Studio Settings</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Studio Icon (Emoji)</label>
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
                                placeholder="Pick an emoji 📚"
                                maxLength={2}
                                className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-black focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-bold"
                            />
                            {showEmojiPicker && (
                                <div className="absolute top-14 left-0 z-50">
                                    <EmojiPicker
                                        onEmojiClick={(emojiData) => {
                                            setIcon(emojiData.emoji);
                                            setShowEmojiPicker(false);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Studio Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-black focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-bold"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">ProcessPlus Code (Join Code)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={processPlusCode}
                                onChange={(e) => setProcessPlusCode(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-sky-600 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-mono font-bold lowercase"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-2 ml-1">
                                Students will use this code to join your studio. Only letters and numbers.
                            </p>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Access Controls</h3>
                        <div className="space-y-4 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Allowed Email Domains</label>
                                <input
                                    type="text"
                                    value={allowedEmailDomains}
                                    onChange={(e) => setAllowedEmailDomains(e.target.value)}
                                    placeholder="e.g. schools.edu, district.org"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-black focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-medium placeholder:text-slate-400"
                                />
                                <p className="text-xs text-slate-500 mt-2 ml-1">
                                    Separate multiple domains with commas. Leave blank to allow anyone with the code.
                                </p>
                            </div>

                            <div className="pt-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Studio Password (Optional)</label>
                                <input
                                    type="text"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Set a secret password"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-black focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all font-medium placeholder:text-slate-400"
                                />
                            </div>

                            <hr className="border-slate-200 my-4" />

                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <h4 className="font-bold text-slate-900">Guest Access</h4>
                                    <p className="text-sm text-slate-500">Allow parents or guests to view/record without an account.</p>
                                </div>
                                <div className={`w-12 h-6 rounded-full transition-colors relative ${allowGuestAccess ? 'bg-sky-500' : 'bg-slate-300'}`}>
                                    <input
                                        type="checkbox"
                                        checked={allowGuestAccess}
                                        onChange={(e) => setAllowGuestAccess(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`absolute top-1 left-1 bg-white size-4 rounded-full transition-transform ${allowGuestAccess ? 'translate-x-6' : ''}`} />
                                </div>
                            </label>
                        </div>
                    </section>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
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
