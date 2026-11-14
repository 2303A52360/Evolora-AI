"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import {
  FileText, Plus, Trash2, Download, ChevronDown, ChevronUp,
  Loader2, CheckCircle2, AlertCircle, Target, Sparkles, Upload, FileCode,
  Eye, Split, Code,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────── */

interface Experience {
  title: string; company: string; start_date: string; end_date: string; bullets: string[];
}
interface Education {
  degree: string; school: string; year: string;
}
interface Profile {
  full_name: string; email: string; phone: string; location: string;
  linkedin_url: string; summary: string; experience: Experience[];
  education: Education[]; skills: string[];
}
interface ResumeResult {
  id: string; ats_score: number; ats_breakdown: Record<string, number>;
  total_attempts: number; status: string; latex_source: string | null;
  iterations: Array<{ attempt: number; score: number; breakdown: Record<string, number>; gaps: string[] }>;
  length_mode: string; created_at: string;
}
interface JobOption {
  id: string; role_title: string | null; required_skills: string[];
}

const emptyExp: Experience = { title: "", company: "", start_date: "", end_date: "Present", bullets: [""] };
const emptyEdu: Education = { degree: "", school: "", year: "" };

const defaultProfile: Profile = {
  full_name: "", email: "", phone: "", location: "", linkedin_url: "",
  summary: "", experience: [{ ...emptyExp }], education: [{ ...emptyEdu }], skills: [],
};

/* ── Score Ring ─────────────────────────────────────────────────────── */

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 90 ? "var(--color-success)" : score >= 70 ? "var(--color-warning)" : "var(--color-error)";
  return (
    <svg width={size} height={size} className="block">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-border-default)" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em"
        style={{ fontSize: size * 0.28, fontWeight: 700, fill: color }}>{Math.round(score)}</text>
    </svg>
  );
}

/* ── Rubric Bar ────────────────────────────────────────────────────── */

function RubricBar({ label, value, max = 20 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color = pct >= 85 ? "var(--color-success)" : pct >= 60 ? "var(--color-warning)" : "var(--color-error)";
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-[var(--color-ink-secondary)] w-[140px] shrink-0 truncate">{label}</span>
      <div className="flex-1 h-[6px] rounded-full bg-[var(--color-surface-sunken)] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: "width 0.6s ease" }} />
      </div>
      <span className="text-[12px] font-semibold w-[40px] text-right" style={{ color }}>{value}/{max}</span>
    </div>
  );
}

const rubricLabels: Record<string, string> = {
  keyword_coverage: "Keyword Coverage",
  structure: "Section Structure",
  ats_safe_formatting: "ATS-Safe Format",
  quantified_bullets: "Quantified Bullets",
  length_density: "Length & Density",
};

/* ── Visual Resume Preview Canvas ──────────────────────────────────── */

function VisualResumePreview({ profile, latexSource }: { profile: Profile; latexSource?: string | null }) {
  return (
    <div className="bg-white text-gray-900 font-sans p-8 rounded-[var(--radius-lg)] shadow-md border border-gray-200 w-full min-h-[750px] leading-relaxed text-[13px] overflow-auto">
      {/* Document Header */}
      <div className="text-center border-b border-gray-300 pb-4 mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">{profile.full_name || "Candidate Name"}</h1>
        <div className="text-xs text-gray-600 flex items-center justify-center flex-wrap gap-2 mt-1.5 font-medium">
          {profile.location && <span>{profile.location}</span>}
          {profile.location && profile.phone && <span>•</span>}
          {profile.phone && <span>{profile.phone}</span>}
          {(profile.phone || profile.location) && profile.email && <span>•</span>}
          {profile.email && <span>{profile.email}</span>}
          {profile.linkedin_url && (
            <>
              <span>•</span>
              <span className="text-blue-600 underline">{profile.linkedin_url}</span>
            </>
          )}
        </div>
      </div>

      {/* Professional Summary */}
      {profile.summary && (
        <div className="mb-5">
          <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider border-b border-gray-300 pb-1 mb-2">
            Professional Summary
          </h2>
          <p className="text-gray-700 leading-normal text-[12px]">{profile.summary}</p>
        </div>
      )}

      {/* Experience */}
      {profile.experience && profile.experience.length > 0 && (
        <div className="mb-5">
          <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider border-b border-gray-300 pb-1 mb-3">
            Experience
          </h2>
          <div className="space-y-4">
            {profile.experience.map((exp, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-baseline font-semibold text-gray-900 text-[13px]">
                  <span>{exp.title}</span>
                  <span className="text-xs font-normal text-gray-600">{exp.start_date} – {exp.end_date}</span>
                </div>
                <div className="text-xs italic text-gray-700 font-medium mb-1">{exp.company}</div>
                <ul className="list-disc list-inside space-y-1 text-[12px] text-gray-700 pl-1">
                  {exp.bullets && exp.bullets.map((b, bIdx) => (
                    b.trim() ? <li key={bIdx} className="leading-snug">{b}</li> : null
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {profile.education && profile.education.length > 0 && (
        <div className="mb-5">
          <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider border-b border-gray-300 pb-1 mb-2">
            Education
          </h2>
          <div className="space-y-2">
            {profile.education.map((edu, idx) => (
              <div key={idx} className="flex justify-between items-baseline text-[12px]">
                <div>
                  <span className="font-bold text-gray-900">{edu.degree}</span>
                  {edu.school && <span className="text-gray-600">, {edu.school}</span>}
                </div>
                {edu.year && <span className="text-xs text-gray-600">{edu.year}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {profile.skills && profile.skills.length > 0 && (
        <div>
          <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider border-b border-gray-300 pb-1 mb-2">
            Technical Skills
          </h2>
          <div className="text-[12px] text-gray-800">
            <span className="font-semibold text-gray-900">Skills: </span>
            {profile.skills.join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────── */

export default function ResumePage() {
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [profile, setProfile] = useState<Profile>({ ...defaultProfile });
  const [lengthMode, setLengthMode] = useState<"full" | "half">("full");
  const [skillInput, setSkillInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [error, setError] = useState("");
  const [showIterations, setShowIterations] = useState(false);
  const [step, setStep] = useState<"form" | "result">("form");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parsingText, setParsingText] = useState(false);
  const [parseSuccess, setParseSuccess] = useState("");
  const [importTab, setImportTab] = useState<"file" | "paste">("file");
  const [viewMode, setViewMode] = useState<"split" | "preview" | "code">("split");
  const [compiledPdfB64, setCompiledPdfB64] = useState<string | null>(null);
  const [compilingPdf, setCompilingPdf] = useState(false);
  const [refiningProfile, setRefiningProfile] = useState(false);

  const handleCompilePdf = async () => {
    if (!result?.latex_source) return;
    setCompilingPdf(true);
    try {
      const res = await api.compileLatex(result.latex_source);
      if (res.pdf_compiled && res.pdf_b64) {
        setCompiledPdfB64(res.pdf_b64);
      } else {
        alert(res.compilation_error || "PDF compiler message: Visual document preview rendered.");
      }
    } catch {
      alert("PDF compile service unavailable. Displaying visual document preview.");
    } finally {
      setCompilingPdf(false);
    }
  };

  useEffect(() => {
    // Load saved candidate profile from localStorage if available
    try {
      const savedProfile = localStorage.getItem("evolora_candidate_profile");
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
    } catch {}

    api.listJobTargets(1, 50).then((d) => {
      const processedJobs = d.items.filter((j) => j.is_processed).map((j) => ({
        id: j.id, role_title: j.role_title, required_skills: j.required_skills,
      }));
      setJobs(processedJobs);

      // Check if jobId query parameter is present in URL
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const qJobId = urlParams.get("jobId") || urlParams.get("job");
        if (qJobId && processedJobs.some((j) => j.id === qJobId)) {
          setSelectedJob(qJobId);
        } else if (processedJobs.length > 0) {
          setSelectedJob(processedJobs[0].id);
        }
      }
    }).catch(() => {});
  }, []);

  // Save profile to localStorage whenever it changes
  useEffect(() => {
    if (profile.full_name || profile.email) {
      try {
        localStorage.setItem("evolora_candidate_profile", JSON.stringify(profile));
      } catch {}
    }
  }, [profile]);

  /* ── Upload & Parsing Handlers ───────────────────────────────────── */

  const sanitizeSummary = (summaryStr: string): string => {
    if (!summaryStr) return "";
    const cleaned = summaryStr
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "")
      .replace(/\(?\+?\d{1,3}\)?[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g, "")
      .replace(/(https?:\/\/)?(www\.)?(linkedin|github)\.com\/\S+/gi, "")
      .replace(/(https?:\/\/)?\S+\.(me|com|org|net|io|dev)\b\S*/gi, "")
      .replace(/\b(portfolio|github|linkedin|email|phone|contact|location):\s*\S*/gi, "")
      .replace(/[\s|•·,-]{2,}/g, " ")
      .trim();
    return cleaned.length > 15 ? cleaned : "";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setError("");
    setParseSuccess("");

    try {
      const parsed = await api.uploadAndParseResumeFile(file);
      const cleanExp = (parsed.experience || []).map((exp: any) => ({
        title: exp.title || "Experience",
        company: exp.company || "",
        start_date: exp.start_date || "",
        end_date: exp.end_date || "Present",
        bullets: exp.bullets?.length ? exp.bullets : [""],
      }));
      const cleanEdu = (parsed.education || []).map((edu: any) => ({
        degree: edu.degree || "",
        school: edu.school || "",
        year: edu.year || "",
      }));

      setProfile((prev) => ({
        full_name: parsed.full_name || prev.full_name,
        email: parsed.email || prev.email,
        phone: parsed.phone || prev.phone,
        location: parsed.location || prev.location,
        linkedin_url: parsed.linkedin_url || prev.linkedin_url,
        summary: sanitizeSummary(parsed.summary) || prev.summary,
        experience: cleanExp.length ? cleanExp : prev.experience,
        education: cleanEdu.length ? cleanEdu : prev.education,
        skills: parsed.skills?.length ? parsed.skills : prev.skills,
      }));
      setParseSuccess(`Extracted candidate profile: ${cleanExp.length} roles, ${cleanEdu.length} degrees, ${parsed.skills?.length || 0} skills! Form fully populated.`);
    } catch (err: any) {
      setError(err?.detail || "Failed to extract profile from uploaded file.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleParseText = async () => {
    if (!pasteText.trim()) return;
    setParsingText(true);
    setError("");
    setParseSuccess("");
    try {
      const parsed = await api.parseResumeText(pasteText);
      const cleanExp = (parsed.experience || []).map((exp: any) => ({
        title: exp.title || "Experience",
        company: exp.company || "",
        start_date: exp.start_date || "",
        end_date: exp.end_date || "Present",
        bullets: exp.bullets?.length ? exp.bullets : [""],
      }));
      const cleanEdu = (parsed.education || []).map((edu: any) => ({
        degree: edu.degree || "",
        school: edu.school || "",
        year: edu.year || "",
      }));

      setProfile((prev) => ({
        full_name: parsed.full_name || prev.full_name,
        email: parsed.email || prev.email,
        phone: parsed.phone || prev.phone,
        location: parsed.location || prev.location,
        linkedin_url: parsed.linkedin_url || prev.linkedin_url,
        summary: sanitizeSummary(parsed.summary) || prev.summary,
        experience: cleanExp.length ? cleanExp : prev.experience,
        education: cleanEdu.length ? cleanEdu : prev.education,
        skills: parsed.skills?.length ? parsed.skills : prev.skills,
      }));
      setParseSuccess(`Extracted candidate profile: ${cleanExp.length} roles, ${cleanEdu.length} degrees, ${parsed.skills?.length || 0} skills! Form fully populated.`);
      setPasteText("");
    } catch (err: any) {
      setError(err?.detail || "Failed to parse resume text.");
    } finally {
      setParsingText(false);
    }
  };

  const handleRefineProfile = async () => {
    setRefiningProfile(true);
    setError("");
    setParseSuccess("");
    try {
      const refined = await api.refineProfile(profile);
      const cleanExp = (refined.experience || []).map((exp: any) => ({
        title: exp.title || "Software Engineer",
        company: exp.company || "Technology Organization",
        start_date: exp.start_date || "",
        end_date: exp.end_date || "Present",
        bullets: exp.bullets?.length ? exp.bullets : [""],
      }));
      const cleanEdu = (refined.education || []).map((edu: any) => ({
        degree: edu.degree || "",
        school: edu.school || "",
        year: edu.year || "",
      }));

      setProfile({
        full_name: refined.full_name || profile.full_name,
        email: refined.email || profile.email,
        phone: refined.phone || profile.phone,
        location: refined.location || profile.location,
        linkedin_url: refined.linkedin_url || profile.linkedin_url,
        summary: sanitizeSummary(refined.summary) || profile.summary,
        experience: cleanExp.length ? cleanExp : profile.experience,
        education: cleanEdu.length ? cleanEdu : profile.education,
        skills: refined.skills?.length ? refined.skills : profile.skills,
      });
      setParseSuccess("✨ Candidate profile refined & auto-filled with AI! All roles, bullet points, and skills organized cleanly.");
    } catch (err: any) {
      setError(err?.detail || "Failed to refine candidate profile.");
    } finally {
      setRefiningProfile(false);
    }
  };

  /* ── Profile field helpers ────────────────────────────────────────── */

  const updateField = (field: keyof Profile, value: string) =>
    setProfile((p) => ({ ...p, [field]: value }));

  const updateExp = (i: number, field: keyof Experience, value: string | string[]) =>
    setProfile((p) => {
      const exp = [...p.experience];
      exp[i] = { ...exp[i], [field]: value };
      return { ...p, experience: exp };
    });

  const addExp = () => setProfile((p) => ({ ...p, experience: [...p.experience, { ...emptyExp }] }));
  const removeExp = (i: number) => setProfile((p) => ({ ...p, experience: p.experience.filter((_, idx) => idx !== i) }));

  const updateEdu = (i: number, field: keyof Education, value: string) =>
    setProfile((p) => {
      const edu = [...p.education];
      edu[i] = { ...edu[i], [field]: value };
      return { ...p, education: edu };
    });

  const addEdu = () => setProfile((p) => ({ ...p, education: [...p.education, { ...emptyEdu }] }));
  const removeEdu = (i: number) => setProfile((p) => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !profile.skills.includes(s)) {
      setProfile((p) => ({ ...p, skills: [...p.skills, s] }));
      setSkillInput("");
    }
  };
  const removeSkill = (s: string) => setProfile((p) => ({ ...p, skills: p.skills.filter((x) => x !== s) }));

  const updateBullet = (expIdx: number, bIdx: number, value: string) =>
    setProfile((p) => {
      const exp = [...p.experience];
      const bullets = [...exp[expIdx].bullets];
      bullets[bIdx] = value;
      exp[expIdx] = { ...exp[expIdx], bullets };
      return { ...p, experience: exp };
    });

  const addBullet = (expIdx: number) =>
    setProfile((p) => {
      const exp = [...p.experience];
      exp[expIdx] = { ...exp[expIdx], bullets: [...exp[expIdx].bullets, ""] };
      return { ...p, experience: exp };
    });

  const removeBullet = (expIdx: number, bIdx: number) =>
    setProfile((p) => {
      const exp = [...p.experience];
      exp[expIdx] = { ...exp[expIdx], bullets: exp[expIdx].bullets.filter((_, i) => i !== bIdx) };
      return { ...p, experience: exp };
    });

  /* ── Generate ────────────────────────────────────────────────────── */

  const handleGenerate = async () => {
    if (!selectedJob) { setError("Select a job target first."); return; }
    if (!profile.full_name.trim()) { setError("Enter your full name."); return; }
    setError(""); setLoading(true);
    try {
      const res = await api.generateResume(selectedJob, profile, lengthMode);
      setResult(res);
      setStep("result");
    } catch (e: any) {
      setError(e?.detail || "Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result?.latex_source) return;
    const blob = new Blob([result.latex_source], { type: "application/x-tex" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `resume_${result.id}.tex`; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── RESULT VIEW ─────────────────────────────────────────────────── */

  if (step === "result" && result) {
    const reached90 = result.ats_score >= 90;
    return (
      <DashboardLayout title="Resume Builder" subtitle="ATS-optimized resume" wide={true}>
        <div className="w-full space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button onClick={() => setStep("form")} className="btn-ghost text-[13px]">← Back to form</button>
            <button onClick={handleDownload} className="btn-primary" disabled={!result.latex_source}>
              <Download className="w-4 h-4" /> Download .tex
            </button>
          </div>

          {/* Score card */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ScoreRing score={result.ats_score} size={140} />
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-heading-lg mb-1">
                  {reached90 ? "ATS Score Target Reached!" : "ATS Rubric Score"}
                </h2>
                <p className="text-body-sm mb-3">
                  {reached90
                    ? `Your resume scored ${Math.round(result.ats_score)}/100 on Evolora's ATS rubric in ${result.total_attempts} attempt${result.total_attempts > 1 ? "s" : ""}.`
                    : `Best score across ${result.total_attempts} attempts. The 90+ target was not reached — here's the best result.`
                  }
                </p>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className={`tag ${reached90 ? "tag-success" : "tag-warning"}`}>
                    {reached90 ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                    {reached90 ? "Target reached" : "Below target"}
                  </span>
                  <span className="tag">{result.length_mode === "full" ? "Full page" : "Half page"}</span>
                  <span className="tag">{result.total_attempts} iteration{result.total_attempts > 1 ? "s" : ""}</span>
                </div>
                <p className="text-caption mt-3">
                  This is Evolora&apos;s own rubric-based estimate, not a certification from any third-party ATS.
                </p>
              </div>
            </div>
          </div>

          {/* Rubric breakdown */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-6">
            <h3 className="text-heading mb-4">Rubric Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(result.ats_breakdown).map(([key, val]) => (
                <RubricBar key={key} label={rubricLabels[key] || key} value={val as number} />
              ))}
            </div>
          </div>

          {/* Iteration history */}
          {result.iterations.length > 1 && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-6">
              <button onClick={() => setShowIterations(!showIterations)}
                className="flex items-center gap-2 w-full text-left">
                <h3 className="text-heading flex-1">Iteration History ({result.iterations.length} attempts)</h3>
                {showIterations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showIterations && (
                <div className="mt-4 space-y-3">
                  {result.iterations.map((it) => (
                    <div key={it.attempt} className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-semibold">Attempt {it.attempt}</span>
                        <span className={`tag ${it.score >= 90 ? "tag-success" : it.score >= 70 ? "tag-warning" : "tag-error"}`}>
                          {Math.round(it.score)}/100
                        </span>
                      </div>
                      {it.gaps.length > 0 && (
                        <ul className="text-[12px] text-[var(--color-ink-secondary)] space-y-1 mt-2">
                          {it.gaps.map((g, i) => <li key={i}>• {g}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Interactive Workspace: Visual Preview & Editable LaTeX Source */}
          {result.latex_source && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-body-sm font-semibold mr-2">View:</span>
                  <button
                    type="button"
                    onClick={() => setViewMode("split")}
                    className={`btn-sm text-[12px] ${viewMode === "split" ? "btn-primary" : "btn-ghost"}`}
                  >
                    <Split className="w-3.5 h-3.5 mr-1" /> Side-by-Side
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("preview")}
                    className={`btn-sm text-[12px] ${viewMode === "preview" ? "btn-primary" : "btn-ghost"}`}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Visual Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("code")}
                    className={`btn-sm text-[12px] ${viewMode === "code" ? "btn-primary" : "btn-ghost"}`}
                  >
                    <Code className="w-3.5 h-3.5 mr-1" /> LaTeX Source
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCompilePdf}
                    disabled={compilingPdf || !result.latex_source}
                    className="btn-secondary text-[12px]"
                  >
                    {compilingPdf ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Compiling...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1 text-[var(--color-accent)]" /> Re-Compile PDF
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (result.latex_source) {
                        navigator.clipboard.writeText(result.latex_source);
                        alert("LaTeX source code copied to clipboard!");
                      }
                    }}
                    className="btn-ghost text-[12px]"
                  >
                    Copy Code
                  </button>
                  <button type="button" onClick={handleDownload} className="btn-primary text-[12px]">
                    <Download className="w-3.5 h-3.5 mr-1" /> Download .tex
                  </button>
                </div>
              </div>

              {/* Workspace Body */}
              <div>
                {viewMode === "split" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Left: LaTeX Code Editor */}
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-5 space-y-3">
                      <h3 className="text-heading text-[14px] flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-[var(--color-accent)]" /> LaTeX Source Code
                        </span>
                        <span className="text-[11px] text-[var(--color-ink-secondary)] font-normal">Editable</span>
                      </h3>
                      <textarea
                        className="textarea font-mono text-[11px] leading-relaxed min-h-[750px] bg-[var(--color-surface-sunken)] p-4 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] w-full"
                        value={result.latex_source}
                        onChange={(e) => setResult({ ...result, latex_source: e.target.value })}
                      />
                    </div>

                    {/* Right: Visual Document Preview */}
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-5 space-y-3">
                      <h3 className="text-heading text-[14px] flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-[var(--color-accent)]" /> Rendered Resume Preview
                        </span>
                        {compiledPdfB64 && (
                          <span className="tag tag-success text-[10px]">Compiled PDF Ready</span>
                        )}
                      </h3>
                      {compiledPdfB64 ? (
                        <iframe
                          src={`data:application/pdf;base64,${compiledPdfB64}`}
                          className="w-full h-[750px] border-0 rounded-[var(--radius-lg)] shadow-sm bg-white"
                          title="Compiled PDF Preview"
                        />
                      ) : (
                        <VisualResumePreview profile={profile} latexSource={result.latex_source} />
                      )}
                    </div>
                  </div>
                )}

                {viewMode === "preview" && (
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-heading flex items-center gap-2">
                        <Eye className="w-4 h-4 text-[var(--color-accent)]" /> Rendered Resume Preview
                      </h3>
                      {compiledPdfB64 && (
                        <button
                          onClick={() => setCompiledPdfB64(null)}
                          className="btn-ghost text-[11px]"
                        >
                          Switch to Visual Canvas
                        </button>
                      )}
                    </div>
                    {compiledPdfB64 ? (
                      <iframe
                        src={`data:application/pdf;base64,${compiledPdfB64}`}
                        className="w-full h-[750px] border-0 rounded-[var(--radius-lg)] shadow-sm bg-white"
                        title="Compiled PDF Preview"
                      />
                    ) : (
                      <VisualResumePreview profile={profile} latexSource={result.latex_source} />
                    )}
                  </div>
                )}

                {viewMode === "code" && (
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-6 space-y-3">
                    <h3 className="text-heading flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-[var(--color-accent)]" /> Full-Screen LaTeX Code Editor
                    </h3>
                    <textarea
                      className="textarea font-mono text-[12px] leading-relaxed min-h-[550px] bg-[var(--color-surface-sunken)] p-4 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] w-full"
                      value={result.latex_source}
                      onChange={(e) => setResult({ ...result, latex_source: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  /* ── FORM VIEW ───────────────────────────────────────────────────── */

  return (
    <DashboardLayout title="Resume Builder" subtitle="ATS-optimized resume generator" wide={true}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Hero */}
        <div className="card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-accent-subtle)] flex items-center justify-center shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-[var(--color-accent-text)]" />
              </div>
              <div>
                <h2 className="text-heading-lg mb-0.5">Resume Builder</h2>
                <p className="text-body-sm">
                  Fill in your profile, select a job target, and Evolora will generate an ATS-safe LaTeX resume
                  optimized through up to 4 iterations targeting a 90+ rubric score.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setProfile({
                  full_name: "Alex Rivera",
                  email: "alex.rivera@example.com",
                  phone: "+1 (555) 389-2041",
                  location: "San Francisco, CA",
                  linkedin_url: "https://linkedin.com/in/alexrivera-tech",
                  summary: "Senior Full-Stack & Distributed Systems Engineer with 6+ years of experience designing high-concurrency microservices, cloud infrastructure, and low-latency APIs serving millions of daily active users.",
                  experience: [
                    {
                      title: "Senior Software Engineer",
                      company: "CloudScale Tech Inc.",
                      start_date: "Jan 2022",
                      end_date: "Present",
                      bullets: [
                        "Architected distributed event streaming backend using FastAPI, Kafka, and Redis, reducing p99 API latency by 45%",
                        "Led migration of legacy monolithic monolith to containerized Kubernetes deployment, cutting cloud infra spending by $180k/yr",
                        "Mentored a team of 6 engineers across technical design reviews, CI/CD pipeline automation, and unit testing practices"
                      ]
                    },
                    {
                      title: "Full Stack Engineer",
                      company: "Apex Solutions",
                      start_date: "Jun 2019",
                      end_date: "Dec 2021",
                      bullets: [
                        "Developed responsive React/Next.js dashboard components with TypeScript, improving user retention by 28%",
                        "Designed RESTful & GraphQL backend endpoints in Python/PostgreSQL handling over 5,000 requests/sec"
                      ]
                    }
                  ],
                  education: [
                    {
                      degree: "B.S. Computer Science & Data Systems",
                      school: "University of California, Berkeley",
                      year: "2019"
                    }
                  ],
                  skills: ["Python", "TypeScript", "FastAPI", "React", "Next.js", "PostgreSQL", "Docker", "Kubernetes", "Redis", "AWS"]
                });
                setParseSuccess("Auto-filled form with Alex Rivera demo profile!");
              }}
              className="btn-secondary text-[12px] whitespace-nowrap self-start sm:self-center"
            >
              <Sparkles className="w-3.5 h-3.5" /> Auto-fill Demo
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-error-subtle)] border border-[var(--color-error)]/20 text-[var(--color-error)] text-[13px] flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Job target selector */}
        <section className="card p-5 space-y-3">
          <h3 className="text-heading flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--color-accent-text)]" /> Target Job
          </h3>
          {jobs.length === 0 ? (
            <p className="text-body-sm">No processed jobs found. Submit a job description first from <a href="/dashboard/jobs" className="text-[var(--color-accent)] underline font-medium">Saved Jobs</a>.</p>
          ) : (
            <select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)} className="input text-[13.5px] font-medium" id="job-select">
              <option value="">Select a job target…</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.role_title || "Untitled"} — {j.required_skills.slice(0, 3).join(", ")}</option>)}
            </select>
          )}
        </section>

        {/* Import/Upload Existing Resume */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-heading flex items-center gap-2">
                <Upload className="w-4 h-4 text-[var(--color-accent)]" /> Tailor Uploaded Resume
              </h3>
              <p className="text-caption mt-0.5">
                Upload or paste your existing resume to extract your facts and tailor them for the target job.
              </p>
            </div>
            <div className="flex bg-[var(--color-surface-sunken)] p-1 rounded-[var(--radius-md)] text-[12px]">
              <button
                type="button"
                onClick={() => setImportTab("file")}
                className={`px-3 py-1 rounded-[var(--radius-sm)] transition-colors ${importTab === "file" ? "bg-[var(--color-surface)] font-medium text-[var(--color-ink-primary)] shadow-sm" : "text-[var(--color-ink-tertiary)]"}`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setImportTab("paste")}
                className={`px-3 py-1 rounded-[var(--radius-sm)] transition-colors ${importTab === "paste" ? "bg-[var(--color-surface)] font-medium text-[var(--color-ink-primary)] shadow-sm" : "text-[var(--color-ink-tertiary)]"}`}
              >
                Paste Text
              </button>
            </div>
          </div>

          {parseSuccess && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-success-subtle)] text-[var(--color-success)] text-[13px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {parseSuccess}
            </div>
          )}

          {importTab === "file" ? (
            <div className="border-2 border-dashed border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-6 text-center hover:border-[var(--color-accent)] transition-colors bg-[var(--color-surface-sunken)]">
              <input
                type="file"
                accept=".pdf,.txt,.tex,.md"
                onChange={handleFileUpload}
                className="hidden"
                id="resume-file-input"
                disabled={uploadingFile}
              />
              <label htmlFor="resume-file-input" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                {uploadingFile ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent)]" />
                ) : (
                  <FileCode className="w-6 h-6 text-[var(--color-accent)]" />
                )}
                <div>
                  <p className="text-[13px] font-medium text-[var(--color-ink-primary)]">
                    {uploadingFile ? "Extracting profile from resume..." : "Click to upload your resume (PDF, TXT, TEX, MD)"}
                  </p>
                  <p className="text-[11px] text-[var(--color-ink-tertiary)] mt-0.5">
                    Evolora will parse your background details and populate the profile for ATS tailoring
                  </p>
                </div>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                className="textarea text-[13px]"
                rows={5}
                placeholder="Paste raw text or LaTeX source of your existing resume here…"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <button
                type="button"
                onClick={handleParseText}
                disabled={parsingText || !pasteText.trim()}
                className="btn-secondary text-[12px]"
              >
                {parsingText ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting Profile…</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Extract Profile from Text</>
                )}
              </button>
            </div>
          )}
        </section>

        {/* Personal info */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
            <div>
              <h3 className="text-heading">Personal Information & Profile</h3>
              <p className="text-caption mt-0.5">Edit candidate facts or let AI automatically refine titles, bullets, and skills.</p>
            </div>
            <button
              type="button"
              onClick={handleRefineProfile}
              disabled={refiningProfile}
              className="btn-secondary text-[12px] flex items-center gap-1.5"
            >
              {refiningProfile ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Auto-Fixing Profile…</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" /> ✨ AI Auto-Fix & Refine Form</>
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-label mb-1 block">Full Name *</label>
              <input className="input" value={profile.full_name} onChange={(e) => updateField("full_name", e.target.value)} placeholder="Jane Doe" id="input-fullname" />
            </div>
            <div>
              <label className="text-label mb-1 block">Email</label>
              <input className="input" value={profile.email} onChange={(e) => updateField("email", e.target.value)} placeholder="jane@example.com" />
            </div>
            <div>
              <label className="text-label mb-1 block">Phone</label>
              <input className="input" value={profile.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+1 555-123-4567" />
            </div>
            <div>
              <label className="text-label mb-1 block">Location</label>
              <input className="input" value={profile.location} onChange={(e) => updateField("location", e.target.value)} placeholder="San Francisco, CA" />
            </div>
          </div>
          <div>
            <label className="text-label mb-1 block">LinkedIn URL</label>
            <input className="input" value={profile.linkedin_url} onChange={(e) => updateField("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/janedoe" />
          </div>
          <div>
            <label className="text-label mb-1 block">Professional Summary</label>
            <textarea className="textarea" rows={3} value={profile.summary} onChange={(e) => updateField("summary", e.target.value)}
              placeholder="Experienced software engineer with 5+ years building scalable distributed systems…" />
          </div>
        </section>

        {/* Experience */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-heading">Work Experience</h3>
            <button onClick={addExp} className="btn-ghost text-[12px]"><Plus className="w-3.5 h-3.5" /> Add</button>
          </div>
          {profile.experience.map((exp, i) => (
            <div key={i} className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-label">Experience {i + 1}</span>
                {profile.experience.length > 1 && (
                  <button onClick={() => removeExp(i)} className="p-1 text-[var(--color-ink-tertiary)] hover:text-[var(--color-error)]"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input className="input" placeholder="Job Title" value={exp.title} onChange={(e) => updateExp(i, "title", e.target.value)} />
                <input className="input" placeholder="Company" value={exp.company} onChange={(e) => updateExp(i, "company", e.target.value)} />
                <input className="input" placeholder="Start (e.g. Jan 2020)" value={exp.start_date} onChange={(e) => updateExp(i, "start_date", e.target.value)} />
                <input className="input" placeholder="End (e.g. Present)" value={exp.end_date} onChange={(e) => updateExp(i, "end_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <span className="text-caption">Bullet points (achievements/responsibilities)</span>
                {exp.bullets.map((b, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-2">
                    <span className="text-caption shrink-0">•</span>
                    <input className="input flex-1" value={b} onChange={(e) => updateBullet(i, bIdx, e.target.value)}
                      placeholder="Reduced API latency by 40% through caching optimization" />
                    {exp.bullets.length > 1 && (
                      <button onClick={() => removeBullet(i, bIdx)} className="p-1 text-[var(--color-ink-tertiary)] hover:text-[var(--color-error)]"><Trash2 className="w-3 h-3" /></button>
                    )}
                  </div>
                ))}
                <button onClick={() => addBullet(i)} className="btn-ghost text-[11px]"><Plus className="w-3 h-3" /> Add bullet</button>
              </div>
            </div>
          ))}
        </section>

        {/* Education */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-heading">Education</h3>
            <button onClick={addEdu} className="btn-ghost text-[12px]"><Plus className="w-3.5 h-3.5" /> Add</button>
          </div>
          {profile.education.map((edu, i) => (
            <div key={i} className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-label">Education {i + 1}</span>
                {profile.education.length > 1 && (
                  <button onClick={() => removeEdu(i)} className="p-1 text-[var(--color-ink-tertiary)] hover:text-[var(--color-error)]"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input className="input" placeholder="Degree (e.g. B.S. CS)" value={edu.degree} onChange={(e) => updateEdu(i, "degree", e.target.value)} />
                <input className="input" placeholder="School" value={edu.school} onChange={(e) => updateEdu(i, "school", e.target.value)} />
                <input className="input" placeholder="Year" value={edu.year} onChange={(e) => updateEdu(i, "year", e.target.value)} />
              </div>
            </div>
          ))}
        </section>

        {/* Skills */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-6 space-y-3">
          <h3 className="text-heading">Skills</h3>
          <div className="flex items-center gap-2">
            <input className="input flex-1" placeholder="Add a skill (e.g. Python, React, AWS)"
              value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
            <button onClick={addSkill} className="btn-secondary shrink-0"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          {profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <span key={s} className="tag tag-accent flex items-center gap-1">
                  {s}
                  <button onClick={() => removeSkill(s)} className="hover:text-[var(--color-error)]">×</button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Options & generate */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-6 space-y-4">
          <h3 className="text-heading">Options</h3>
          <div>
            <label className="text-label mb-2 block">Resume Length</label>
            <div className="flex gap-3">
              {(["full", "half"] as const).map((mode) => (
                <button key={mode} onClick={() => setLengthMode(mode)}
                  className={`radio-option flex-1 ${lengthMode === mode ? "selected" : ""}`}>
                  <div className={`radio-dot ${lengthMode === mode ? "active" : ""}`}>
                    {lengthMode === mode && <div className="radio-dot-inner" />}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium">{mode === "full" ? "Full Page" : "Half Page"}</p>
                    <p className="text-[11px] text-[var(--color-ink-tertiary)]">
                      {mode === "full" ? "One full US Letter page" : "~50-65% of a page, condensed"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading || !selectedJob}
            className="btn-primary w-full justify-center py-3 text-[14px]" id="btn-generate-resume">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating (up to 4 iterations)…</>
            ) : (
              <><FileText className="w-4 h-4" /> Generate ATS Resume</>
            )}
          </button>
        </section>
      </div>
    </DashboardLayout>
  );
}
