"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Loader2,
  Sparkles,
  Award,
  AlertCircle,
  BarChart2,
  Radio,
  FileText,
  Flame,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";

interface QuestionCritique {
  question: string;
  answer: string;
  verdict: string;
  critique: string;
}

export default function InterviewsPage() {
  const { showToast } = useToast();
  const [jobTargets, setJobTargets] = useState<Array<any>>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [loadingJobs, setLoadingJobs] = useState<boolean>(true);
  const [startingSession, setStartingSession] = useState<boolean>(false);

  const [session, setSession] = useState<any>(null);
  const [spokenTranscript, setSpokenTranscript] = useState<string>("");
  const [sendingTurn, setSendingTurn] = useState<boolean>(false);

  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Voice & Speech States
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

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

  // Text-To-Speech helper (AI Interviewer Voice)
  const speakQuestion = useCallback(
    (text: string, idx?: number) => {
      if (!voiceEnabled) return;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        if (idx !== undefined) setSpeakingIdx(idx);

        const cleanText = text.replace(/[*_#`\-\n]/g, " ");
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Daniel"))
        );
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onend = () => setSpeakingIdx(null);
        utterance.onerror = () => setSpeakingIdx(null);

        window.speechSynthesis.speak(utterance);
      }
    },
    [voiceEnabled]
  );

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
    }
  };

  // Auto-scroll chat transcript & trigger AI Voice for latest question
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });

    if (session?.transcript && session.transcript.length > 0) {
      const lastTurn = session.transcript[session.transcript.length - 1];
      if (lastTurn.role === "interviewer" && voiceEnabled) {
        speakQuestion(lastTurn.content, session.transcript.length - 1);
      }
    }
  }, [session?.transcript, voiceEnabled, speakQuestion]);

  // Speech-To-Text microphone recording setup
  const toggleListening = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast("error", "Browser does not support Speech Recognition. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        showToast("info", "Microphone listening... Speak your response clearly.");
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          }
        }
        if (finalTranscript.trim()) {
          setSpokenTranscript((prev) => (prev ? prev + " " + finalTranscript.trim() : finalTranscript.trim()));
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition", err);
      setIsListening(false);
    }
  };

  const handleStartInterview = async () => {
    if (!selectedJobId) return;
    setStartingSession(true);
    setEvalError(null);
    setSpokenTranscript("");
    try {
      const res = await api.startInterview(selectedJobId, "voice");
      setSession(res);
      setVoiceEnabled(true);
      showToast("success", "Started Live Voice AI Interview.");
    } catch (err: any) {
      console.error("Failed to start mock interview", err);
      showToast("error", err.detail || "Failed to start session. Ensure backend is running.");
    } finally {
      setStartingSession(false);
    }
  };

  const handleSendSpokenTurn = async () => {
    if (!spokenTranscript.trim() || !session || sendingTurn) return;
    stopSpeaking();
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const input = spokenTranscript.trim();
    setSpokenTranscript("");
    setSendingTurn(true);

    try {
      const updated = await api.respondInterview(session.session_id, input);
      setSession(updated);

      if (updated.status === "completed") {
        handleEvaluate(updated.session_id);
      }
    } catch (err: any) {
      console.error("Failed to process candidate spoken turn", err);
      showToast("error", "Failed to submit answer turn. Try again.");
    } finally {
      setSendingTurn(false);
    }
  };

  const handleEvaluate = async (sessionId?: string) => {
    const id = sessionId || session?.session_id;
    if (!id) return;
    stopSpeaking();
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    setEvaluating(true);
    setEvalError(null);

    try {
      const evalData = await api.evaluateInterview(id);
      setEvaluationResult(evalData);
      showToast("success", "Evaluation complete!");
    } catch (err: any) {
      console.error("Failed to evaluate interview transcript", err);
      const msg = err.detail || err.message || "Evaluation failed. Please try again.";
      setEvalError(msg);
      showToast("error", msg);
    } finally {
      setEvaluating(false);
    }
  };

  // 1. Initial Start State (PURE VOICE SETUP)
  if (!session) {
    return (
      <DashboardLayout title="Live Voice AI Mock Interview">
        <div className="max-w-[580px]">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)]">
              <Mic className="w-5 h-5 animate-pulse" />
            </span>
            <h2 className="text-heading-lg">Pure Voice AI Technical Interview</h2>
          </div>
          <p className="text-body-sm mb-6">
            Conduct a 100% voice-interactive technical interview. The AI reads questions aloud, listens to your verbal responses via microphone, and provides an **uncompromised Staff Bar-Raiser Evaluation**.
          </p>

          {loadingJobs ? (
            <div className="flex items-center gap-2 py-8 text-[var(--color-ink-tertiary)]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading target roles...</span>
            </div>
          ) : jobTargets.length === 0 ? (
            <div className="p-6 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] text-center mb-6">
              <p className="text-body-sm mb-4">No job targets found. Create a job target first to start an AI mock interview.</p>
              <Link href="/dashboard/jobs/new" className="btn-primary">
                Add Job Target
              </Link>
            </div>
          ) : (
            <div className="space-y-5 mb-6">
              {/* Job target select */}
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-ink-secondary)] mb-1">
                  Target Role Profile
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

              {/* Voice Card */}
              <div className="p-5 bg-[var(--color-surface)] border border-[var(--color-accent)]/30 rounded-[var(--radius-lg)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[var(--color-ink-primary)] flex items-center gap-2">
                    <Radio className="w-4 h-4 text-red-500 animate-pulse" /> Voice-Only Interaction
                  </span>
                  <span className="text-[11px] font-semibold bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Flame className="w-3 h-3" /> Ruthless Bar Raiser
                  </span>
                </div>
                <p className="text-[12px] text-[var(--color-ink-secondary)] leading-relaxed">
                  No text typing required. The AI speaks questions aloud, and you speak your answers directly into your microphone. Visual transcripts are displayed on screen live.
                </p>
              </div>

              <button
                onClick={handleStartInterview}
                disabled={startingSession}
                className="btn-primary w-full justify-center py-3.5 text-[14px] bg-[var(--color-accent)] text-white font-semibold"
              >
                {startingSession ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Initializing Voice Workspace...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Start Pure Voice AI Interview
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // 2. Evaluation / Results View
  if (evaluationResult) {
    const isZero = evaluationResult.overall_score === 0;

    return (
      <DashboardLayout title="Ruthless Staff Bar-Raiser Evaluation">
        <div className="max-w-[760px] space-y-6">
          {/* Header score banner */}
          <div className="flex items-center justify-between p-6 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`tag ${isZero ? "bg-red-500/10 text-red-500 border-red-500/20" : "tag-accent"} text-[11px] font-bold`}>
                  Grade {evaluationResult.grade}
                </span>
                <span className="text-[11px] font-medium text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Ruthless Staff Critique
                </span>
              </div>
              <h2 className="text-[38px] font-extrabold text-[var(--color-ink-primary)] leading-none mb-1">
                {evaluationResult.overall_score}%
              </h2>
              <p className="text-body-sm">
                {isZero ? "Session Ended With 0 Spoken Answers" : "Overall Weighted Staff Rubric Score"}
              </p>
            </div>
            <Award className="w-14 h-14 text-[var(--color-accent-text)] opacity-90" />
          </div>

          {/* Rubric Breakdown */}
          <div className="p-6 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] space-y-3">
            <h3 className="text-[14px] font-semibold text-[var(--color-ink-primary)] mb-2 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> 5-Dimension Rubric Performance (0 - 10)
            </h3>
            {Object.entries(evaluationResult.rubric_scores || {}).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between text-[13px]">
                <span className="capitalize text-[var(--color-ink-secondary)] font-medium">{key}</span>
                <div className="flex items-center gap-3 w-56">
                  <div className="progress-bar flex-1">
                    <div
                      className={`progress-bar-fill ${Number(val) === 0 ? "bg-red-500" : Number(val) < 6 ? "bg-red-500" : Number(val) < 8 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${(Number(val) / 10) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-[12px] font-bold w-8 text-right">{String(val)}/10</span>
                </div>
              </div>
            ))}
          </div>

          {/* TURN-BY-TURN RUTHLESS CRITIQUES */}
          {evaluationResult.question_critiques && evaluationResult.question_critiques.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-bold text-[var(--color-ink-primary)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--color-accent-text)]" />
                Turn-by-Turn Technical Critiques
              </h3>

              <div className="space-y-3">
                {evaluationResult.question_critiques.map((qc: QuestionCritique, idx: number) => {
                  const isWeak = qc.verdict?.toLowerCase().includes("weak") || qc.verdict?.toLowerCase().includes("hand-waving") || qc.verdict?.toLowerCase().includes("failed") || qc.verdict?.toLowerCase().includes("unanswered");
                  const isStrong = qc.verdict?.toLowerCase().includes("exceptional") || qc.verdict?.toLowerCase().includes("strong");

                  return (
                    <div
                      key={idx}
                      className="p-4 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-mono font-bold text-[var(--color-ink-tertiary)]">Q{idx + 1}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isWeak
                              ? "bg-red-500/10 text-red-500 border border-red-500/20"
                              : isStrong
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}
                        >
                          Verdict: {qc.verdict}
                        </span>
                      </div>

                      <p className="text-[13px] font-semibold text-[var(--color-ink-primary)]">
                        {qc.question}
                      </p>

                      <div className="p-3 bg-[var(--color-surface-sunken)] rounded-[var(--radius-md)] text-[12px] text-[var(--color-ink-secondary)] italic">
                        &ldquo;{qc.answer || "No response provided"}&rdquo;
                      </div>

                      <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-[var(--radius-md)] text-[12px] text-[var(--color-ink-primary)] leading-relaxed font-medium space-y-1">
                        <span className="text-red-500 font-bold block flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 inline" /> Staff Engineer Critique:
                        </span>
                        <span>{qc.critique}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Strengths & Flaws */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--color-success-subtle)] border border-[var(--color-success)]/20 rounded-[var(--radius-lg)]">
              <h4 className="text-[13px] font-bold text-[var(--color-success)] mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Technical Strengths
              </h4>
              <ul className="text-[12px] text-[var(--color-ink-primary)] space-y-1.5 list-disc pl-4 font-medium">
                {evaluationResult.strengths?.map((s: string, idx: number) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-[var(--color-error-subtle)] border border-[var(--color-error)]/20 rounded-[var(--radius-lg)]">
              <h4 className="text-[13px] font-bold text-[var(--color-error)] mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Priority Areas to Improve
              </h4>
              <ul className="text-[12px] text-[var(--color-ink-primary)] space-y-1.5 list-disc pl-4 font-medium">
                {evaluationResult.weaknesses?.map((w: string, idx: number) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => { setSession(null); setEvaluationResult(null); }} className="btn-secondary">
              Start New Voice Interview
            </button>
            <Link href="/dashboard/preparation" className="btn-primary">
              View Updated Study Plan
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 3. PURE VOICE INTERVIEW WORKSPACE (NO TEXT INPUT BOX!)
  return (
    <DashboardLayout title="Pure Voice AI Interview Workspace" wide>
      <div className="flex flex-col h-[calc(100vh-140px)] max-w-[840px] mx-auto">
        {/* Status Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-t-[var(--radius-lg)]">
          <div className="flex items-center gap-3 text-[13px]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-bold text-[var(--color-ink-primary)] flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-[var(--color-accent-text)]" /> Live Voice AI Interview
            </span>
            <span className="text-[var(--color-ink-tertiary)] font-mono text-[12px]">
              · Q{session.current_question_index + 1} of {session.total_questions}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Voice Output Toggle */}
            <button
              onClick={() => {
                if (voiceEnabled) {
                  stopSpeaking();
                  setVoiceEnabled(false);
                } else {
                  setVoiceEnabled(true);
                }
              }}
              className={`btn-ghost text-[12px] py-1 px-2 flex items-center gap-1.5 ${voiceEnabled ? "text-[var(--color-accent-text)] font-medium" : ""}`}
              title={voiceEnabled ? "Mute AI voice output" : "Unmute AI voice output"}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4 text-[var(--color-accent)]" /> : <VolumeX className="w-4 h-4" />}
              {voiceEnabled ? "AI Voice ON" : "AI Voice Muted"}
            </button>

            {/* Finish & Evaluate Button */}
            <button
              onClick={() => handleEvaluate()}
              disabled={evaluating}
              className="btn-primary text-[12px] py-1.5 px-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {evaluating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Evaluating...
                </>
              ) : (
                "Finish & Evaluate"
              )}
            </button>
          </div>
        </div>

        {evalError && (
          <div className="p-3 bg-[var(--color-error-subtle)] text-[var(--color-error)] text-[12px] font-medium border-x border-[var(--color-border-default)] flex items-center justify-between">
            <span>{evalError}</span>
            <button onClick={() => handleEvaluate()} className="underline text-[11px]">Retry Evaluation</button>
          </div>
        )}

        {/* Live Transcript Display Window */}
        <div className="flex-1 overflow-y-auto p-4 bg-[var(--color-surface-sunken)] border-x border-[var(--color-border-default)] space-y-4">
          {session.transcript.map((msg: any, idx: number) => {
            const isInterviewer = msg.role === "interviewer";
            const isSpeakingThis = speakingIdx === idx;

            return (
              <div
                key={idx}
                className={`flex flex-col ${isInterviewer ? "items-start" : "items-end"}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[var(--color-ink-tertiary)] font-medium">
                  <span>{isInterviewer ? "AI Interviewer (Spoken Audio)" : "You (Spoken Voice Transcript)"}</span>
                  {isInterviewer && (
                    <button
                      onClick={() => (isSpeakingThis ? stopSpeaking() : speakQuestion(msg.content, idx))}
                      className="hover:text-[var(--color-accent-text)] transition-colors"
                      title="Replay spoken question"
                    >
                      {isSpeakingThis ? <VolumeX className="w-3 h-3 text-[var(--color-accent)] animate-pulse" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                <div
                  className={`p-4 rounded-[var(--radius-lg)] text-[13.5px] leading-relaxed max-w-[88%] relative ${
                    isInterviewer
                      ? `bg-[var(--color-surface)] text-[var(--color-ink-primary)] border ${isSpeakingThis ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20" : "border-[var(--color-border-default)]"}`
                      : "bg-[var(--color-accent)] text-white font-medium shadow-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}

          {sendingTurn && (
            <div className="flex items-center gap-2 py-2 text-[12px] text-[var(--color-ink-tertiary)] font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-accent)]" />
              <span>Analyzing candidate spoken response...</span>
            </div>
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* PURE VOICE MICROPHONE CONTROL HUB (NO TEXTAREA TEXT INPUT!) */}
        <div className="p-6 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-b-[var(--radius-lg)] flex flex-col items-center gap-4">
          
          {/* Spoken Voice Live Captions / Transcript Preview */}
          <div className="w-full min-h-[56px] max-h-[100px] overflow-y-auto p-3 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-md)] text-[13px] leading-relaxed text-[var(--color-ink-primary)] flex items-center justify-center text-center italic">
            {isListening ? (
              <span className="text-[var(--color-accent-text)] font-medium flex items-center gap-2">
                <Radio className="w-4 h-4 animate-pulse text-red-500" />
                {spokenTranscript || "Listening... Speak your answer now."}
              </span>
            ) : spokenTranscript ? (
              <span className="not-italic text-[var(--color-ink-primary)] font-medium">
                &ldquo;{spokenTranscript}&rdquo;
              </span>
            ) : (
              <span className="text-[var(--color-ink-tertiary)] not-italic text-[12px]">
                Tap the Microphone button below to speak your response aloud.
              </span>
            )}
          </div>

          {/* Controls: Record & Send */}
          <div className="flex items-center gap-3 w-full max-w-md justify-center">
            {/* Clear Spoken Answer Button */}
            {spokenTranscript && !isListening && (
              <button
                type="button"
                onClick={() => setSpokenTranscript("")}
                className="btn-secondary py-2.5 px-3 text-[12px] flex items-center gap-1.5"
                title="Clear spoken response"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Spoken Answer
              </button>
            )}

            {/* Giant Central Microphone Recording Button */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={sendingTurn || session.status === "completed"}
              className={`py-3 px-6 rounded-full font-bold text-[14px] flex items-center gap-2.5 transition-all shadow-md ${
                isListening
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse ring-4 ring-red-500/20"
                  : "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white"
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span>{isListening ? "Listening... Stop Mic" : "Tap to Speak Answer"}</span>
            </button>

            {/* Send Spoken Answer Button */}
            {spokenTranscript && (
              <button
                type="button"
                onClick={handleSendSpokenTurn}
                disabled={sendingTurn || session.status === "completed"}
                className="btn-primary py-2.5 px-4 text-[13px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
              >
                {sendingTurn ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Submit Spoken Answer</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
