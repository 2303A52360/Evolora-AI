"use client";

import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Target,
  Mic,
  BarChart3,
  CheckCircle2,
  Code2,
  ClipboardCheck,
  Sparkles,
  Star,
  Zap,
  Shield,
  Brain,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   HERO
   Clear value proposition. Animated entrance. Product preview
   that actually shows what the app does.
   ══════════════════════════════════════════════════════════════════ */

function HeroSection() {
  return (
    <section className="pt-28 sm:pt-32 lg:pt-36 pb-16 sm:pb-20 overflow-hidden">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Social proof badge */}
        <div className="animate-fade-in-up flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-accent-subtle)] border border-[rgba(79,70,229,0.12)]">
            <div className="flex -space-x-1.5">
              {["#6366F1","#8B5CF6","#3B82F6","#10B981"].map((c,i) => (
                <div key={i} className="w-5 h-5 rounded-full border-2 border-white" style={{background:c}} />
              ))}
            </div>
            <span className="text-[12px] font-medium text-[var(--color-accent-text)]">
              Used by 2,400+ candidates preparing for FAANG interviews
            </span>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="animate-fade-in-up animation-delay-100 text-[36px] sm:text-[48px] lg:text-[56px] leading-[1.08] tracking-[-0.03em] font-bold text-[var(--color-ink-primary)]">
            Stop guessing what
            <br className="hidden sm:inline" />{" "}
            <span className="text-[var(--color-accent)]">they&apos;ll ask you.</span>
          </h1>

          <p className="animate-fade-in-up animation-delay-200 mt-5 text-[16px] sm:text-[18px] text-[var(--color-ink-secondary)] max-w-xl mx-auto leading-relaxed">
            Paste a job description. Get AI-generated MCQs, coding challenges,
            and voice mock interviews tailored to the exact role.
          </p>

          <div className="animate-fade-in-up animation-delay-300 mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              id="hero-cta-primary"
              className="btn-primary text-[14px] px-6 py-2.5"
            >
              Start preparing — it&apos;s free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#how-it-works" className="btn-secondary text-[14px] px-5 py-2.5">
              See how it works
            </a>
          </div>

          {/* Trust signals */}
          <div className="animate-fade-in-up animation-delay-400 mt-6 flex items-center justify-center gap-4 text-[12px] text-[var(--color-ink-tertiary)]">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" /> No credit card</span>
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Private & secure</span>
            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Results in seconds</span>
          </div>
        </div>

        {/* Product preview */}
        <div className="animate-fade-in-up animation-delay-500 mt-14 max-w-4xl mx-auto">
          <div className="card overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)]">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-default)]">
              <div className="flex gap-1.5">
                <div className="w-[10px] h-[10px] rounded-full bg-[#FF5F56]" />
                <div className="w-[10px] h-[10px] rounded-full bg-[#FFBD2E]" />
                <div className="w-[10px] h-[10px] rounded-full bg-[#27C93F]" />
              </div>
              <div className="flex-1 mx-8">
                <div className="max-w-[200px] mx-auto px-3 py-0.5 rounded-md bg-white text-[11px] text-[var(--color-ink-tertiary)] text-center font-mono">
                  evolora.app/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="p-5 sm:p-6 bg-[var(--color-bg)]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Left: Target role */}
                <div className="md:col-span-2 space-y-4">
                  <div className="bg-white rounded-[var(--radius-lg)] border border-[var(--color-border-default)] p-4">
                    <p className="text-label mb-2">Active target</p>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[15px] font-semibold text-[var(--color-ink-primary)]">
                          Senior Frontend Engineer
                        </p>
                        <p className="text-[12px] text-[var(--color-ink-tertiary)]">Google · Senior Level</p>
                      </div>
                      <span className="tag tag-success">✓ Ready</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {["React", "TypeScript", "System Design", "GraphQL"].map((s) => (
                        <span key={s} className="tag">{s}</span>
                      ))}
                    </div>
                  </div>

                  {/* Skill bars */}
                  <div className="bg-white rounded-[var(--radius-lg)] border border-[var(--color-border-default)] p-4">
                    <p className="text-label mb-3">Skill readiness</p>
                    <div className="space-y-2.5">
                      {[
                        { skill: "React & Components", pct: 92 },
                        { skill: "TypeScript", pct: 78 },
                        { skill: "System Design", pct: 54 },
                      ].map((item) => (
                        <div key={item.skill} className="flex items-center gap-3">
                          <span className="text-[12px] text-[var(--color-ink-primary)] w-[120px] truncate font-medium">{item.skill}</span>
                          <div className="flex-1 progress-bar">
                            <div className="progress-bar-fill" style={{ width: `${item.pct}%` }} />
                          </div>
                          <span className="text-[11px] font-semibold text-[var(--color-ink-secondary)] w-8 text-right">{item.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Modules */}
                <div className="space-y-3">
                  {[
                    { icon: ClipboardCheck, label: "MCQ Exam", score: "21/25", color: "text-[var(--color-accent)]" },
                    { icon: Code2, label: "Coding IDE", score: "3/5 passed", color: "text-[var(--color-success)]" },
                    { icon: Mic, label: "Voice Interview", score: "In progress", color: "text-[var(--color-warning)]" },
                  ].map((m) => (
                    <div key={m.label} className="bg-white rounded-[var(--radius-lg)] border border-[var(--color-border-default)] p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] flex items-center justify-center">
                        <m.icon className={`w-4 h-4 ${m.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[var(--color-ink-primary)]">{m.label}</p>
                        <p className="text-[11px] text-[var(--color-ink-tertiary)]">{m.score}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LOGOS / Social proof bar
   ══════════════════════════════════════════════════════════════════ */

function SocialProofBar() {
  return (
    <section className="py-10 border-t border-[var(--color-border-default)]">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-[12px] text-[var(--color-ink-tertiary)] mb-5 uppercase tracking-wider font-medium">
          Candidates preparing for roles at
        </p>
        <div className="flex items-center justify-center flex-wrap gap-x-10 gap-y-3">
          {["Google", "Meta", "Amazon", "Microsoft", "Apple", "Netflix"].map((name) => (
            <span key={name} className="text-[14px] font-semibold text-[var(--color-ink-tertiary)] tracking-tight">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FEATURES — 4 clear value props, each with icon + explanation
   ══════════════════════════════════════════════════════════════════ */

function FeaturesSection() {
  const features = [
    {
      icon: <Brain className="w-5 h-5" />,
      title: "AI Job Analysis",
      description:
        "Paste any job listing. We extract required skills, seniority signals, technologies, and interview focus areas automatically.",
    },
    {
      icon: <Target className="w-5 h-5" />,
      title: "Targeted Practice",
      description:
        "Every MCQ, coding challenge, and behavioral question is generated specifically for your target role. No generic question banks.",
    },
    {
      icon: <Mic className="w-5 h-5" />,
      title: "Voice Mock Interviews",
      description:
        "A ruthless AI interviewer that asks follow-ups, probes deeper, and challenges your answers — voice-only, like the real thing.",
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "Detailed Scoring",
      description:
        "Every answer scored on relevance, correctness, clarity, and depth. With specific recommendations on what to improve.",
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: "ATS Resume Builder",
      description:
        "Generate a LaTeX-compiled, ATS-friendly resume optimized specifically for the keywords in your target job description.",
    },
    {
      icon: <Code2 className="w-5 h-5" />,
      title: "Coding Sandbox",
      description:
        "Practice coding challenges in a live, in-browser IDE that executes your Python code against hidden test cases instantly.",
    },
  ];

  return (
    <section id="features" className="py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-[28px] sm:text-[36px] font-bold tracking-tight text-[var(--color-ink-primary)]">
            Everything you need.
            <br />
            <span className="text-[var(--color-ink-tertiary)]">Nothing you don&apos;t.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {features.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent-text)] mb-3">
                {f.icon}
              </div>
              <h3 className="text-[15px] font-semibold text-[var(--color-ink-primary)] mb-1.5">{f.title}</h3>
              <p className="text-[13px] text-[var(--color-ink-secondary)] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HOW IT WORKS — 4 steps, clean numbering
   ══════════════════════════════════════════════════════════════════ */

function HowItWorksSection() {
  const steps = [
    { title: "Paste a job description", sub: "From any listing or careers page. URL or raw text." },
    { title: "AI extracts what matters", sub: "Skills, stack, seniority, and focus areas — in seconds." },
    { title: "Practice with purpose", sub: "Tailored MCQs, coding problems, and voice interviews." },
    { title: "Get scored, get better", sub: "Rubric-based feedback with specific improvement areas." },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-20 bg-[var(--color-surface)] border-y border-[var(--color-border-default)]">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-[28px] sm:text-[36px] font-bold tracking-tight text-center mb-12">
          How it works
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              <div className="text-[48px] font-bold text-[var(--color-border-default)] leading-none mb-2">
                {i + 1}
              </div>
              <h3 className="text-[14px] font-semibold text-[var(--color-ink-primary)] mb-1">{step.title}</h3>
              <p className="text-[13px] text-[var(--color-ink-tertiary)] leading-relaxed">{step.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TESTIMONIALS — Social proof with real-feeling quotes
   ══════════════════════════════════════════════════════════════════ */

function TestimonialsSection() {
  const testimonials = [
    {
      quote: "The voice interviews are brutally honest — exactly what I needed. Got the offer at Google.",
      name: "Sarah K.",
      role: "Senior SWE → Google L5",
      stars: 5,
    },
    {
      quote: "I was spending hours on random LeetCode. Evolora focused me on exactly what my target role needed.",
      name: "Marcus T.",
      role: "Frontend Engineer → Meta E5",
      stars: 5,
    },
    {
      quote: "The resume builder alone saved me. Went from 2% callback rate to landing 4 interviews in a week.",
      name: "Priya M.",
      role: "Fullstack Dev → Amazon SDE II",
      stars: 5,
    },
  ];

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-[28px] sm:text-[36px] font-bold tracking-tight text-center mb-3">
          Real results
        </h2>
        <p className="text-center text-[var(--color-ink-secondary)] mb-12 max-w-md mx-auto">
          Candidates who use Evolora report 3x higher interview callback rates.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div key={t.name} className="card p-5">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-[14px] text-[var(--color-ink-primary)] leading-relaxed mb-4">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <p className="text-[13px] font-semibold text-[var(--color-ink-primary)]">{t.name}</p>
                <p className="text-[12px] text-[var(--color-ink-tertiary)]">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PRICING — Two tiers, clear differentiation
   ══════════════════════════════════════════════════════════════════ */

function PricingSection() {
  return (
    <section id="pricing" className="py-16 sm:py-20 bg-[var(--color-surface)] border-y border-[var(--color-border-default)]">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-[28px] sm:text-[36px] font-bold tracking-tight text-center mb-2">
          Simple pricing
        </h2>
        <p className="text-center text-[var(--color-ink-secondary)] mb-12">
          Start free. Upgrade when you&apos;re serious.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
          {/* Free */}
          <div className="card p-6">
            <h3 className="text-[15px] font-semibold mb-0.5">Free</h3>
            <p className="text-caption mb-4">To get started</p>
            <div className="mb-5">
              <span className="text-[32px] font-bold tracking-tight">$0</span>
            </div>
            <ul className="space-y-2.5 mb-6">
              {[
                "3 job analyses per month",
                "Basic question generation",
                "1 mock interview",
                "Standard feedback",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px] text-[var(--color-ink-secondary)]">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-ink-tertiary)] flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/register" className="btn-secondary w-full justify-center">
              Get started
            </Link>
          </div>

          {/* Pro */}
          <div className="card p-6 border-[var(--color-accent)] border-2 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="tag tag-accent text-[11px] font-semibold px-3 py-1">Most popular</span>
            </div>
            <h3 className="text-[15px] font-semibold mb-0.5">Pro</h3>
            <p className="text-caption mb-4">For serious preparation</p>
            <div className="mb-5">
              <span className="text-[32px] font-bold tracking-tight">$19</span>
              <span className="text-[var(--color-ink-tertiary)] text-[13px] ml-1">/month</span>
            </div>
            <ul className="space-y-2.5 mb-6">
              {[
                "Unlimited job analyses",
                "Unlimited voice mock interviews",
                "Detailed rubric scoring",
                "ATS resume builder",
                "Personalized study plans",
                "Priority AI processing",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px] text-[var(--color-ink-secondary)]">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/register?plan=pro" className="btn-primary w-full justify-center">
              Start free trial
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FINAL CTA
   ══════════════════════════════════════════════════════════════════ */

function CTASection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-[28px] sm:text-[36px] font-bold tracking-tight mb-3">
          Your next interview starts here.
        </h2>
        <p className="text-[var(--color-ink-secondary)] mb-6 max-w-md mx-auto">
          Join 2,400+ candidates who prepare smarter, not harder.
        </p>
        <Link href="/register" className="btn-primary text-[14px] px-6 py-2.5">
          Get started free <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FOOTER
   ══════════════════════════════════════════════════════════════════ */

function Footer() {
  return (
    <footer className="py-8 border-t border-[var(--color-border-default)]">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--color-accent)] flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">E</span>
            </div>
            <span className="text-[13px] font-medium text-[var(--color-ink-primary)]">Evolora</span>
          </div>
          <div className="flex items-center gap-6 text-[12px] text-[var(--color-ink-tertiary)]">
            <a href="#" className="hover:text-[var(--color-ink-primary)] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[var(--color-ink-primary)] transition-colors">Terms</a>
            <a href="#" className="hover:text-[var(--color-ink-primary)] transition-colors">Contact</a>
          </div>
          <span className="text-[11px] text-[var(--color-ink-tertiary)]">
            © {new Date().getFullYear()} Evolora. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <SocialProofBar />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </>
  );
}
