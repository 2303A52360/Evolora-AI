"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Plus,
  ChevronRight,
  Bookmark,
  ClipboardCheck,
  Code2,
  Mic,
  FileText,
  Clock,
  BookOpen,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

/* ── Types ───────────────────────────────────────────────────────── */

interface JobTarget {
  id: string;
  raw_jd: string;
  role_title: string | null;
  seniority: string;
  required_skills: string[];
  tech_stack: string[];
  is_processed: boolean;
  created_at: string;
}

/* ═══════════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobTarget[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [jobsData, evalsData] = await Promise.all([
          api.listJobTargets(1, 10),
          api.listEvaluations()
        ]);
        setJobs(jobsData.items);
        setEvaluations(evalsData.items || []);
      } catch {
        /* API offline */
      } finally {
        setLoadingJobs(false);
      }
    }
    fetchData();
  }, []);

  const firstName = user?.name?.split(" ")[0] || "there";
  const activeJob = jobs.find((j) => j.is_processed);
  const hasJobs = jobs.length > 0;

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-8">

        {/* ── Greeting ─────────────────────────────────────────────── */}
        <div>
          <h2 className="text-display mb-1">Welcome back, {firstName}</h2>
          <p className="text-body-sm">
            {hasJobs
              ? `You have ${jobs.length} saved role${jobs.length > 1 ? "s" : ""}. Pick up where you left off.`
              : "Add a job description to start your interview preparation."}
          </p>
        </div>

        {/* ── Active role card (only shows if a job is processed) ──── */}
        {activeJob && (
          <div className="card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-label mb-1">Active target</p>
                <h3 className="text-heading-lg">{activeJob.role_title || "Untitled Role"}</h3>
                {activeJob.seniority !== "unknown" && (
                  <p className="text-body-sm capitalize mt-0.5">{activeJob.seniority} level</p>
                )}
                {activeJob.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {activeJob.required_skills.slice(0, 6).map((s) => (
                      <span key={s} className="tag">{s}</span>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/dashboard/preparation" className="btn-primary shrink-0">
                Continue <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────── */}
        {!hasJobs && !loadingJobs && (
          <div className="card p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-heading mb-0.5">Get started</h3>
                <p className="text-body-sm">Paste a job description or URL to generate a tailored preparation plan.</p>
              </div>
              <Link href="/dashboard/jobs/new" className="btn-primary">
                <Plus className="w-4 h-4" /> Add job target
              </Link>
            </div>
          </div>
        )}

        {/* ── Module tiles ─────────────────────────────────────────── */}
        <div>
          <h3 className="text-heading mb-3">Practice modules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <ModuleTile
              href="/dashboard/mcq"
              icon={<ClipboardCheck className="w-4 h-4" />}
              title="MCQ Exam"
              desc="25-question technical assessment"
              meta="~20 min"
            />
            <ModuleTile
              href="/dashboard/coding"
              icon={<Code2 className="w-4 h-4" />}
              title="Coding IDE"
              desc="Python sandbox with test cases"
              meta="Live execution"
            />
            <ModuleTile
              href="/dashboard/interviews"
              icon={<Mic className="w-4 h-4" />}
              title="Voice Interview"
              desc="AI interviewer, spoken Q&A"
              meta="Voice only"
            />
            <ModuleTile
              href="/dashboard/flashcards"
              icon={<BookOpen className="w-4 h-4" />}
              title="Flashcards"
              desc="Interactive 3D topic review"
              meta="Self-paced"
            />
            <ModuleTile
              href="/dashboard/resume"
              icon={<FileText className="w-4 h-4" />}
              title="Resume Builder"
              desc="ATS-optimized LaTeX resume"
              meta="Score 90+"
            />
          </div>
        </div>

        {/* ── Dashboard Bottom Grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* ── Saved jobs list ──────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-heading">Saved jobs</h3>
              {hasJobs && (
                <Link
                  href="/dashboard/jobs"
                  className="text-[12px] font-medium text-[var(--color-accent-text)] hover:underline flex items-center gap-0.5"
                >
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {loadingJobs ? (
              <div className="card p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 skeleton rounded-[var(--radius-md)]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-40 skeleton" />
                      <div className="h-3 w-24 skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="card py-8 text-center">
                <Bookmark className="w-5 h-5 text-[var(--color-ink-tertiary)] mx-auto mb-2" />
                <p className="text-body-sm mb-1">No saved jobs</p>
                <p className="text-caption mb-3">Add a job description to get started.</p>
                <Link href="/dashboard/jobs/new" className="btn-primary text-[12px] py-1.5 px-3 mx-auto max-w-[120px]">
                  <Plus className="w-3.5 h-3.5" /> Add job
                </Link>
              </div>
            ) : (
              <div className="card divide-y divide-[var(--color-border-default)] overflow-hidden">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/dashboard/jobs/${job.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-[var(--color-surface-sunken)] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-accent-subtle)] flex items-center justify-center flex-shrink-0">
                      <Bookmark className="w-3.5 h-3.5 text-[var(--color-accent-text)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[var(--color-ink-primary)] truncate">
                        {job.role_title || "Processing…"}
                      </p>
                      <p className="text-[11px] text-[var(--color-ink-tertiary)]">
                        {job.seniority !== "unknown" ? `${job.seniority} · ` : ""}
                        {new Date(job.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`tag ${job.is_processed ? "tag-success" : "tag-warning"}`}>
                      {job.is_processed ? "Ready" : "Processing"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── Recent Evaluations list ──────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-heading">Recent activity</h3>
              {evaluations.length > 0 && (
                <Link
                  href="/dashboard/progress"
                  className="text-[12px] font-medium text-[var(--color-accent-text)] hover:underline flex items-center gap-0.5"
                >
                  View progress <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {loadingJobs ? (
              <div className="card p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 skeleton rounded-[var(--radius-md)]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-40 skeleton" />
                      <div className="h-3 w-24 skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            ) : evaluations.length === 0 ? (
              <div className="card py-8 text-center">
                <Clock className="w-5 h-5 text-[var(--color-ink-tertiary)] mx-auto mb-2" />
                <p className="text-body-sm mb-1">No evaluations yet</p>
                <p className="text-caption mb-3">Complete an assessment to see your scores.</p>
                <Link href="/dashboard/interviews" className="btn-secondary text-[12px] py-1.5 px-3 mx-auto max-w-[150px]">
                  Take an assessment
                </Link>
              </div>
            ) : (
              <div className="card divide-y divide-[var(--color-border-default)] overflow-hidden">
                {evaluations.slice(0, 4).map((evalItem) => (
                  <div
                    key={evalItem.id}
                    className="flex items-center gap-3 p-3 hover:bg-[var(--color-surface-sunken)] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-[var(--radius-md)] bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[var(--color-ink-primary)] truncate">
                        {evalItem.type === "voice" ? "Live Voice AI Interview" : "Assessment"}
                      </p>
                      <p className="text-[11px] text-[var(--color-ink-tertiary)] mt-0.5">
                        {new Date(evalItem.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold block mb-0.5 ${
                        evalItem.overall_score >= 80 ? "bg-emerald-500/10 text-emerald-600" :
                        evalItem.overall_score >= 60 ? "bg-amber-500/10 text-amber-600" :
                        "bg-red-500/10 text-red-500"
                      }`}>
                        {evalItem.overall_score >= 80 ? "STRONG" : evalItem.overall_score >= 60 ? "PASSING" : "FAIL"}
                      </span>
                      <span className={`text-[12px] font-bold ${
                        evalItem.overall_score >= 80 ? "text-[var(--color-success)]" :
                        evalItem.overall_score >= 60 ? "text-[var(--color-warning)]" :
                        "text-[var(--color-error)]"
                      }`}>
                        {evalItem.overall_score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

/* ── Module tile component ────────────────────────────────────────── */

function ModuleTile({ href, icon, title, desc, meta }: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="card p-4 flex flex-col justify-between group hover:border-[var(--color-border-strong)] transition-colors"
    >
      <div>
        <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent-text)] mb-3">
          {icon}
        </div>
        <h4 className="text-[14px] font-semibold text-[var(--color-ink-primary)] mb-0.5">{title}</h4>
        <p className="text-[12px] text-[var(--color-ink-tertiary)] leading-snug">{desc}</p>
      </div>
      <div className="mt-3 pt-2.5 border-t border-[var(--color-border-default)] flex items-center justify-between">
        <span className="text-[11px] text-[var(--color-ink-tertiary)]">{meta}</span>
        <ChevronRight className="w-3.5 h-3.5 text-[var(--color-ink-tertiary)] group-hover:text-[var(--color-accent-text)] transition-colors" />
      </div>
    </Link>
  );
}
