'use client';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="gradient-hero min-h-screen flex flex-col justify-between">
      {/* Top Navbar */}
      <nav className="h-16 border-b border-white/5 bg-[#111827]/80 backdrop-blur-md flex items-center justify-between px-8 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-xl">
            🦸
          </div>
          <span className="font-bold text-lg text-white">CivicLens AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/map" className="text-gray-400 hover:text-white transition-colors text-sm font-medium mr-4">
            Interactive Map
          </Link>
          <Link href="/login">
            <Button variant="outline" size="sm">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Body */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-4xl mx-auto space-y-8 z-10">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full animate-pulse-glow">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] inline-block" />
          AI-Powered Civic Intelligence
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight">
          Your City. <br />
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Your Voice. Our AI.
          </span>
        </h1>

        <p className="text-gray-400 text-sm sm:text-base max-w-xl leading-relaxed">
          Report potholes, garbage dumps, or water leakages instantly. Captured by geolocation, checked for authenticity by AI, and routed directly to city departments.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="px-8 shadow-lg shadow-blue-500/20">
              🚀 Report an Issue
            </Button>
          </Link>
          <Link href="/map">
            <Button variant="outline" size="lg" className="px-8">
              🗺️ Browse Public Map
            </Button>
          </Link>
        </div>
      </section>

      {/* Highlights Grid */}
      <section className="p-6 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 z-10">
        {[
          { icon: '🤖', title: 'Hybrid AI Pipeline', desc: 'Auto-classifies, assesses severity, and routes reports using Gemini.' },
          { icon: '🔍', title: 'Fake Report Filter', desc: 'Screens image metadata & context to detect screenshots or edits.' },
          { icon: '🏆', title: 'Citizen Rewards', desc: 'Earn points and climb local leaderboards for clean neighborhoods.' },
        ].map((f) => (
          <div key={f.title} className="glass-card p-5 rounded-2xl border border-white/5 space-y-2">
            <div className="text-3xl">{f.icon}</div>
            <h3 className="font-bold text-white text-base">{f.title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-white/5 text-center text-xs text-gray-500 z-10">
        &copy; {new Date().getFullYear()} CivicLens AI. Empowering local communities.
      </footer>
    </main>
  );
}
