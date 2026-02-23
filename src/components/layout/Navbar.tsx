"use client";

import Link from "next/link";
import { Video, LogOut, BookOpen, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { usePathname } from "next/navigation";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
    const { user, profile, loading } = useAuth();
    const pathname = usePathname();

    const isHome = pathname === "/";

    return (
        <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 group transition-opacity hover:opacity-80">
                    <div className="flex items-center justify-center size-10 rounded-xl bg-brand-amber/20 text-brand-amber group-hover:bg-brand-amber group-hover:text-brand-warm transition-colors">
                        <Video size={24} className="fill-current" />
                    </div>
                    <span className="text-2xl font-display tracking-tight text-brand-warm">
                        Process<span className="text-brand-amber">+</span>
                    </span>
                </Link>

                <div className="flex items-center gap-4">
                    {!loading && (
                        <>
                            {user ? (
                                <div className="flex items-center gap-4">
                                    {!pathname.includes("/dashboard") && (
                                        <Link href="/dashboard" className="text-sm font-bold text-brand-amber bg-brand-cream px-3 py-1.5 rounded-lg hover:bg-brand-amber/10 transition-colors">
                                            My Dashboard
                                        </Link>
                                    )}
                                    {!pathname.includes("/journey") && !pathname.startsWith("/j/") && (
                                        <Link href="/journey" className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                                            <BookOpen size={15} />
                                            My Journey
                                        </Link>
                                    )}
                                    {profile?.role === "admin" && !pathname.startsWith("/admin") && (
                                        <Link href="/admin" className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-purple-600 hover:text-purple-800 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors">
                                            <Shield size={15} />
                                            Admin
                                        </Link>
                                    )}
                                    <NotificationBell />
                                    <div className="flex items-center gap-3 border-l border-slate-200 pl-4 ml-2">
                                        <div className="flex items-center gap-2">
                                            <div className="size-8 rounded-full bg-brand-amber/20 text-brand-amber flex items-center justify-center font-bold">
                                                {user.displayName?.charAt(0).toUpperCase() || "U"}
                                            </div>
                                            <span className="text-sm font-medium text-slate-700 hidden sm:block">
                                                {user.displayName}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => auth.signOut()}
                                            className="p-2 text-slate-500 hover:text-red-600 transition-colors"
                                            title="Sign Out"
                                        >
                                            <LogOut size={20} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-slate-900 px-4 py-2 hidden sm:block">
                                        Educator Login
                                    </Link>
                                    <Link href="/login" className="px-5 py-2 bg-brand-amber hover:bg-brand-amber/90 text-brand-warm text-sm font-bold rounded-xl shadow-md shadow-brand-amber/20 transition-all hover:-translate-y-0.5">
                                        Sign Up
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
