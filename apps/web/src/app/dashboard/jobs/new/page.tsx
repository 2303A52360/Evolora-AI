"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Clipboard, ArrowRight, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";

/* ── Types ───────────────────────────────────────────────────────── */

interface ExtractionResult {
  id: string;
  role_title: string | null;
  seniority: string;
  required_skills: string[];
  tech_stack: string[];
  responsibilities: string[];
  soft_skills: string[];
  is_processed: boolean;
}

/* ── Input mode ──────────────────────────────────────────────────── */

type InputMode = "url" | "text";

/* ═══════════════════════════════════════════════════════════════════
   JOB ANALYSIS FLOW
   ═══════════════════════════════════════════════════════════════════ */

export default function NewJobTargetPage() {
  const { showToast } = useToast();
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [jdText, setJdText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [polling, setPolling] = useState(false);
  const [revealedSections, setRevealedSections] = useState<Set<string>>(new Set());

  /* Poll for extraction */
  const pollForResults = useCallback(
    async (id: string) => {
      setPolling(true);
      let attempts = 0;
      const poll = async () => {
        try {
          const data = await api.getJobTarget(id);
          if (data.is_processed) {
            setResult(data as ExtractionResult);
            setPolling(false);
            // Progressive disclosure — reveal sections one by one
            const sections = ["title", "skills", "stack", "responsibilities"];
            sections.forEach((s, i) => {
              setTimeout(() => {
                setRevealedSections((prev) => new Set([...prev, s]));
              }, i * 400);
            });
            return;
          }
          attempts++;
          if (attempts < 20) setTimeout(poll, 3000);
          else {
            setPolling(false);
            showToast("error", "Extraction is taking longer than expected.");
          }
        } catch {
          setPolling(false);
        }
      };
      poll();
    },
    [showToast],
  );

  /* Submit */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jdText.length < 50) return;
    setLoading(true);
    try {
      const data = await api.submitJobDescription(jdText, sourceUrl || undefined);
      setJobId(data.id);
      setSubmitted(true);
      showToast("success", "Submitted. Analyzing your role now.");
      pollForResults(data.id);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "detail" in err
          ? String((err as { detail: string }).detail)
          : "Failed to submit. Try again.";
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJdText(text);
    } catch {
      showToast("error", "Clipboard access denied.");
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setJdText("");
    setSourceUrl("");
    setResult(null);
    setJobId(null);
    setRevealedSections(new Set());
  };

  return (
    <DashboardLayout title="New Job Target">
      <div className="max-w-[600px]">
        {!submitted ? (
          <>
            {/* Instructions */}
            <p className="text-body-sm mb-6">
              Paste the full job description below. We&apos;ll extract the required skills,
              seniority level, and tech stack, then generate questions tailored to this role.
            </p>

            {/* Input mode tabs */}
            <div className="flex gap-1 p-0.5 bg-[var(--color-surface-sunken)] rounded-[var(--radius-md)] w-fit mb-5">
              <button
                type="button"
                onClick={() => setInputMode("text")}
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors ${
                  inputMode === "text"
                    ? "bg-[var(--color-surface)] text-[var(--color-ink-primary)] shadow-sm"
                    : "text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-secondary)]"
                }`}
              >
                Paste job description
              </button>
              <button
                type="button"
                onClick={() => setInputMode("url")}
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors ${
                  inputMode === "url"
                    ? "bg-[var(--color-surface)] text-[var(--color-ink-primary)] shadow-sm"
                    : "text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-secondary)]"
                }`}
              >
                Paste a job URL
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {inputMode === "url" && (
                <div>
                  <label htmlFor="source-url" className="text-label block mb-1.5">
                    Job URL
                  </label>
                  <input
                    id="source-url"
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://jobs.example.com/listing/12345"
                    className="input"
                  />
                  <p className="text-caption mt-1.5">
                    We&apos;ll fetch and extract the job description from this URL.
                  </p>
                </div>
              )}

              {/* Textarea — always shown */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="jd-input" className="text-label">
                    Job description
                  </label>
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-accent-text)] hover:underline"
                  >
                    <Clipboard className="w-3 h-3" />
                    Paste from clipboard
                  </button>
                </div>
                <textarea
                  id="jd-input"
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="We are looking for a Senior Frontend Engineer with 5+ years of experience in React, TypeScript, and modern web technologies…"
                  rows={12}
                  className="textarea"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}
                />
                <p className="text-caption mt-1.5">
                  {jdText.length} characters{jdText.length > 0 && jdText.length < 50 ? " — minimum 50 required" : ""}
                </p>
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-1">
                <button
                  id="submit-jd"
                  type="submit"
                  disabled={loading || jdText.length < 50}
                  className="btn-primary"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      Analyze
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* ── Analysis Results ───────────────────────────────────── */
          <div>
            {/* Status */}
            <div className="flex items-center gap-2 mb-6">
              {polling ? (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--color-accent)]" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
              )}
              <p className="text-[14px] font-medium text-[var(--color-ink-primary)]">
                {polling ? "Analyzing your role…" : "Analysis complete"}
              </p>
            </div>

            {/* Polling state */}
            {polling && !result && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-5">
                <div className="space-y-3">
                  {["Role title", "Required skills", "Tech stack", "Responsibilities"].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
                      <span className="text-body-sm" style={{ fontFamily: "var(--font-mono)" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results — progressive disclosure */}
            {result && (
              <div className="space-y-4">
                {/* Title section */}
                {revealedSections.has("title") && (
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-5">
                    <p className="text-label mb-1">Role</p>
                    <h2 className="text-heading-lg">{result.role_title || "Software Engineer"}</h2>
                    <p className="text-body-sm capitalize mt-0.5">
                      {result.seniority !== "unknown" ? `${result.seniority} level` : ""}
                    </p>
                  </div>
                )}

                {/* Skills */}
                {revealedSections.has("skills") && result.required_skills.length > 0 && (
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-5">
                    <p className="text-label mb-2.5">Required skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.required_skills.map((s) => (
                        <span key={s} className="tag-accent">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tech stack */}
                {revealedSections.has("stack") && result.tech_stack.length > 0 && (
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-5">
                    <p className="text-label mb-2.5">Technologies</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.tech_stack.map((t) => (
                        <span key={t} className="tag">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Responsibilities */}
                {revealedSections.has("responsibilities") && result.responsibilities.length > 0 && (
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-5">
                    <p className="text-label mb-2.5">Key responsibilities</p>
                    <ul className="space-y-1.5">
                      {result.responsibilities.map((r, i) => (
                        <li key={i} className="text-body-sm flex items-start gap-2">
                          <span className="text-[var(--color-ink-tertiary)] mt-0.5 flex-shrink-0">–</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <Link
                    href={jobId ? `/dashboard/jobs/${jobId}` : "/dashboard/jobs"}
                    className="btn-secondary"
                  >
                    View details
                  </Link>
                  <Link
                    href="/dashboard/preparation"
                    className="btn-primary"
                  >
                    Start preparation
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button onClick={resetForm} className="btn-ghost ml-auto">
                    Analyze another
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
