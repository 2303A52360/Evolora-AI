"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  BookmarkPlus,
  SkipForward,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Lightbulb,
  Loader2,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";

export default function PracticePage() {
  const [jobTargets, setJobTargets] = useState<Array<any>>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [loadingJobs, setLoadingJobs] = useState<boolean>(true);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);
  const [questions, setQuestions] = useState<Array<any>>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(new Set());
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await api.listJobTargets();
        if (res.items && res.items.length > 0) {
          setJobTargets(res.items);
          setSelectedJobId(res.items[0].id);
          loadPracticeQuestions(res.items[0].id);
        }
      } catch (err) {
        console.error("Failed to load job targets", err);
      } finally {
        setLoadingJobs(false);
      }
    }
    loadJobs();
  }, []);

  const loadPracticeQuestions = async (jobId: string) => {
    setLoadingQuestions(true);
    try {
      const data = await api.generateAssessment(jobId, "mixed", "medium");
      if (data.question_set && data.question_set.length > 0) {
        setQuestions(data.question_set);
      }
    } catch (err) {
      console.error("Failed to load practice questions", err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  if (loadingJobs || loadingQuestions) {
    return (
      <DashboardLayout title="Practice">
        <div className="flex items-center gap-2 py-8 text-[var(--color-ink-tertiary)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Generating AI practice questions...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (questions.length === 0) {
    return (
      <DashboardLayout title="Practice">
        <div className="max-w-[480px] text-center py-8">
          <h2 className="text-heading mb-2">No practice questions available</h2>
          <p className="text-body-sm mb-6">
            Create a job target first so our AI can generate customized technical practice questions.
          </p>
          <Link href="/dashboard/jobs/new" className="btn-primary">
            Add Job Target
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const q = questions[currentIndex];
  const isSubmitted = submittedQuestions.has(q.id);
  const currentAnswer = answers[q.id] || "";

  const isCorrect = q.type === "mcq"
    ? currentAnswer.trim().toLowerCase() === String(q.correct_answer || "").trim().toLowerCase()
    : currentAnswer.trim().length > 15;

  const handleSubmit = () => {
    if (!currentAnswer.trim()) return;
    setSubmittedQuestions((prev) => new Set([...prev, q.id]));
  };

  const toggleMark = () => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.add(q.id);
      return next;
    });
  };

  return (
    <DashboardLayout title="Question Practice" subtitle={q.skill_tested || "Technical Practice"}>
      <div className="max-w-[680px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-[var(--color-ink-primary)]" style={{ fontFamily: "var(--font-mono)" }}>
              Q{currentIndex + 1}/{questions.length}
            </span>
            <div className="progress-bar w-24">
              <div
                className="progress-bar-fill"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
            <span className="tag tag-accent text-[10px] uppercase">{q.type}</span>
          </div>

          <button
            onClick={toggleMark}
            className={`btn-ghost text-[11px] py-1 px-2 ${
              markedForReview.has(q.id) ? "text-[var(--color-warning)]" : ""
            }`}
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            {markedForReview.has(q.id) ? "Marked" : "Mark"}
          </button>
        </div>

        {/* Question */}
        <div className="mb-6">
          <p className="text-[15px] text-[var(--color-ink-primary)] leading-relaxed font-medium">
            {q.text}
          </p>
        </div>

        {/* Answer area */}
        {q.type === "mcq" && q.options ? (
          <div className="space-y-2 mb-6">
            {q.options.map((opt: string) => {
              const isSelected = answers[q.id] === opt;
              const showResult = isSubmitted;
              const isCorrectOption = opt === q.correct_answer;

              let optionClass = "radio-option";
              if (showResult && isCorrectOption) {
                optionClass += " border-[var(--color-success)] bg-[var(--color-success-subtle)]";
              } else if (showResult && isSelected && !isCorrectOption) {
                optionClass += " border-[var(--color-error)] bg-[var(--color-error-subtle)]";
              } else if (isSelected) {
                optionClass += " selected";
              }

              return (
                <label key={opt} className={optionClass}>
                  <input
                    type="radio"
                    name={q.id}
                    value={opt}
                    checked={isSelected}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                    className="sr-only"
                    disabled={isSubmitted}
                  />
                  <div className={`radio-dot ${isSelected ? "active" : ""}`}>
                    {isSelected && <div className="radio-dot-inner" />}
                  </div>
                  <span>{opt}</span>
                  {showResult && isCorrectOption && (
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] ml-auto" />
                  )}
                  {showResult && isSelected && !isCorrectOption && (
                    <XCircle className="w-4 h-4 text-[var(--color-error)] ml-auto" />
                  )}
                </label>
              );
            })}
          </div>
        ) : (
          <div className="mb-6">
            <textarea
              value={answers[q.id] || ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              placeholder="Write your solution or answer..."
              rows={6}
              disabled={isSubmitted}
              className="textarea"
            />
          </div>
        )}

        {/* Feedback after submission */}
        {isSubmitted && (
          <div className={`p-4 rounded-[var(--radius-lg)] border mb-6 ${
            isCorrect
              ? "bg-[var(--color-success-subtle)] border-[var(--color-success)]/20"
              : "bg-[var(--color-error-subtle)] border-[var(--color-error)]/20"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
              ) : (
                <XCircle className="w-4 h-4 text-[var(--color-error)]" />
              )}
              <span className="text-[13px] font-medium">
                {isCorrect ? "Strong Solution" : "Explanation & Key Points"}
              </span>
            </div>

            {q.explanation && (
              <p className="text-[13px] text-[var(--color-ink-secondary)] leading-relaxed">
                {q.explanation}
              </p>
            )}
            {q.expected_approach && (
              <p className="text-[13px] text-[var(--color-ink-secondary)] leading-relaxed mt-2">
                <strong>Expected Approach:</strong> {q.expected_approach}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="btn-ghost text-[13px] disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              disabled={!currentAnswer.trim()}
              className="btn-primary"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              disabled={currentIndex === questions.length - 1}
              className="btn-primary"
            >
              Next Question
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
