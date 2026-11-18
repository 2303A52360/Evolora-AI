"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  CheckCircle2,
  Brain,
  Loader2,
  Sparkles,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";

export default function FlashcardsPage() {
  const [jobTargets, setJobTargets] = useState<Array<any>>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingCards, setLoadingCards] = useState<boolean>(false);
  const [cards, setCards] = useState<Array<any>>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mastered, setMastered] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await api.listJobTargets();
        if (res.items && res.items.length > 0) {
          setJobTargets(res.items);
          setSelectedJobId(res.items[0].id);
          loadFlashcards(res.items[0].id);
        }
      } catch (err) {
        console.error("Failed to load job targets", err);
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  const loadFlashcards = async (jobId: string) => {
    setLoadingCards(true);
    setIsFlipped(false);
    setCurrentIndex(0);
    try {
      // Generate a set of questions to use as flashcards
      const data = await api.generateAssessment(jobId, "mixed", "medium");
      if (data.question_set && data.question_set.length > 0) {
        setCards(data.question_set);
      }
    } catch (err) {
      console.error("Failed to load flashcards", err);
    } finally {
      setLoadingCards(false);
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => Math.min(cards.length - 1, prev + 1));
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    }, 150);
  };

  const toggleMastered = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMastered((prev) => {
      const next = new Set(prev);
      if (next.has(cards[currentIndex].id)) {
        next.delete(cards[currentIndex].id);
      } else {
        next.add(cards[currentIndex].id);
      }
      return next;
    });
  };

  if (loading || loadingCards) {
    return (
      <DashboardLayout title="AI Flashcards">
        <div className="flex flex-col items-center justify-center py-20 text-[var(--color-ink-tertiary)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)] mb-4" />
          <p className="text-[14px] font-medium text-[var(--color-ink-primary)]">
            Generating AI flashcards for your role...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (cards.length === 0) {
    return (
      <DashboardLayout title="AI Flashcards">
        <div className="max-w-[480px] text-center py-16 mx-auto">
          <Brain className="w-12 h-12 text-[var(--color-ink-tertiary)] mx-auto mb-4" />
          <h2 className="text-display mb-2 text-[24px]">No flashcards available</h2>
          <p className="text-body-sm mb-6">
            Create a job target first so our AI can generate customized study cards for you.
          </p>
          <Link href="/dashboard/jobs/new" className="btn-primary">
            Add Job Target
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const currentCard = cards[currentIndex];
  const isMastered = mastered.has(currentCard.id);
  const progress = Math.round((mastered.size / cards.length) * 100);

  return (
    <DashboardLayout title="AI Flashcards">
      <div className="max-w-[720px] mx-auto">
        {/* Header & Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-heading-lg mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--color-accent)]" /> 
              Topic: {currentCard.skill_tested || "General"}
            </h2>
            <p className="text-body-sm">
              Tap the card to flip and review the answer.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-[var(--color-surface)] p-3 rounded-[var(--radius-lg)] border border-[var(--color-border-default)]">
            <div className="text-right">
              <p className="text-[11px] text-[var(--color-ink-tertiary)] font-semibold uppercase tracking-wider mb-1">
                Mastery
              </p>
              <p className="text-[14px] font-bold text-[var(--color-ink-primary)]">
                {mastered.size} / {cards.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-[var(--color-surface-sunken)] flex items-center justify-center relative">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="4"
                  strokeDasharray={`${(progress / 100) * 138} 138`}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <span className="text-[11px] font-bold text-[var(--color-ink-primary)]">{progress}%</span>
            </div>
          </div>
        </div>

        {/* 3D Flashcard Container */}
        <div className="relative w-full h-[360px] perspective-1000 group cursor-pointer mb-8" onClick={() => setIsFlipped(!isFlipped)}>
          <div 
            className={`w-full h-full transition-transform duration-500 ease-out preserve-3d shadow-sm hover:shadow-md rounded-[var(--radius-xl)] ${isFlipped ? 'rotate-y-180' : ''}`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front of Card (Question) */}
            <div 
              className="absolute inset-0 w-full h-full backface-hidden bg-[var(--color-surface)] border-2 border-[var(--color-border-default)] rounded-[var(--radius-xl)] flex flex-col items-center justify-center p-8 sm:p-12 text-center"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <span className="absolute top-4 left-5 text-[12px] font-bold text-[var(--color-ink-tertiary)] uppercase tracking-widest">Question</span>
              <span className="absolute top-4 right-5 text-[12px] font-medium text-[var(--color-ink-tertiary)] bg-[var(--color-surface-sunken)] px-2 py-1 rounded-full">
                {currentIndex + 1} / {cards.length}
              </span>
              
              <h3 className="text-[20px] sm:text-[24px] font-semibold text-[var(--color-ink-primary)] leading-snug">
                {currentCard.text}
              </h3>
              
              <div className="absolute bottom-6 flex items-center gap-2 text-[var(--color-ink-tertiary)] animate-pulse">
                <RotateCw className="w-4 h-4" />
                <span className="text-[13px]">Tap to flip</span>
              </div>
            </div>

            {/* Back of Card (Answer) */}
            <div 
              className="absolute inset-0 w-full h-full backface-hidden bg-[var(--color-surface-sunken)] border-2 border-[var(--color-accent)] rounded-[var(--radius-xl)] flex flex-col p-8 sm:p-12 overflow-y-auto"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <span className="absolute top-4 left-5 text-[12px] font-bold text-[var(--color-accent)] uppercase tracking-widest">Answer</span>
              
              <div className="my-auto">
                {currentCard.type === "mcq" ? (
                  <div className="space-y-4">
                    <p className="text-[18px] font-semibold text-[var(--color-ink-primary)]">Correct Answer:</p>
                    <div className="p-4 bg-[var(--color-success-subtle)] border border-[var(--color-success)]/30 rounded-[var(--radius-lg)] text-[var(--color-success)] font-medium text-[16px]">
                      {currentCard.correct_answer}
                    </div>
                    {currentCard.explanation && (
                      <p className="text-[14px] text-[var(--color-ink-secondary)] mt-4 leading-relaxed">
                        <span className="font-semibold text-[var(--color-ink-primary)]">Explanation: </span>
                        {currentCard.explanation}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[16px] text-[var(--color-ink-secondary)] leading-relaxed">
                      {currentCard.explanation || "No explicit explanation provided for this conceptual question. Focus on defining the core concept and its trade-offs."}
                    </p>
                    {currentCard.expected_approach && (
                      <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)]">
                        <p className="text-[13px] font-semibold text-[var(--color-ink-primary)] mb-1">Key talking points:</p>
                        <p className="text-[13px] text-[var(--color-ink-secondary)]">{currentCard.expected_approach}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="btn-secondary h-12 px-6 disabled:opacity-30 flex items-center gap-2 transition-all hover:-translate-x-1"
          >
            <ChevronLeft className="w-5 h-5" /> Prev
          </button>

          <button
            onClick={toggleMastered}
            className={`h-12 px-8 rounded-full font-bold text-[14px] flex items-center gap-2 transition-all ${
              isMastered 
                ? "bg-[var(--color-success-subtle)] text-[var(--color-success)] border-2 border-[var(--color-success)]/30"
                : "bg-[var(--color-surface)] text-[var(--color-ink-secondary)] border-2 border-[var(--color-border-strong)] hover:border-[var(--color-ink-primary)] hover:text-[var(--color-ink-primary)]"
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            {isMastered ? "Mastered" : "Mark as Mastered"}
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === cards.length - 1}
            className="btn-primary h-12 px-6 disabled:opacity-30 flex items-center gap-2 transition-all hover:translate-x-1"
          >
            Next <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
