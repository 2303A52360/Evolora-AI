"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Target,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";

/* ══════════════════════════════════════════════════════════════════
   PROGRESS PAGE
   ══════════════════════════════════════════════════════════════════ */

export default function ProgressPage() {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const evals = await api.listEvaluations();
        setEvaluations(evals.items || []);
      } catch (err) {
        console.error("Failed to load progress data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const hasData = evaluations.length > 0;
  
  // Calculate dynamic stats
  const overallProgress = hasData 
    ? Math.round(evaluations.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / evaluations.length) 
    : 0;

  const assessmentHistory = evaluations.slice(0, 5).map(e => ({
    id: e.id,
    date: new Date(e.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    title: e.type === "voice" ? "Live Voice AI Interview" : "Assessment",
    score: e.overall_score,
  }));

  const practiceStreak = hasData ? 1 : 0; // Simulated streak

  // Keep static for now, as skill metrics aren't fully returned by the list endpoint yet
  const skillsMastered = [
    { name: "React Hooks", level: 92 },
    { name: "JSX Patterns", level: 88 },
  ];
  const skillsInProgress = [
    { name: "TypeScript Generics", level: 55 },
    { name: "State Management", level: 48 },
    { name: "Testing", level: 35 },
  ];
  const weakAreas = [
    { name: "System Design", level: 15 },
    { name: "SQL Optimization", level: 10 },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Progress">
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!hasData) {
    return (
      <DashboardLayout title="Progress">
        <div className="max-w-[400px] py-12 text-center mx-auto">
          <TrendingUp className="w-8 h-8 text-[var(--color-ink-tertiary)] mx-auto mb-3" />
          <h2 className="text-heading mb-2">No progress data yet</h2>
          <p className="text-body-sm mb-6">
            Complete practice questions and mock interviews to start tracking your progress.
            You&apos;ll see skill breakdowns, score trends, and personalized recommendations.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/dashboard/interviews" className="btn-primary justify-center">
              Start Voice Interview
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/dashboard/coding" className="btn-secondary justify-center text-[13px]">
              Take Coding Assessment
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Progress">
      {/* ── Overview strip ───────────────────────────────────────── */}
      <div className="flex items-center gap-8 mb-8 flex-wrap">
        <div>
          <p className="text-label mb-1">Average Evaluation Score</p>
          <p className="text-[32px] font-bold text-[var(--color-ink-primary)] leading-none">{overallProgress}%</p>
          <div className="w-32 mt-2">
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${overallProgress}%` }} />
            </div>
          </div>
        </div>
        <div>
          <p className="text-label mb-1">Total Mock Interviews</p>
          <p className="text-[32px] font-bold text-[var(--color-ink-primary)] leading-none">{evaluations.length}</p>
          <p className="text-caption mt-1">completed</p>
        </div>
        <div>
          <p className="text-label mb-1">Practice Streak</p>
          <p className="text-[32px] font-bold text-[var(--color-ink-primary)] leading-none">{practiceStreak}</p>
          <p className="text-caption mt-1">days in a row</p>
        </div>
      </div>

      <hr className="divider mb-6" />

      <div className="grid lg:grid-cols-2 gap-8">
        {/* ── Left: Skills ───────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Mastered */}
          <section>
            <h3 className="text-heading mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
              Skills mastered
            </h3>
            <div className="space-y-2.5">
              {skillsMastered.map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-[13px] text-[var(--color-ink-primary)] w-36 truncate">{s.name}</span>
                  <div className="flex-1 progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${s.level}%`, background: "var(--color-success)" }} />
                  </div>
                  <span className="text-[12px] font-medium text-[var(--color-success)] w-10 text-right">{s.level}%</span>
                </div>
              ))}
            </div>
          </section>

          {/* In progress */}
          <section>
            <h3 className="text-heading mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--color-accent-text)]" />
              In progress
            </h3>
            <div className="space-y-2.5">
              {skillsInProgress.map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-[13px] text-[var(--color-ink-primary)] w-36 truncate">{s.name}</span>
                  <div className="flex-1 progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${s.level}%` }} />
                  </div>
                  <span className="text-[12px] font-medium text-[var(--color-ink-secondary)] w-10 text-right">{s.level}%</span>
                </div>
              ))}
            </div>
          </section>

          {/* Weak areas */}
          <section>
            <h3 className="text-heading mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
              Weak areas
            </h3>
            <div className="space-y-2.5">
              {weakAreas.map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-[13px] text-[var(--color-ink-primary)] w-36 truncate">{s.name}</span>
                  <div className="flex-1 progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${s.level}%`, background: "var(--color-warning)" }} />
                  </div>
                  <span className="text-[12px] font-medium text-[var(--color-warning)] w-10 text-right">{s.level}%</span>
                </div>
              ))}
            </div>
            <Link href="/dashboard/interviews" className="btn-ghost text-[12px] mt-3">
              Practice weak areas in Voice Mock <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </section>
        </div>

        {/* ── Right: Assessment history ──────────────────────────── */}
        <div>
          <section>
            <h3 className="text-heading mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--color-ink-tertiary)]" />
              Recent Evaluations
            </h3>
            <div className="card divide-y divide-[var(--color-border-default)]">
              {assessmentHistory.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-[var(--color-surface-sunken)] transition-colors">
                  <div>
                    <p className="text-[13px] font-medium text-[var(--color-ink-primary)]">{a.title}</p>
                    <p className="text-[11px] text-[var(--color-ink-tertiary)] mt-0.5">
                      {a.date}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      a.score >= 80 ? "bg-emerald-500/10 text-emerald-600" :
                      a.score >= 60 ? "bg-amber-500/10 text-amber-600" :
                      "bg-red-500/10 text-red-500"
                    }`}>
                      {a.score >= 80 ? "STRONG" : a.score >= 60 ? "PASSING" : "FAIL"}
                    </span>
                    <p className={`text-[15px] font-bold ${
                      a.score >= 80 ? "text-[var(--color-success)]" :
                      a.score >= 60 ? "text-[var(--color-warning)]" :
                      "text-[var(--color-error)]"
                    }`}>
                      {a.score}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent improvement */}
          {overallProgress > 70 && (
            <section className="mt-6">
              <h3 className="text-heading mb-3">Recent improvement</h3>
              <div className="bg-[var(--color-success-subtle)] border border-[var(--color-success)]/20 rounded-[var(--radius-lg)] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />
                  <span className="text-[13px] font-medium text-[var(--color-ink-primary)]">On track for passing</span>
                </div>
                <p className="text-[12px] text-[var(--color-ink-secondary)]">
                  Your average evaluation score is {overallProgress}%. Keep practicing to stay above the 80% staff bar-raiser threshold!
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
