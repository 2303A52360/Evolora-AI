"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  ChevronRight,
  Bookmark,
  Loader2,
  Trash2,
  FileText,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";

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

/* ══════════════════════════════════════════════════════════════════
   SAVED JOBS LIST
   ══════════════════════════════════════════════════════════════════ */

export default function JobsListPage() {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<JobTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 10;

  const fetchJobs = async (p: number) => {
    setLoading(true);
    try {
      const data = await api.listJobTargets(p, perPage);
      setJobs(data.items);
      setTotal(data.total);
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(page);
  }, [page]);

  const totalPages = Math.ceil(total / perPage);

  const handleDelete = async (id: string) => {
    try {
      await api.request(`/jobs/${id}`, { method: "DELETE" });
      showToast("success", "Job target deleted.");
      fetchJobs(page);
    } catch {
      showToast("error", "Failed to delete.");
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <DashboardLayout title="Saved Jobs">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-body-sm">
          {total} job {total === 1 ? "target" : "targets"} saved
        </p>
        <Link href="/dashboard/jobs/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New job target
        </Link>
      </div>

      {/* Jobs list */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)]">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--color-accent)]" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center">
            <Bookmark className="w-6 h-6 text-[var(--color-ink-tertiary)] mx-auto mb-3" />
            <h4 className="text-heading mb-1">No saved jobs</h4>
            <p className="text-body-sm mb-4">
              Paste a job description to start your personalized preparation.
            </p>
            <Link href="/dashboard/jobs/new" className="btn-primary">
              <Plus className="w-4 h-4" />
              Add your first job
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border-default)]">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-[var(--color-surface-sunken)] transition-colors group"
              >
                <Link
                  href={`/dashboard/jobs/${job.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-accent-subtle)] flex items-center justify-center flex-shrink-0">
                    <Bookmark className="w-3.5 h-3.5 text-[var(--color-accent-text)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[var(--color-ink-primary)] truncate">
                      {job.role_title || "Processing…"}
                    </p>
                    <p className="text-[11px] text-[var(--color-ink-tertiary)]">
                      {job.seniority !== "unknown" ? `${job.seniority} · ` : ""}
                      {formatDate(job.created_at)}
                      {job.required_skills.length > 0 && ` · ${job.required_skills.length} skills`}
                    </p>
                  </div>
                </Link>

                <div className="flex items-center gap-3">
                  <div className="hidden lg:flex items-center gap-1.5">
                    {job.tech_stack.slice(0, 3).map((tech) => (
                      <span key={tech} className="tag text-[10px]">{tech}</span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`status-dot ${job.is_processed ? "status-dot-success" : "status-dot-warning"}`} />
                    <span className="text-[11px] text-[var(--color-ink-tertiary)]">
                      {job.is_processed ? "Ready" : "Processing"}
                    </span>
                  </div>

                  {job.is_processed && (
                    <Link
                      href={`/dashboard/resume?jobId=${job.id}`}
                      className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-ink-tertiary)] hover:text-[var(--color-accent-text)] hover:bg-[var(--color-accent-subtle)] transition-all opacity-0 group-hover:opacity-100"
                      title="Generate ATS Resume"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(job.id);
                    }}
                    className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-ink-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] transition-all opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <Link href={`/dashboard/jobs/${job.id}`}>
                    <ChevronRight className="w-4 h-4 text-[var(--color-ink-tertiary)]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-3 border-t border-[var(--color-border-default)]">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost text-[12px] disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-[12px] text-[var(--color-ink-tertiary)]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-ghost text-[12px] disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
