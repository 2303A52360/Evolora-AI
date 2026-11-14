"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Code2,
  Users,
  Briefcase,
  Target,
  Loader2,
  AlertCircle,
  ArrowRight,
  FileText,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";

/* ── Types ───────────────────────────────────────────────────────── */

interface JobDetail {
  id: string;
  raw_jd: string;
  source_url: string | null;
  role_title: string | null;
  seniority: string;
  required_skills: string[];
  tech_stack: string[];
  responsibilities: string[];
  soft_skills: string[];
  is_processed: boolean;
  created_at: string;
}

/* ══════════════════════════════════════════════════════════════════
   JOB DETAIL PAGE
   ══════════════════════════════════════════════════════════════════ */

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    async function fetchJob() {
      try {
        const data = await api.getJobTarget(jobId);
        setJob(data as JobDetail);
      } catch {
        setError("Job target not found.");
      } finally {
        setLoading(false);
      }
    }
    if (jobId) fetchJob();
  }, [jobId]);

  /* Auto-refresh if not yet processed */
  useEffect(() => {
    if (!job || job.is_processed) return;

    const interval = setInterval(async () => {
      try {
        const data = await api.getJobTarget(jobId);
        setJob(data as JobDetail);
        if (data.is_processed) clearInterval(interval);
      } catch {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [job, jobId]);

  if (loading) {
    return (
      <DashboardLayout title="Job Details">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--color-accent)]" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !job) {
    return (
      <DashboardLayout title="Job Details">
        <div className="text-center py-20">
          <AlertCircle className="w-8 h-8 text-[var(--color-error)] mx-auto mb-3" />
          <h2 className="text-heading mb-1">Not Found</h2>
          <p className="text-body-sm mb-4">{error}</p>
          <Link href="/dashboard/jobs" className="text-[var(--color-accent-text)] hover:underline text-[13px] font-medium">
            ← Back to Jobs
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Job Details">
      {/* Back link */}
      <Link
        href="/dashboard/jobs"
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-primary)] transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Saved Jobs
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-heading-lg">{job.role_title || "Processing…"}</h2>
            <div className="flex items-center gap-2 mt-1">
              {job.seniority !== "unknown" && (
                <span className="text-body-sm capitalize">{job.seniority} level</span>
              )}
              <span className="text-caption">
                Added {new Date(job.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {job.is_processed ? (
              <>
                <span className="status-dot status-dot-success" />
                <span className="text-[12px] text-[var(--color-success)] font-medium">Analyzed</span>
              </>
            ) : (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-warning)]" />
                <span className="text-[12px] text-[var(--color-warning)] font-medium">Processing</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        {job.is_processed && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Link href="/dashboard/preparation" className="btn-primary">
              <Target className="w-4 h-4" />
              Start preparation
            </Link>
            <Link href={`/dashboard/resume?jobId=${job.id}`} className="btn-secondary">
              <FileText className="w-4 h-4" />
              Generate ATS Resume
            </Link>
            <Link href="/dashboard/assessments" className="btn-secondary">
              Take assessment
            </Link>
          </div>
        )}
      </div>

      <hr className="divider mb-6" />

      {/* Extraction results */}
      {job.is_processed && (
        <div className="space-y-6 mb-6">
          {/* Skills */}
          {job.required_skills.length > 0 && (
            <section>
              <h3 className="text-label mb-2.5">Required skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {job.required_skills.map((skill) => (
                  <span key={skill} className="tag-accent">{skill}</span>
                ))}
              </div>
            </section>
          )}

          {/* Tech stack */}
          {job.tech_stack.length > 0 && (
            <section>
              <h3 className="text-label mb-2.5">Technologies</h3>
              <div className="flex flex-wrap gap-1.5">
                {job.tech_stack.map((tech) => (
                  <span key={tech} className="tag">{tech}</span>
                ))}
              </div>
            </section>
          )}

          {/* Responsibilities */}
          {job.responsibilities.length > 0 && (
            <section>
              <h3 className="text-label mb-2.5">Key responsibilities</h3>
              <ul className="space-y-1.5">
                {job.responsibilities.map((r, i) => (
                  <li key={i} className="text-body-sm flex items-start gap-2">
                    <span className="text-[var(--color-ink-tertiary)] mt-0.5 flex-shrink-0">–</span>
                    {r}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Soft skills */}
          {job.soft_skills.length > 0 && (
            <section>
              <h3 className="text-label mb-2.5">Soft skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {job.soft_skills.map((skill) => (
                  <span key={skill} className="tag-success">{skill}</span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Original JD */}
      <section>
        <button
          onClick={() => setShowOriginal(!showOriginal)}
          className="text-[12px] font-medium text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-primary)] transition-colors"
        >
          {showOriginal ? "Hide" : "Show"} original job description
        </button>
        {showOriginal && (
          <div className="mt-3 p-4 bg-[var(--color-surface-sunken)] rounded-[var(--radius-lg)] max-h-64 overflow-y-auto">
            <p className="text-[13px] text-[var(--color-ink-secondary)] whitespace-pre-wrap leading-relaxed" style={{ fontFamily: "var(--font-mono)" }}>
              {job.raw_jd}
            </p>
            {job.source_url && (
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-[11px] text-[var(--color-accent-text)] hover:underline"
              >
                View original listing →
              </a>
            )}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
