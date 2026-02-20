"use client";

import Link from "next/link";
import { Video, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { usePathname } from "next/navigation";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
    const { user, loading } = useAuth();
    const pathname = usePathname();

    const isHome = pathname === "/";

    return (
        <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 group transition-opacity hover:opacity-80">
                    <div className="flex items-center justify-center size-10 rounded-xl bg-sky-100 text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                        <Video size={24} className="fill-current" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">
                        Flipgrid <span className="text-sky-500">Rebuild</span>
                    </span>
                </Link>

                <div className="flex items-center gap-4">
                    {!loading && (
                        <>
                            {user ? (
                                <div className="flex items-center gap-4">
                                    {!pathname.includes("/dashboard") && (
                                        <Link href="/dashboard" className="text-sm font-bold text-sky-500 hover:text-sky-600 transition-colors hidden sm:block">
                                            My Dashboard
                                        </Link>
                                    )}
                                    <NotificationBell />
                                    <div className="flex items-center gap-3 border-l border-slate-200 pl-4 ml-2">
                                        <div className="flex items-center gap-2">
                                            <div className="size-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
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
                                    <Link href="/login" className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold rounded-xl shadow-md shadow-sky-500/20 transition-all hover:-translate-y-0.5">
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
