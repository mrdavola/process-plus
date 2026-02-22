"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Sparkles } from "lucide-react";

export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user && !loading) {
            router.push("/dashboard");
        }
    }, [user, loading, router]);

    const handleGoogleLogin = async () => {
        setIsLoggingIn(true);
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            router.push("/dashboard");
        } catch (err: any) {
            console.error("Login failed:", err);
            setError("Failed to sign in with Google. Please try again.");
            setIsLoggingIn(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-cream">
                <Loader2 className="animate-spin text-brand-amber" size={32} />
            </div>
        );
    }

    if (user) return null;

    return (
        <div className="min-h-screen bg-brand-cream flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="size-14 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: '#c2410c' }}>
                        <Sparkles size={28} />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-brand-warm">
                    Sign in to Process+
                </h2>
                <p className="mt-2 text-center text-sm text-brand-slate">
                    Educators — sign in to manage your studio
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-brand-amber/10">
                    {error && (
                        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoggingIn}
                        className="w-full flex justify-center items-center py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
                        style={{ backgroundColor: '#c2410c' }}
                    >
                        {isLoggingIn ? (
                            <Loader2 className="animate-spin mr-2" size={20} />
                        ) : (
                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                                />
                            </svg>
                        )}
                        {isLoggingIn ? "Signing in..." : "Sign in with Google"}
                    </button>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-brand-amber/20" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-white text-brand-slate font-medium">
                                    Students
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <a
                                href="/join"
                                className="w-full inline-flex justify-center py-3 px-4 border border-brand-amber/30 rounded-xl bg-brand-cream text-sm font-bold text-brand-warm hover:border-brand-amber transition-all"
                            >
                                Enter a ProcessPlus Code
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
