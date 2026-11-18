"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Code2,
  Terminal,
  Loader2,
  RotateCcw,
  Sparkles,
  Award,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Send,
  FileCode,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import CodeEditor from "@/components/CodeEditor";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";

interface TestCase {
  description: string;
  input: string;
  expected_output: string;
  is_hidden?: boolean;
}

interface CodingProblem {
  id: string;
  title?: string;
  text: string;
  difficulty: string;
  skill_tested: string;
  starter_code: string;
  constraints?: string[];
  examples?: string[];
  expected_approach?: string;
  test_cases: TestCase[];
}

export default function RealCodingPage() {
  const { showToast } = useToast();
  const [jobTargets, setJobTargets] = useState<Array<any>>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [loadingJobs, setLoadingJobs] = useState<boolean>(true);
  const [loadingAssessment, setLoadingAssessment] = useState<boolean>(false);
  const [codingAssessment, setCodingAssessment] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [currentProblemIdx, setCurrentProblemIdx] = useState(0);
  const [language, setLanguage] = useState<string>("python");
  const [userCodes, setUserCodes] = useState<Record<string, string>>({});

  // Compiler Execution States
  const [runningCode, setRunningCode] = useState(false);
  const [executionResponse, setExecutionResponse] = useState<any>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<"results" | "stdout" | "details">("results");
  const [selectedTestCaseIdx, setSelectedTestCaseIdx] = useState<number>(0);

  const [submittingSolution, setSubmittingSolution] = useState(false);
  const [submittedResults, setSubmittedResults] = useState<Record<string, any>>({});
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  // Load Job Targets
  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await api.listJobTargets();
        if (res && res.items && res.items.length > 0) {
          setJobTargets(res.items);
          setSelectedJobId(res.items[0].id);
        }
      } catch (err: any) {
        const msg = err?.detail || err?.message || "Failed to load job profiles";
        console.warn("Could not fetch job targets:", msg);
      } finally {
        setLoadingJobs(false);
      }
    }
    loadJobs();
  }, []);

  const handleGenerateCodingAssessment = async () => {
    if (!selectedJobId) return;
    setLoadingAssessment(true);
    setErrorMsg(null);
    setSubmissionResult(null);
    try {
      // Explicitly request pure CODING assessment
      const data = await api.generateAssessment(selectedJobId, "coding", "medium");
      setCodingAssessment(data);
      
      // Initialize code templates
      const initialCodes: Record<string, string> = {};
      (data.question_set || []).forEach((prob: any) => {
        initialCodes[prob.id] = prob.starter_code || "# Write your solution here\n";
      });
      setUserCodes(initialCodes);
      showToast("success", "Generated real coding problems for target role!");
    } catch (err: any) {
      console.error("Failed to generate coding assessment", err);
      setErrorMsg(err.detail || err.message || "Failed to generate coding workspace.");
    } finally {
      setLoadingAssessment(false);
    }
  };

  const problems: CodingProblem[] = codingAssessment?.question_set || [];
  const currentProblem = problems[currentProblemIdx];

  const currentCode = currentProblem ? (userCodes[currentProblem.id] || currentProblem.starter_code || "") : "";

  const handleCodeChange = (newCode: string) => {
    if (!currentProblem) return;
    setUserCodes((prev) => ({
      ...prev,
      [currentProblem.id]: newCode,
    }));
  };

  const handleResetCode = () => {
    if (!currentProblem) return;
    setUserCodes((prev) => ({
      ...prev,
      [currentProblem.id]: currentProblem.starter_code || "",
    }));
    setExecutionResponse(null);
    showToast("info", "Reset code to default template.");
  };

  // Compiler Execution Engine call
  const handleRunTestCases = async () => {
    if (!currentProblem || runningCode) return;
    setRunningCode(true);
    setExecutionResponse(null);

    // Format test cases for backend code executor
    const rawCases = currentProblem.test_cases || [];
    let formattedCases: Array<any> = [];

    if (rawCases.length > 0 && typeof rawCases[0] === "object") {
      formattedCases = rawCases.map((tc: any, i: number) => ({
        description: tc.description || `Test Case ${i + 1}`,
        input: tc.input !== undefined ? String(tc.input) : "",
        expected_output: tc.expected_output !== undefined ? String(tc.expected_output) : (tc.expectedOutput !== undefined ? String(tc.expectedOutput) : ""),
        is_hidden: tc.is_hidden ?? tc.isHidden ?? false,
      }));
    } else {
      // Fallback if test cases were string descriptions
      formattedCases = [
        { description: "Test Case 1", input: "[2, 7, 11, 15]\n9", expected_output: "[0, 1]", is_hidden: false },
        { description: "Test Case 2", input: "[3, 2, 4]\n6", expected_output: "[1, 2]", is_hidden: false },
        { description: "Test Case 3", input: "[3, 3]\n6", expected_output: "[0, 1]", is_hidden: true },
      ];
    }

    try {
      const res = await api.runCode(currentCode, language, formattedCases);
      setExecutionResponse(res);
      if (res.success) {
        showToast("success", `All ${res.total_test_cases} test cases passed! (${res.execution_time_ms}ms)`);
      } else {
        showToast("error", `${res.passed_test_cases}/${res.total_test_cases} test cases passed.`);
      }
    } catch (err: any) {
      console.error("Code execution failed", err);
      showToast("error", err.detail || "Compiler execution error. Check your syntax.");
    } finally {
      setRunningCode(false);
    }
  };

  const handleSubmitFinalAssessment = async () => {
    if (!codingAssessment) return;
    setSubmittingSolution(true);
    try {
      // Run current problem test cases first
      await handleRunTestCases();

      // Submit assessment code answers to API for official scoring
      const result = await api.submitAssessment(codingAssessment.id, userCodes, 300);
      setSubmissionResult(result);
      showToast("success", `Assessment evaluated! Score: ${result.score} Marks`);
    } catch (err: any) {
      console.error("Failed to submit assessment", err);
      showToast("error", err.detail || err.message || "Failed to calculate assessment score.");
    } finally {
      setSubmittingSolution(false);
    }
  };

  // Setup view
  if (!codingAssessment) {
    return (
      <DashboardLayout title="Real Compiler Coding Assessment">
        <div className="max-w-[620px]">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="p-3 rounded-full bg-emerald-500/10 text-emerald-600">
              <Code2 className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-heading-lg">Real Compiler Coding Assessment</h2>
              <p className="text-caption text-emerald-600 font-medium">LeetCode & HackerRank Style Sandbox</p>
            </div>
          </div>
          <p className="text-body-sm mb-6">
            Solve real-world coding problems with live execution, test case runner, syntax error diagnostics, and runtime execution profiling.
          </p>

          {loadingJobs ? (
            <div className="flex items-center gap-2 py-8 text-[var(--color-ink-tertiary)]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading job targets...</span>
            </div>
          ) : jobTargets.length === 0 ? (
            <div className="p-6 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] text-center mb-6">
              <p className="text-body-sm mb-4">No job targets found. Create a job profile first to generate coding challenges.</p>
              <Link href="/dashboard/jobs/new" className="btn-primary">
                Add Job Target
              </Link>
            </div>
          ) : (
            <div className="space-y-5 mb-6">
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-ink-secondary)] mb-1">
                  Select Target Job Profile
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

              <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-5 space-y-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-ink-secondary)]">Compiler Environment</span>
                  <span className="font-semibold text-emerald-600 font-mono flex items-center gap-1.5">
                    <Terminal className="w-4 h-4" /> Live Python Sandbox
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-ink-secondary)]">Problem Sets</span>
                  <span className="font-medium">3 Coding Problems (Easy, Medium, Hard)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-ink-secondary)]">Test Cases Engine</span>
                  <span className="font-medium">Visible & Hidden Test Cases Evaluation</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-ink-secondary)]">Execution Time</span>
                  <span className="font-medium">Measured in milliseconds (ms)</span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-[var(--color-error-subtle)] text-[var(--color-error)] text-[12px] rounded-[var(--radius-md)] font-medium">
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handleGenerateCodingAssessment}
                disabled={loadingAssessment}
                className="btn-primary w-full justify-center py-3.5 text-[14px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
              >
                {loadingAssessment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Coding Problems & Test Cases...
                  </>
                ) : (
                  <>Open Coding IDE & Sandbox</>
                )}
              </button>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  if (submissionResult) {
    const isPass = submissionResult.score >= 60;
    return (
      <DashboardLayout title="Coding Assessment Evaluation & Marks">
        <div className="max-w-[680px] mx-auto space-y-6 py-6">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-8 text-center space-y-5 shadow-sm">
            <div className="inline-flex p-4 rounded-full bg-emerald-500/10 text-emerald-600 mb-1">
              <Award className="w-12 h-12 text-emerald-600" />
            </div>
            
            <div>
              <span className="text-[12px] font-mono text-[var(--color-ink-tertiary)] uppercase tracking-wider block mb-1">
                Official Assessment Score Marks
              </span>
              <h2 className="text-[40px] font-black text-[var(--color-ink-primary)]">
                {submissionResult.score} <span className="text-[20px] font-medium text-[var(--color-ink-tertiary)]">/ 100 Marks</span>
              </h2>
            </div>

            <div className="inline-block">
              <span className={`px-4 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-wide border ${
                submissionResult.score >= 85
                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                  : isPass
                  ? "bg-blue-500/15 text-blue-600 border-blue-500/30"
                  : "bg-amber-500/15 text-amber-600 border-amber-500/30"
              }`}>
                {submissionResult.score >= 85 ? "EXCELLENT PERFORMANCE" : isPass ? "PASSED" : "NEEDS IMPROVEMENT"}
              </span>
            </div>

            {/* Score Progress Bar */}
            <div className="w-full bg-[var(--color-surface-sunken)] rounded-full h-3 max-w-[400px] mx-auto overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${submissionResult.score >= 85 ? "bg-emerald-500" : isPass ? "bg-blue-600" : "bg-amber-500"}`}
                style={{ width: `${Math.min(100, Math.max(5, submissionResult.score))}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-left">
              <div className="p-3 bg-[var(--color-surface-sunken)] rounded-[var(--radius-md)] border border-[var(--color-border-default)]">
                <span className="text-[11px] text-[var(--color-ink-tertiary)] block">Test Cases Passed</span>
                <span className="text-[15px] font-bold text-[var(--color-ink-primary)] font-mono">
                  {submissionResult.coding_passed ?? 0} / {submissionResult.total_coding_cases ?? 0}
                </span>
              </div>
              <div className="p-3 bg-[var(--color-surface-sunken)] rounded-[var(--radius-md)] border border-[var(--color-border-default)]">
                <span className="text-[11px] text-[var(--color-ink-tertiary)] block">Accuracy</span>
                <span className="text-[15px] font-bold text-[var(--color-ink-primary)] font-mono">
                  {submissionResult.total_coding_cases ? Math.round(((submissionResult.coding_passed ?? 0) / submissionResult.total_coding_cases) * 100) : 0}%
                </span>
              </div>
              <div className="p-3 bg-[var(--color-surface-sunken)] rounded-[var(--radius-md)] border border-[var(--color-border-default)]">
                <span className="text-[11px] text-[var(--color-ink-tertiary)] block">Problems Evaluated</span>
                <span className="text-[15px] font-bold text-[var(--color-ink-primary)] font-mono">
                  {problems.length}
                </span>
              </div>
              <div className="p-3 bg-[var(--color-surface-sunken)] rounded-[var(--radius-md)] border border-[var(--color-border-default)]">
                <span className="text-[11px] text-[var(--color-ink-tertiary)] block">Attempt Status</span>
                <span className="text-[15px] font-bold text-emerald-600 uppercase font-mono">
                  {submissionResult.status}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-4 border-t border-[var(--color-border-default)]">
              <button
                onClick={() => {
                  setSubmissionResult(null);
                  setCodingAssessment(null);
                }}
                className="btn-secondary text-[13px]"
              >
                Retake Coding Assessment
              </button>
              <Link href="/dashboard" className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-[13px]">
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Real Compiler Coding Workspace" wide>
      {/* Top Navbar Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--color-border-default)]">
        <div className="flex items-center gap-3">
          {problems.map((prob, idx) => (
            <button
              key={prob.id || idx}
              onClick={() => {
                setCurrentProblemIdx(idx);
                setExecutionResponse(null);
              }}
              className={`px-3 py-1.5 rounded-[var(--radius-md)] text-[12.5px] font-semibold transition-colors flex items-center gap-1.5 ${
                currentProblemIdx === idx
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-[var(--color-surface)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] border border-[var(--color-border-default)]"
              }`}
            >
              <span>Problem {idx + 1}</span>
              {submittedResults[prob.id] && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="input text-[12px] py-1 px-2.5 font-mono"
          >
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript (Node.js)</option>
          </select>

          <button
            onClick={handleResetCode}
            className="btn-ghost text-[12px] py-1.5 px-2.5 flex items-center gap-1"
            title="Reset code template"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* LeetCode-style Split View Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-175px)] overflow-hidden">
        
        {/* Left Side: Problem Description Panel */}
        <div className="lg:col-span-5 flex flex-col h-full bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] overflow-y-auto p-5">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                currentProblem.difficulty?.toLowerCase() === "easy"
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  : currentProblem.difficulty?.toLowerCase() === "hard"
                  ? "bg-red-500/10 text-red-500 border border-red-500/20"
                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
              }`}
            >
              {currentProblem.difficulty || "Medium"}
            </span>
            <span className="tag tag-accent text-[11px] font-medium">{currentProblem.skill_tested || "Algorithms"}</span>
          </div>

          <h2 className="text-[18px] font-bold text-[var(--color-ink-primary)] mb-4">
            {currentProblem.title || `Problem ${currentProblemIdx + 1}: ${currentProblem.skill_tested || "Coding Challenge"}`}
          </h2>

          <div className="text-[13.5px] leading-relaxed text-[var(--color-ink-primary)] space-y-4 mb-6 font-medium whitespace-pre-line">
            {currentProblem.text}
          </div>

          {/* Examples */}
          {currentProblem.examples && currentProblem.examples.length > 0 && (
            <div className="space-y-3 mb-6">
              <h3 className="text-[13px] font-bold text-[var(--color-ink-primary)]">Examples</h3>
              {currentProblem.examples.map((ex, i) => (
                <div key={i} className="p-3 bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-[var(--radius-md)] text-[12px] font-mono text-[var(--color-ink-secondary)]">
                  {typeof ex === "string" ? ex : JSON.stringify(ex)}
                </div>
              ))}
            </div>
          )}

          {/* Constraints */}
          {currentProblem.constraints && currentProblem.constraints.length > 0 && (
            <div className="space-y-2 mb-6">
              <h3 className="text-[13px] font-bold text-[var(--color-ink-primary)]">Constraints</h3>
              <ul className="list-disc pl-5 text-[12px] font-mono text-[var(--color-ink-secondary)] space-y-1">
                {currentProblem.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Side: Monaco Code Editor & Real-time Compiler Console Panel */}
        <div className="lg:col-span-7 flex flex-col h-full space-y-3">
          
          {/* Code Editor Header & Controls */}
          <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-default)] text-[12px]">
              <span className="font-mono text-[var(--color-ink-secondary)] flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-emerald-600" /> solution.py
              </span>
              <span className="text-[var(--color-ink-tertiary)] font-mono">Python 3 Execution Environment</span>
            </div>

            <div className="flex-1 min-h-[300px]">
              <CodeEditor
                value={currentCode}
                onChange={handleCodeChange}
                language={language}
                height="100%"
              />
            </div>

            {/* Run Code & Submit Bar */}
            <div className="flex items-center justify-between p-3 bg-[var(--color-surface)] border-t border-[var(--color-border-default)]">
              <span className="text-[11px] text-[var(--color-ink-tertiary)] font-mono">
                Press Run to test code or Submit to evaluate final marks
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleRunTestCases}
                  disabled={runningCode}
                  className="btn-secondary text-[13px] py-2 px-4 flex items-center gap-1.5 border-[var(--color-border-default)] hover:bg-[var(--color-surface-sunken)]"
                >
                  {runningCode ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />}
                  <span>Run Test Cases</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmitFinalAssessment}
                  disabled={submittingSolution || runningCode}
                  className="btn-primary text-[13px] py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  {submittingSolution ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Submit & Get Marks</span>
                </button>
              </div>
            </div>
          </div>

          {/* Real Compiler Output & Test Cases Console Panel */}
          <div className="h-[220px] bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-surface-sunken)] border-b border-[var(--color-border-default)]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-600" />
                <span className="text-[12px] font-bold text-[var(--color-ink-primary)]">Execution Console & Test Cases</span>
              </div>

              {executionResponse && (
                <div className="flex items-center gap-2 text-[11px]">
                  <span className={`font-mono font-bold ${executionResponse.success ? "text-emerald-600" : "text-red-500"}`}>
                    {executionResponse.passed_test_cases} / {executionResponse.total_test_cases} Passed
                  </span>
                  <span className="text-[var(--color-ink-tertiary)] font-mono">
                    ({executionResponse.execution_time_ms}ms)
                  </span>
                </div>
              )}
            </div>

            {/* Console Content */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[12px]">
              {runningCode ? (
                <div className="flex items-center gap-2 text-[var(--color-ink-secondary)] py-4 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Compiling & running test cases in Python sandbox...</span>
                </div>
              ) : executionResponse ? (
                <div className="space-y-3">
                  {/* Results summary line */}
                  <div className="flex items-center justify-between p-2 bg-[var(--color-surface-sunken)] rounded-[var(--radius-md)]">
                    <span className="font-bold">
                      {executionResponse.success ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> ACCEPTED - All Test Cases Passed
                        </span>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1">
                          <XCircle className="w-4 h-4" /> WRONG ANSWER / EXECUTION ERROR
                        </span>
                      )}
                    </span>
                    <span className="text-[var(--color-ink-tertiary)]">
                      Runtime: {executionResponse.execution_time_ms} ms
                    </span>
                  </div>

                  {/* Test case cards */}
                  <div className="space-y-2">
                    {executionResponse.results?.map((res: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-[var(--radius-md)] border ${
                          res.passed
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : "bg-red-500/5 border-red-500/20"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-[var(--color-ink-primary)]">
                            {res.description || `Test Case #${res.test_case_id}`}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${res.passed ? "bg-emerald-500/20 text-emerald-600" : "bg-red-500/20 text-red-500"}`}>
                            {res.passed ? "PASSED" : "FAILED"}
                          </span>
                        </div>

                        {res.error ? (
                          <div className="text-red-500 font-mono text-[11px] bg-red-500/10 p-2 rounded">
                            {res.error}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--color-ink-secondary)]">
                            <div>
                              <span className="text-[var(--color-ink-tertiary)] block">Input:</span>
                              <span className="bg-[var(--color-surface)] px-1.5 py-0.5 rounded font-mono">{res.input}</span>
                            </div>
                            <div>
                              <span className="text-[var(--color-ink-tertiary)] block">Expected Output:</span>
                              <span className="bg-[var(--color-surface)] px-1.5 py-0.5 rounded font-mono">{res.expected_output}</span>
                            </div>
                            {!res.passed && (
                              <div className="col-span-2">
                                <span className="text-red-500 block font-bold">Your Output:</span>
                                <span className="bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-mono">{res.actual_output || "(empty)"}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[var(--color-ink-tertiary)] space-y-1">
                  <Play className="w-5 h-5 text-[var(--color-ink-tertiary)]" />
                  <p>Click &ldquo;Run Test Cases&rdquo; to execute your code against test cases.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
