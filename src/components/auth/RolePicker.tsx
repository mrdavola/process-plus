"use client";

import { useState } from "react";
import { GraduationCap, BookOpen, Loader2 } from "lucide-react";
import { updateUserRole } from "@/lib/firestore";
import { UserRole } from "@/lib/types";

interface RolePickerProps {
    uid: string;
    onComplete: (role: UserRole) => void;
}

export default function RolePicker({ uid, onComplete }: RolePickerProps) {
    const [saving, setSaving] = useState(false);

    const handlePick = async (role: UserRole) => {
        setSaving(true);
        await updateUserRole(uid, role);
        onComplete(role);
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#FDF6EC] flex flex-col items-center justify-center p-6">
            <div className="max-w-xl w-full text-center mb-10">
                <h1 className="text-4xl font-bold text-brand-warm mb-3">Welcome to Process+</h1>
                <p className="text-brand-slate text-lg">How will you use Process+?</p>
            </div>

            {saving ? (
                <Loader2 className="animate-spin text-brand-amber" size={40} />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl">
                    <button
                        onClick={() => handlePick("teacher")}
                        className="flex flex-col items-center gap-4 p-8 bg-white rounded-3xl border-2 border-brand-amber/20 hover:border-brand-amber hover:shadow-lg transition-all group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-brand-cream flex items-center justify-center group-hover:scale-110 transition-transform">
                            <GraduationCap size={36} style={{ color: '#c2410c' }} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-brand-warm">I&apos;m a Teacher</p>
                            <p className="text-brand-slate text-sm mt-1">Manage studios and review student responses</p>
                        </div>
                    </button>

                    <button
                        onClick={() => handlePick("student")}
                        className="flex flex-col items-center gap-4 p-8 bg-white rounded-3xl border-2 border-brand-amber/20 hover:border-brand-amber hover:shadow-lg transition-all group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-brand-cream flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BookOpen size={36} style={{ color: '#c2410c' }} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-brand-warm">I&apos;m a Student</p>
                            <p className="text-brand-slate text-sm mt-1">Record responses and track my learning journey</p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
