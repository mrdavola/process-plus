"use client";

import { useState } from "react";
import { UserProfile, UserRole } from "@/lib/types";
import { updateUserRole } from "@/lib/firestore";

interface UserTableProps {
    users: UserProfile[];
}

const ROLE_OPTIONS: UserRole[] = ["student", "teacher", "admin"];

const ROLE_COLORS: Record<UserRole, string> = {
    student: "bg-blue-50 text-blue-700 border-blue-200",
    teacher: "bg-green-50 text-green-700 border-green-200",
    admin: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function UserTable({ users }: UserTableProps) {
    const [search, setSearch] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [localRoles, setLocalRoles] = useState<Record<string, UserRole>>({});
    const [error, setError] = useState<string | null>(null);

    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        return (u.displayName?.toLowerCase() ?? "").includes(q) || (u.email?.toLowerCase() ?? "").includes(q);
    });

    const handleRoleChange = async (uid: string, newRole: UserRole) => {
        setUpdatingId(uid);
        setError(null);
        try {
            await updateUserRole(uid, newRole);
            setLocalRoles(prev => ({ ...prev, [uid]: newRole }));
        } catch {
            setError("Failed to update role. Please try again.");
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="space-y-4">
            <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-amber"
            />
            {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>
            )}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-4 py-3 font-bold text-slate-600">Name</th>
                            <th className="text-left px-4 py-3 font-bold text-slate-600">Email</th>
                            <th className="text-left px-4 py-3 font-bold text-slate-600">Role</th>
                            <th className="text-left px-4 py-3 font-bold text-slate-600">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {filtered.map(u => {
                            const role = localRoles[u.uid] ?? u.role;
                            return (
                                <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-800">{u.displayName ?? "—"}</td>
                                    <td className="px-4 py-3 text-slate-500">{u.email ?? "—"}</td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={role}
                                            disabled={updatingId === u.uid}
                                            onChange={e => handleRoleChange(u.uid, e.target.value as UserRole)}
                                            className={`text-xs font-bold border rounded-full px-2.5 py-1 cursor-pointer disabled:opacity-50 ${ROLE_COLORS[role]}`}
                                        >
                                            {ROLE_OPTIONS.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">
                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No users found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-400">{filtered.length} of {users.length} users</p>
        </div>
    );
}
