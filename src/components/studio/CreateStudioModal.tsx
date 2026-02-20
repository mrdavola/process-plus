"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createStudio } from "@/lib/firestore";
import { Studio } from "@/lib/types";

interface CreateStudioModalProps {
    ownerId: string;
    onClose: () => void;
    onCreated: (studio: Studio) => void;
}

export default function CreateStudioModal({ ownerId, onClose, onCreated }: CreateStudioModalProps) {
    const [title, setTitle] = useState("");
    const [processPlusCode, setProcessPlusCode] = useState("");
    const [accessType, setAccessType] = useState<"domain" | "public">("public");
    const [domain, setDomain] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !processPlusCode.trim()) return;
        setBusy(true);
        setError(null);
        try {
            const studioData: Omit<Studio, "id"> = {
                ownerId,
                title: title.trim(),
                processPlusCode: processPlusCode.trim().toLowerCase(),
                allowedEmailDomains: accessType === "domain" && domain.trim() ? [domain.trim()] : [],
                theme: "default",
                coPilots: [],
                status: "active",
                settings: {
                    allowGuestAccess: true,
                    moderation: false,
                },
                createdAt: Date.now(),
            };
            const id = await createStudio(studioData);
            onCreated({ id, ...studioData });
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to create studio");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-slate-900">New Studio</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Studio Name</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Mr. Davola's History Class"
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-amber text-slate-900"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">ProcessPlus Code (Join Code)</label>
                        <input
                            type="text"
                            value={processPlusCode}
                            onChange={e => setProcessPlusCode(e.target.value.replace(/\s/g, ""))}
                            placeholder="davola2025"
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-amber text-slate-900 font-mono"
                        />
                        <p className="text-xs text-slate-400 mt-1">Students will use this to join. Lowercase, no spaces.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Access Type</label>
                        <div className="studio studio-cols-2 gap-3">
                            {(["public", "domain"] as const).map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setAccessType(type)}
                                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-colors ${accessType === type
                                            ? "border-brand-amber bg-brand-amber/5 text-brand-amber/90"
                                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                                        }`}
                                >
                                    {type === "public" ? "Public / PLC" : "School Domain"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {accessType === "domain" && (
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Allowed Email Domain</label>
                            <input
                                type="text"
                                value={domain}
                                onChange={e => setDomain(e.target.value)}
                                placeholder="@schools.org"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-amber text-slate-900"
                            />
                        </div>
                    )}

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={busy || !title.trim() || !processPlusCode.trim()}
                        className="w-full py-3 bg-brand-amber hover:bg-brand-amber/90 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
                    >
                        {busy ? "Creating..." : "Create Studio"}
                    </button>
                </form>
            </div>
        </div>
    );
}
