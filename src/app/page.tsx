"use client";

import Link from "next/link";
import { ArrowRight, Video, Users, Sparkles, BookOpen, Clock, MessageSquare, Brain } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { findDestinationByCode } from "@/lib/firestore";
import { useAuth } from "@/lib/auth-context";

const ORANGE = "#c2410c";

const reflectionQuestions = [
  { phase: "Starting Point", q: "What did you think this would be like before you started?" },
  { phase: "Starting Point", q: "What was your plan going in?" },
  { phase: "Starting Point", q: "What were you most unsure about at the beginning?" },
  { phase: "The Shift", q: "What surprised you while you were working?" },
  { phase: "The Shift", q: "What was your favorite mistake — and what did it teach you?" },
  { phase: "The Shift", q: "When did something click that didn't before?" },
  { phase: "Looking Back", q: "What are you most proud of in this Moment?" },
  { phase: "Looking Back", q: "What would you tell someone who was starting this for the first time?" },
  { phase: "Looking Back", q: "What does this work reveal about how you learn?" },
  { phase: "Next Step", q: "What question are you still sitting with?" },
  { phase: "Next Step", q: "What would version 2 of this look like?" },
  { phase: "Next Step", q: "What would you do differently if you started over?" },
];

const phaseColors: Record<string, string> = {
  "Starting Point": "bg-blue-50 text-blue-700 border-blue-100",
  "The Shift": "bg-amber-50 text-amber-700 border-amber-100",
  "Looking Back": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "Next Step": "bg-purple-50 text-purple-700 border-purple-100",
};

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
    } catch {
      setJoinError("An error occurred. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-cream text-brand-warm selection:bg-orange-100">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-8 border animate-in fade-in slide-in-from-bottom-4 duration-700"
            style={{ backgroundColor: '#fff8f2', borderColor: '#fdba74', color: ORANGE }}>
            <Sparkles size={16} />
            <span>Document the process, not just the product</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-display tracking-tight text-brand-warm mb-6 max-w-4xl mx-auto leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            Video as voice.{" "}
            <span style={{ color: ORANGE }}>Video as thinking.</span>
          </h1>

          <p className="text-xl text-brand-slate max-w-2xl mx-auto mb-4 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            Process+ is a classroom video community built on a simple belief: the journey of learning matters as much as the destination.
            Students record, reflect, and grow — together.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 mt-10 animate-in fade-in zoom-in duration-1000 delay-300">
            <form onSubmit={handleJoin} className="w-full sm:w-auto flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter Join Code"
                className="w-full sm:w-64 px-6 py-4 bg-white border-2 border-slate-200 text-brand-warm rounded-xl font-bold text-center text-xl uppercase tracking-widest focus:outline-none transition-all placeholder:normal-case placeholder:tracking-normal placeholder:font-normal placeholder:text-brand-slate"
                style={{ outlineColor: ORANGE }}
                maxLength={10}
              />
              <button
                type="submit"
                disabled={isJoining || !joinCode.trim()}
                className="w-full sm:w-auto px-8 py-4 text-white text-lg font-bold rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-1 disabled:opacity-50"
                style={{ backgroundColor: ORANGE }}
              >
                {isJoining ? "Joining..." : "Join"}
                {!isJoining && <ArrowRight size={20} strokeWidth={3} />}
              </button>
            </form>
            {joinError && <p className="text-red-500 font-bold mt-2 animate-in fade-in">{joinError}</p>}

            {user && (
              <div className="mt-4">
                <Link href="/dashboard"
                  className="px-8 py-4 bg-white border-2 text-brand-warm text-lg font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-1"
                  style={{ borderColor: '#fdba74' }}>
                  My Dashboard <ArrowRight size={20} strokeWidth={3} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Background blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-72 h-72 bg-orange-200 rounded-full blur-3xl opacity-20 animate-blob" />
          <div className="absolute top-1/4 -right-20 w-72 h-72 bg-amber-200 rounded-full blur-3xl opacity-20 animate-blob" />
        </div>
      </section>

      {/* What is Process+ */}
      <section className="py-20 bg-white border-t border-orange-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display text-brand-warm mb-4">What is Process+?</h2>
            <p className="text-brand-slate max-w-2xl mx-auto text-lg leading-relaxed">
              Students record and upload videos — but what sets Process+ apart is the scaffolding built <em>around</em> those videos. It&apos;s not about the final product. It&apos;s about capturing the thinking that got you there.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: <Video size={28} />,
                title: "Video Responses",
                desc: "Students record video responses with pause/resume, stitching, and selfie mode for custom thumbnails. No polish required — authenticity over production value.",
              },
              {
                icon: <BookOpen size={28} />,
                title: "Structured Reflection",
                desc: "Every video can have structured prompts attached: What were you thinking when you started? What changed? What would you do differently? Reflection is built in, not bolted on.",
              },
              {
                icon: <MessageSquare size={28} />,
                title: "AI Conversation Threads",
                desc: "AI generates discussion threads from video content, giving students something to respond to beyond a blank comment box. Responses spark more responses.",
              },
              {
                icon: <Users size={28} />,
                title: "Community Studio",
                desc: "See everyone's responses in a masonry feed. Watch, react, and highlight moments that show real growth — not just the polished ones.",
              },
              {
                icon: <Brain size={28} />,
                title: "AI Feedback Coach",
                desc: "An AI coach offers formative observations — not grades. Questions and nudges that push thinking forward. Supportive, not evaluative.",
              },
              {
                icon: <Clock size={28} />,
                title: "Timeline Mode",
                desc: "Watch a student's understanding evolve across multiple videos over a unit or semester. Powerful for portfolio-based assessment and celebrating growth over time.",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-brand-cream p-7 rounded-2xl border border-orange-100 hover:border-orange-300 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white" style={{ backgroundColor: ORANGE }}>
                  {icon}
                </div>
                <h3 className="text-lg font-bold text-brand-warm mb-2">{title}</h3>
                <p className="text-brand-slate leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reflection Questions */}
      <section className="py-20 bg-brand-cream border-t border-orange-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display text-brand-warm mb-4">Built-in Reflection Prompts</h2>
            <p className="text-brand-slate max-w-xl mx-auto text-lg">
              Four phases of reflection that work for almost any student, any subject, any project.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reflectionQuestions.map(({ phase, q }) => (
              <div key={q} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border mb-3 ${phaseColors[phase]}`}>{phase}</span>
                <p className="text-brand-warm text-sm font-medium leading-relaxed">&ldquo;{q}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Mode Teaser */}
      <section className="py-20 bg-white border-t border-orange-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center gap-10 border border-orange-100"
            style={{ background: 'linear-gradient(135deg, #fff8f2 0%, #fef3c7 100%)' }}>
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-5"
                style={{ backgroundColor: '#fff', color: ORANGE, border: '1px solid #fdba74' }}>
                <Clock size={14} /> Coming Soon
              </div>
              <h2 className="text-3xl font-display text-brand-warm mb-4">Timeline Mode</h2>
              <p className="text-brand-slate leading-relaxed mb-6">
                Watch a student&apos;s thinking evolve across multiple videos over a unit or semester.
                Not just what they made — but who they became in the making. Teacher-curated &ldquo;moments&rdquo; that celebrate growth, not just polish.
                Powerful for portfolio-based assessment.
              </p>
              <p className="font-bold text-brand-slate text-sm italic">
                &ldquo;A timeline view where you can watch a student&apos;s understanding evolve across multiple videos.&rdquo;
              </p>
            </div>
            <div className="flex-shrink-0 w-full md:w-56">
              <div className="relative">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: ORANGE, borderColor: ORANGE, opacity: 0.5 + i * 0.17 }}>
                      {i + 1}
                    </div>
                    <div className="h-10 rounded-lg flex-1 border border-orange-100"
                      style={{ backgroundColor: `rgba(194, 65, 12, ${0.05 + i * 0.04})`, width: `${60 + i * 10}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 text-center bg-brand-cream border-t border-orange-100">
        <h2 className="text-3xl md:text-4xl font-display text-brand-warm mb-4">Ready to start?</h2>
        <p className="text-brand-slate text-lg mb-8 max-w-md mx-auto">
          Join your class with a code, or create a studio for your students.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {user ? (
            <Link href="/dashboard"
              className="px-10 py-4 text-white text-lg font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:-translate-y-1"
              style={{ backgroundColor: ORANGE }}>
              Go to My Dashboard <ArrowRight size={20} strokeWidth={3} />
            </Link>
          ) : (
            <Link href="/login"
              className="px-10 py-4 text-white text-lg font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:-translate-y-1"
              style={{ backgroundColor: ORANGE }}>
              Get Started Free <ArrowRight size={20} strokeWidth={3} />
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
