
"use client";

import Link from "next/link";
import { ArrowRight, Video, Users, Sparkles } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { findDestinationByCode } from "@/lib/firestore";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const router = useRouter();
  const { user } = useAuth();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsJoining(true);
    setJoinError("");
    try {
      const dest = await findDestinationByCode(joinCode);
      if (dest) {
        router.push(dest);
      } else {
        setJoinError("Code not found. Check your code and try again.");
      }
    } catch (err) {
      setJoinError("An error occurred. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-cream text-brand-warm selection:bg-brand-amber/30">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-amber/10 text-brand-amber text-sm font-bold mb-8 border border-brand-amber/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles size={16} />
            <span>The classic experience is back</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-display tracking-tight text-brand-warm mb-8 max-w-4xl mx-auto leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            Empower every voice with <span className="text-brand-amber">video discussion.</span>
          </h1>

          <p className="text-xl text-brand-slate max-w-2xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            Simple, free, and accessible video discussions for educators, learners, and families. Engage your community with the power of video.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-1000 delay-300">
            <form onSubmit={handleJoin} className="w-full sm:w-auto flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter Join Code"
                className="w-full sm:w-64 px-6 py-4 bg-white border-2 border-slate-200 text-brand-warm rounded-xl font-bold text-center text-xl uppercase tracking-widest focus:outline-none focus:border-brand-amber focus:ring-4 focus:ring-brand-amber/20 transition-all placeholder:normal-case placeholder:tracking-normal placeholder:font-normal placeholder:text-brand-slate"
                maxLength={10}
              />
              <button
                type="submit"
                disabled={isJoining || !joinCode.trim()}
                className="w-full sm:w-auto px-8 py-4 bg-brand-amber hover:bg-brand-amber/90 disabled:bg-brand-amber/50 text-white text-lg font-bold rounded-xl shadow-xl shadow-brand-amber/20 flex items-center justify-center gap-2 transition-all hover:-translate-y-1"
              >
                {isJoining ? "Joining..." : "Join"}
                {!isJoining && <ArrowRight size={20} strokeWidth={3} />}
              </button>
            </form>
            {joinError && <p className="text-red-500 font-bold mt-2 animate-in fade-in">{joinError}</p>}

            {user && (
              <div className="mt-8">
                <Link href="/dashboard" className="px-8 py-4 bg-white border-2 border-brand-amber/20 text-brand-amber hover:bg-brand-amber/5 text-lg font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-1">
                  Go to Dashboard <ArrowRight size={20} strokeWidth={3} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Background decorations */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-72 h-72 bg-brand-amber rounded-full blur-3xl opacity-10 animate-blob" />
          <div className="absolute top-1/4 -right-20 w-72 h-72 bg-amber-400 rounded-full blur-3xl opacity-10 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-32 left-1/3 w-72 h-72 bg-orange-300 rounded-full blur-3xl opacity-10 animate-blob animation-delay-4000" />
        </div>
      </section>

      <section className="py-24 bg-white border-t border-brand-amber/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="studio md:studio-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-brand-cream rounded-2xl flex items-center justify-center text-brand-amber mb-6">
                <Video size={28} />
              </div>
              <h3 className="text-xl font-bold text-brand-warm mb-3">Video Recorder</h3>
              <p className="text-brand-slate leading-relaxed">
                A powerful recorder with pause/resume, stitching, and a dedicated selfie mode for custom thumbnails.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-brand-amber/10 rounded-2xl flex items-center justify-center text-brand-amber mb-6">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-bold text-brand-warm mb-3">Community Studio</h3>
              <p className="text-brand-slate leading-relaxed">
                See everyone&apos;s responses in a beautiful masonry studio. Watch, react, and connect with your class.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6">
                <Sparkles size={28} />
              </div>
              <h3 className="text-xl font-bold text-brand-warm mb-3">Creative Tools</h3>
              <p className="text-brand-slate leading-relaxed">
                Express yourself with text, drawing, stickers, and emojis directly on your video and selfie.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
