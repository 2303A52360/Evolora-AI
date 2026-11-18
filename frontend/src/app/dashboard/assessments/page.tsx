"use client";

import Link from "next/link";
import {
  HelpCircle,
  Code2,
  Mic,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  FileText,
  Terminal,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function AssessmentHubPage() {
  return (
    <DashboardLayout title="Assessment Modules Hub">
      <div className="max-w-[840px] space-y-6">
        <div>
          <h2 className="text-heading-lg mb-2">Technical Assessment Modules</h2>
          <p className="text-body-sm">
            Choose your desired evaluation environment. Each module is specifically optimized for technical role readiness.
          </p>
        </div>

        {/* 3 Differentiated Modules Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Pure MCQ Exam */}
          <div className="p-6 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] shadow-sm flex flex-col justify-between hover:border-blue-500/40 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Module 1</span>
                <h3 className="text-[17px] font-bold text-[var(--color-ink-primary)]">Pure MCQ Exam</h3>
              </div>
              <p className="text-[13px] text-[var(--color-ink-secondary)] leading-relaxed font-medium">
                25 role-tailored technical multiple-choice questions covering architecture, memory management, and domain knowledge. Zero coding questions included.
              </p>
              <ul className="space-y-2 text-[12px] text-[var(--color-ink-tertiary)] pt-2">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> 25 Multiple Choice Questions
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Immediate Accuracy Scoring
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Link href="/dashboard/mcq" className="btn-primary w-full justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                Start MCQ Exam <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Real Compiler Coding IDE */}
          <div className="p-6 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] shadow-sm flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Code2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Module 2</span>
                <h3 className="text-[17px] font-bold text-[var(--color-ink-primary)]">Real Coding IDE</h3>
              </div>
              <p className="text-[13px] text-[var(--color-ink-secondary)] leading-relaxed font-medium">
                LeetCode & HackerRank style split IDE. Solve algorithmic challenges using python sandbox execution against visible & hidden test cases.
              </p>
              <ul className="space-y-2 text-[12px] text-[var(--color-ink-tertiary)] pt-2">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Real Python Compiler Sandbox
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Pass/Fail Test Cases Diagnostics
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Link href="/dashboard/coding" className="btn-primary w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                Open Coding IDE <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 3: Live AI Voice Interview */}
          <div className="p-6 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] shadow-sm flex flex-col justify-between hover:border-amber-500/40 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Module 3</span>
                <h3 className="text-[17px] font-bold text-[var(--color-ink-primary)]">AI Voice Interview</h3>
              </div>
              <p className="text-[13px] text-[var(--color-ink-secondary)] leading-relaxed font-medium">
                Voice-first technical mock interview with Staff Engineer AI. Features speech recognition, voice synthesis, and turn-by-turn ruthless feedback.
              </p>
              <ul className="space-y-2 text-[12px] text-[var(--color-ink-tertiary)] pt-2">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> Turn-based Voice Conversation
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> Ruthless Technical Critique
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Link href="/dashboard/interviews" className="btn-primary w-full justify-center bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                Start Voice Interview <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
