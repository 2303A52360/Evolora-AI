"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  BookmarkPlus,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";

interface MCQQuestion {
  id: string;
  type: "mcq";
  text: string;
  options: string[];
  correct_answer?: string;
  explanation?: string;
  difficulty?: string;
  skill_tested?: string;
}

export default function MCQAssessmentPage() {
  const { showToast } = useToast();
  const [jobTargets, setJobTargets] = useState<Array<any>>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [loadingJobs, setLoadingJobs] = useState<boolean>(true);
  const [loadingAssessment, setLoadingAssessment] = useState<boolean>(false);
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);

  // Load user job targets
  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await api.listJobTargets();
        if (res.items && res.items.length > 0) {
          setJobTargets(res.items);
          setSelectedJobId(res.items[0].id);
        }
      } catch (err) {
        console.error("Failed to load job targets", err);
      } finally {
        setLoadingJobs(false);
      }
    }
    loadJobs();
  }, []);

  const handleGenerateMCQ = async () => {
    if (!selectedJobId) return;
    setLoadingAssessment(true);
    setErrorMsg(null);
    try {
      // Explicitly request pure MCQ assessment
      const data = await api.generateAssessment(selectedJobId, "mcq", "medium");
      setAssessmentData(data);
      setStarted(true);
      setTimeLeft((data.question_set.length || 25) * 60);
      showToast("success", `Generated ${data.question_set.length} role-specific MCQ questions.`);
    } catch (err: any) {
      console.error("Failed to generate MCQ assessment", err);
      setErrorMsg(err.detail || err.message || "Failed to generate assessment. Ensure backend is operational.");
    } finally {
      setLoadingAssessment(false);
    }
  };

  const questions: MCQQuestion[] = assessmentData?.question_set || [];
  const q = questions[currentIndex];
  const answeredCount = Object.values(answers).filter((a) => a && a.trim().length > 0).length;
  const isLowTime = timeLeft < 5 * 60;

  // Timer logic
  useEffect(() => {
    if (!started || submissionResult) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmitAssessment();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, submissionResult]);

  const toggleMark = useCallback(() => {
    if (!q) return;
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.add(q.id);
      return next;
    });
  }, [q?.id]);

  const handleSubmitAssessment = async () => {
    if (!assessmentData) return;
    setSubmitting(true);
    try {
      const duration = Math.max(1, (questions.length * 60) - timeLeft);
      const result = await api.submitAssessment(assessmentData.id, answers, duration);
      setSubmissionResult(result);
      showToast("success", "MCQ Assessment evaluated successfully!");
    } catch (err: any) {
      console.error("Failed to submit assessment", err);
      const msg = err.detail || err.message || "Failed to submit assessment. Try again.";
      setErrorMsg(msg);
      showToast("error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // Initial setup state
  if (!started) {
    return (
      <DashboardLayout title="Pure MCQ Assessment">
        <div className="max-w-[580px]">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2.5 rounded-full bg-blue-500/10 text-blue-600 font-bold">
              <HelpCircle className="w-5 h-5" />
            </span>
            <h2 className="text-heading-lg">Pure Multiple Choice Assessment</h2>
          </div>
          <p className="text-body-sm mb-6">
            Standard 25-question technical MCQ exam customized for your target job description. Covers core domain knowledge, system principles, and language nuances with zero coding questions.
          </p>

          {loadingJobs ? (
            <div className="flex items-center gap-2 py-8 text-[var(--color-ink-tertiary)]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading job profiles...</span>
            </div>
          ) : jobTargets.length === 0 ? (
            <div className="p-6 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] text-center mb-6">
              <p className="text-body-sm mb-4">No job targets found. Create a job profile first to generate MCQs.</p>
              <Link href="/dashboard/jobs/new" className="btn-primary">
                Add Job Target
              </Link>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-ink-secondary)] mb-1">
                  Target Job Profile
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="input text-[13px]"
                >
                  {jobTargets.map((jt) => (
                    <option key={jt.id} value={jt.id}>
                      {jt.role_title || "Software Engineer"} ({jt.seniority})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-4 space-y-2.5 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-ink-secondary)]">Format</span>
                  <span className="font-medium text-blue-600 font-mono">100% Multiple Choice (MCQ Only)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-ink-secondary)]">Questions</span>
                  <span className="font-medium">25 Questions</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-ink-secondary)]">Time Allowed</span>
                  <span className="font-medium">25 Minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-ink-secondary)]">AI Generation</span>
                  <span className="font-medium text-[var(--color-accent-text)] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Role Signature Tailored
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-[var(--color-error-subtle)] text-[var(--color-error)] text-[12px] rounded-[var(--radius-md)] font-medium">
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handleGenerateMCQ}
                disabled={loadingAssessment}
                className="btn-primary w-full justify-center py-3 text-[14px] bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {loadingAssessment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Custom MCQ Test...
                  </>
                ) : (
                  <>Start MCQ Exam</>
                )}
              </button>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Submitted score view
  if (submissionResult) {
    return (
      <DashboardLayout title="MCQ Exam Results">
        <div className="max-w-[560px] space-y-6">
          <div className="text-center p-6 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] shadow-sm">
            <div className="inline-flex p-3 rounded-full bg-blue-500/10 text-blue-600 mb-3">
              <Award className="w-10 h-10" />
            </div>
            <p className="text-[44px] font-bold text-[var(--color-ink-primary)] leading-none mb-1">
              {submissionResult.score}%
            </p>
            <p className="text-body-sm">Multiple-Choice Accuracy Score</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Correct Answers", value: `${submissionResult.correct_mcqs}/${submissionResult.total_mcqs}` },
              { label: "Answered", value: `${answeredCount}/${questions.length}` },
              { label: "Unanswered", value: questions.length - answeredCount },
              { label: "Status", value: submissionResult.status.toUpperCase() },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center p-3 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-md)]"
              >
                <p className="text-[16px] font-bold text-[var(--color-ink-primary)]">{stat.value}</p>
                <p className="text-caption">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setStarted(false); setSubmissionResult(null); }} className="btn-secondary">
              Retake MCQ Test
            </button>
            <Link href="/dashboard/coding" className="btn-primary">
              Switch to Real Coding IDE
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!q) {
    return (
      <DashboardLayout title="MCQ Assessment">
        <div className="flex items-center gap-2 py-8 text-[var(--color-ink-tertiary)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading question...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="MCQ Exam Workspace" wide>
      <div className="max-w-[760px] mx-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--color-border-default)]">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-[var(--color-ink-primary)] font-mono">
              Q{currentIndex + 1} of {questions.length}
            </span>
            <div className="progress-bar w-36">
              <div
                className="progress-bar-fill bg-blue-600"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
            <span className="text-[12px] text-[var(--color-ink-tertiary)]">
              ({answeredCount} answered)
            </span>
          </div>

          <div className={`flex items-center gap-1.5 text-[13px] font-medium ${isLowTime ? "timer-warning" : "text-[var(--color-ink-secondary)]"}`}>
            {isLowTime && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Question Panel */}
        <div className="p-6 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="tag bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] uppercase font-bold">
              MCQ
            </span>
            <span className="text-[10px] font-bold text-[var(--color-warning)] uppercase tracking-wide">
              {q.difficulty || "medium"}
            </span>
            {q.skill_tested && (
              <span className="text-[11px] text-[var(--color-ink-tertiary)]">· {q.skill_tested}</span>
            )}
          </div>

          <h3 className="text-[16px] text-[var(--color-ink-primary)] leading-relaxed font-semibold mb-6">
            {q.text}
          </h3>

          {/* Options */}
          <div className="space-y-2.5">
            {q.options?.map((opt: string, idx: number) => {
              const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D
              const isSelected = answers[q.id] === opt;

              return (
                <label
                  key={opt}
                  className={`radio-option cursor-pointer transition-all p-3.5 rounded-[var(--radius-md)] border flex items-center gap-3 ${
                    isSelected
                      ? "border-blue-600 bg-blue-500/5 ring-1 ring-blue-600/30"
                      : "border-[var(--color-border-default)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-sunken)]"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={opt}
                    checked={isSelected}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                    className="sr-only"
                  />
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold border transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-[var(--color-border-default)] text-[var(--color-ink-tertiary)] bg-[var(--color-surface-sunken)]"
                    }`}
                  >
                    {optionLetter}
                  </div>
                  <span className="text-[13.5px] text-[var(--color-ink-primary)] font-medium">{opt}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="btn-ghost text-[13px] disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              disabled={currentIndex === questions.length - 1}
              className="btn-ghost text-[13px] disabled:opacity-30"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMark}
              className={`btn-ghost text-[12px] ${markedForReview.has(q.id) ? "text-[var(--color-warning)] font-bold" : ""}`}
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              {markedForReview.has(q.id) ? "Marked for Review" : "Mark"}
            </button>

            <button
              onClick={handleSubmitAssessment}
              disabled={submitting}
              className="btn-primary bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Exam"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
