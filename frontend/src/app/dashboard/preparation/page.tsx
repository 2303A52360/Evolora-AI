"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronRight,
  BookOpen,
  Code2,
  Layers,
  Users,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Play,
  Loader2,
  Sparkles,
  ArrowRight,
  Plus,
  RefreshCw,
  Target,
  Zap,
  Brain,
  TrendingUp,
  Shield,
  AlertTriangle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";

export default function PreparationPage() {
  const [jobTargets, setJobTargets] = useState<Array<any>>([]);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reExtracting, setReExtracting] = useState<boolean>(false);
  const [polling, setPolling] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.listJobTargets();
        if (res.items && res.items.length > 0) {
          setJobTargets(res.items);
          setActiveJob(res.items[0]);
        }
      } catch (err) {
        console.error("Failed to load job targets", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Poll for extraction results when not yet processed
  useEffect(() => {
    if (!activeJob || activeJob.is_processed) return;
    setPolling(true);
    let attempts = 0;
    const interval = setInterval(async () => {
      try {
        const updated = await api.getJobTarget(activeJob.id);
        if (updated.is_processed) {
          setActiveJob(updated);
          setPolling(false);
          clearInterval(interval);
        }
        attempts++;
        if (attempts > 30) {
          setPolling(false);
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
        setPolling(false);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeJob?.id, activeJob?.is_processed]);

  const handleReExtract = async () => {
    if (!activeJob) return;
    setReExtracting(true);
    try {
      await api.reExtractJobTarget(activeJob.id);
      // Start polling for new results
      const updated = await api.getJobTarget(activeJob.id);
      setActiveJob({ ...updated, is_processed: false });
    } catch (err) {
      console.error("Re-extraction failed", err);
    } finally {
      setReExtracting(false);
    }
  };

  const isExtractionFailed = activeJob && activeJob.is_processed &&
    (!activeJob.role_title || activeJob.role_title === "Unknown Role") &&
    (!activeJob.required_skills || activeJob.required_skills.length === 0);

  if (loading) {
    return (
      <DashboardLayout title="My Preparation">
        <div className="flex items-center gap-2 py-8 text-[var(--color-ink-tertiary)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading preparation plan...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!activeJob) {
    return (
      <DashboardLayout title="My Preparation">
        <div className="max-w-[480px] text-center py-8">
          <BookOpen className="w-8 h-8 text-[var(--color-ink-tertiary)] mx-auto mb-3" />
          <h2 className="text-heading mb-2">No active preparation plan</h2>
          <p className="text-body-sm mb-6">
            Submit a job description or job posting URL to generate a personalized AI preparation plan tailored specifically to the role.
          </p>
          <Link href="/dashboard/jobs/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Job Target
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const requiredSkills = activeJob.required_skills || [];
  const techStack = activeJob.tech_stack || [];
  const responsibilities = activeJob.responsibilities || [];
  const softSkills = activeJob.soft_skills || [];
  const interviewFocus = activeJob.interview_focus_areas || [];
  const hasRealData = requiredSkills.length > 0 && activeJob.role_title && activeJob.role_title !== "Unknown Role";

  return (
    <DashboardLayout title="My Preparation">
      {/* ── Extraction failed / polling banner ──────────────────── */}
      {(isExtractionFailed || polling || (!activeJob.is_processed)) && (
        <div className={`mb-6 p-4 rounded-[var(--radius-lg)] border flex items-center justify-between gap-4 ${
          polling || !activeJob.is_processed
            ? "bg-[var(--color-accent-subtle)] border-[var(--color-accent)]/30"
            : "bg-[var(--color-warning-subtle)] border-[var(--color-warning)]/30"
        }`}>
          <div className="flex items-center gap-3">
            {polling || !activeJob.is_processed ? (
              <Loader2 className="w-5 h-5 animate-spin text-[var(--color-accent)]" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />
            )}
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-ink-primary)]">
                {polling || !activeJob.is_processed
                  ? "AI is analyzing your job description..."
                  : "Extraction needs to be re-run"}
              </p>
              <p className="text-[12px] text-[var(--color-ink-secondary)]">
                {polling || !activeJob.is_processed
                  ? "NVIDIA NIM (Llama 3.3 70B) is extracting role requirements. This takes 10-30 seconds."
                  : "The previous analysis failed. Click Re-analyze to extract skills with the updated AI model."}
              </p>
            </div>
          </div>
          {isExtractionFailed && !polling && (
            <button
              onClick={handleReExtract}
              disabled={reExtracting}
              className="btn-primary text-[12px] py-1.5 px-3 flex-shrink-0"
            >
              {reExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Re-analyze
            </button>
          )}
        </div>
      )}

      {/* ── Target info header ─────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="text-label mb-1">Prepared specifically for</p>
          <h2 className="text-heading-lg">{activeJob.role_title || "Target Role"}</h2>
          <p className="text-body-sm capitalize">
            Seniority: {activeJob.seniority && activeJob.seniority !== "unknown" ? activeJob.seniority : "Detecting..."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/assessments" className="btn-secondary text-[13px]">
            <ClipboardCheck className="w-4 h-4" />
            Launch Assessment
          </Link>
          <Link href="/dashboard/interviews" className="btn-primary text-[13px]">
            <Play className="w-4 h-4" />
            Start AI Interview
          </Link>
        </div>
      </div>

      <hr className="divider mb-6" />

      {/* ── Role Requirements Overview ─────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] space-y-2">
          <h3 className="text-[13px] font-semibold text-[var(--color-ink-primary)] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[var(--color-accent-text)]" /> Extracted Core Skills
          </h3>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {hasRealData ? (
              requiredSkills.map((skill: string, i: number) => (
                <span key={i} className="tag tag-accent text-[11px]">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-caption italic">Awaiting AI extraction...</span>
            )}
          </div>
        </div>

        <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] space-y-2">
          <h3 className="text-[13px] font-semibold text-[var(--color-ink-primary)] flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-[var(--color-accent-text)]" /> Tech Stack & Tools
          </h3>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {techStack.length > 0 ? (
              techStack.map((tech: string, i: number) => (
                <span key={i} className="tag text-[11px]">
                  {tech}
                </span>
              ))
            ) : (
              <span className="text-caption italic">Awaiting AI extraction...</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Additional extracted data ──────────────────────────── */}
      {hasRealData && (
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {responsibilities.length > 0 && (
            <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] space-y-2">
              <h3 className="text-[13px] font-semibold text-[var(--color-ink-primary)] flex items-center gap-1.5">
                <Target className="w-4 h-4 text-[var(--color-accent-text)]" /> Key Responsibilities
              </h3>
              <ul className="space-y-1 pt-1">
                {responsibilities.slice(0, 5).map((r: string, i: number) => (
                  <li key={i} className="text-[12px] text-[var(--color-ink-secondary)] flex items-start gap-1.5">
                    <span className="text-[var(--color-accent)] mt-0.5">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {interviewFocus.length > 0 && (
            <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] space-y-2">
              <h3 className="text-[13px] font-semibold text-[var(--color-ink-primary)] flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-[var(--color-accent-text)]" /> Interview Focus Areas
              </h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {interviewFocus.map((area: string, i: number) => (
                  <span key={i} className="tag tag-accent text-[11px]">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {softSkills.length > 0 && (
            <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] space-y-2">
              <h3 className="text-[13px] font-semibold text-[var(--color-ink-primary)] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[var(--color-accent-text)]" /> Soft Skills Required
              </h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {softSkills.map((skill: string, i: number) => (
                  <span key={i} className="tag text-[11px]">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Assessment Summary Stats ──────────────────────────── */}
      {hasRealData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { icon: <ClipboardCheck className="w-4 h-4" />, label: "MCQ Questions", value: "25", color: "text-[var(--color-accent-text)]" },
            { icon: <Code2 className="w-4 h-4" />, label: "Coding Problems", value: "3", color: "text-[var(--color-success)]" },
            { icon: <Users className="w-4 h-4" />, label: "Interview Qs", value: "10", color: "text-[var(--color-warning)]" },
            { icon: <Clock className="w-4 h-4" />, label: "Total Duration", value: "~90 min", color: "text-[var(--color-ink-secondary)]" },
          ].map((stat, idx) => (
            <div key={idx} className="p-3 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] text-center">
              <div className={`${stat.color} mx-auto mb-1.5 flex justify-center`}>{stat.icon}</div>
              <p className="text-[18px] font-bold text-[var(--color-ink-primary)]">{stat.value}</p>
              <p className="text-[11px] text-[var(--color-ink-tertiary)]">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Preparation Tracks ─────────────────────────────────── */}
      <h3 className="text-heading mb-4">Recommended Preparation Tracks</h3>
      <div className="space-y-3">
        {[
          {
            title: "Technical Assessment",
            desc: `25 MCQs + 3 coding problems tailored to ${activeJob.role_title || "your target role"}`,
            icon: <ClipboardCheck className="w-4 h-4 text-[var(--color-accent-text)]" />,
            href: "/dashboard/assessments",
            btnText: "Take Assessment",
            badge: "25 MCQ + 3 Code",
          },
          {
            title: "AI Voice Interview",
            desc: `10-question interactive mock interview with NVIDIA NIM — min 20 minutes`,
            icon: <Users className="w-4 h-4 text-[var(--color-accent-text)]" />,
            href: "/dashboard/interviews",
            btnText: "Start Interview",
            badge: "20+ min",
          },
          {
            title: "Question Practice",
            desc: "Self-paced topic questions with instant feedback and explanations",
            icon: <BookOpen className="w-4 h-4 text-[var(--color-accent-text)]" />,
            href: "/dashboard/practice",
            btnText: "Practice Questions",
            badge: "Self-paced",
          },
        ].map((track, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-4 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] hover:border-[var(--color-accent)]/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-accent-subtle)] flex items-center justify-center">
                {track.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-[14px] font-medium text-[var(--color-ink-primary)]">{track.title}</h4>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)]">
                    {track.badge}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--color-ink-tertiary)]">{track.desc}</p>
              </div>
            </div>
            <Link href={track.href} className="btn-secondary text-[12px] py-1.5 px-3">
              {track.btnText}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
