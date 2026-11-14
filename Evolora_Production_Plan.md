# Evolora — Production Project & Agent Build Plan

*AI-Powered Personalized Interview Preparation Platform*

---

## 1. Product Framing

Evolora's core loop is: **job input → skill extraction → personalized assessment → mock interview → evaluation → adaptive feedback**. Everything in the architecture should exist to serve that loop tightly and cheaply (LLM calls are the main cost driver — design to minimize redundant calls and cache aggressively).

**North star metric:** % of users who complete a full prep cycle (JD in → mock interview → feedback out) and return for a second one.

**Non-goals for v1** (write these down explicitly so scope doesn't creep):
- No native mobile app — responsive web only
- No live human-proctored interviews
- No enterprise/recruiter-facing dashboard (candidate-only product first)
- No video-based interview analysis (audio/text only for v1)

---

## 2. System Architecture

Client → API Gateway → four core AI services → shared data layer + your LLM API (see diagram above).

### 2.1 Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind | SSR for SEO on landing/job pages, fast iteration, huge hiring pool |
| Backend API | Node.js (NestJS) or Python (FastAPI) | FastAPI if the team leans ML-heavy (easier NLP/embedding code reuse); NestJS if the team is TS-first end to end. Pick one — don't split the backend across both. |
| AI/LLM | Any OpenAI-compatible chat completions endpoint (your self-hosted API, or OpenAI/Azure/vLLM/Ollama as alternatives) | The codebase calls a single provider-agnostic client (`lib/llm.ts`) using the `openai` SDK pointed at your `LLM_BASE_URL` — swapping providers later is a config change, not a rewrite |
| Database | PostgreSQL (via Supabase or RDS) | Relational integrity for users/sessions/attempts |
| Vector store | pgvector (inside Postgres) initially; graduate to Pinecone/Weaviate only if scale demands it | Avoid a second database until you actually need semantic search at scale |
| Cache/Queue | Redis (cache) + BullMQ or Celery (background jobs for JD parsing, transcript scoring) | Interview evaluation is async — never block the UI on an LLM call |
| Auth | Clerk/Auth0 or NextAuth + JWT | Don't roll your own auth |
| Speech (mock interviews) | Web Speech API for MVP → Whisper API/Deepgram for production accuracy | Start cheap, upgrade when retention justifies cost |
| Infra | Docker + GitHub Actions CI/CD → Deploy on Vercel (frontend) + Railway/Render/ECS (backend) | Keep infra boring in v1; optimize later |
| Observability | Sentry (errors) + PostHog (product analytics) + structured logging | You will need to see where users drop off in the prep funnel |

### 2.2 Core Modules

1. **JD Ingestion & Extraction** — accepts pasted text or a URL, scrapes/cleans, sends to the LLM API with a structured-output prompt to extract: role title, required skills, seniority signals, tech stack, responsibilities, soft-skill cues.
2. **Assessment Generator** — given extracted skills, generates MCQs, coding problems, and behavioral questions with difficulty calibrated to seniority. Cache generated question sets per (role-signature) to cut LLM spend.
3. **Mock Interview Engine** — turn-based chat/voice session; maintains conversation state; asks follow-ups based on answer quality (this is the trickiest module — treat it as its own state machine, not a single long prompt).
4. **Evaluation & Feedback Engine** — rubric-based scoring (relevance, correctness, clarity, completeness) run async after each answer or interview; produces per-skill strength/weakness map and a recommended study plan.
5. **User Dashboard & Analytics** — progress over time, skill radar chart, session history.
6. **Auth & Account Management** — signup/login, profile, JD/session history.
7. **ATS Resume Generator** — given a job target's extracted skills plus a user-supplied profile (experience, education, skills), generates an ATS-safe LaTeX resume via a generate → score → critique → regenerate loop, targeting a configurable length (condensed half-page or full page) and a self-scored ATS rubric of 90+. Never fabricates experience or numbers the user didn't provide.

### 2.3 High-Level Data Model

- `users` (id, email, profile, plan)
- `job_targets` (id, user_id, raw_jd, source_url, extracted_skills JSONB, seniority, created_at)
- `assessments` (id, job_target_id, question_set JSONB, type)
- `attempts` (id, assessment_id, user_id, answers JSONB, score, submitted_at)
- `interview_sessions` (id, user_id, job_target_id, transcript JSONB, status)
- `evaluations` (id, session_id or attempt_id, rubric_scores JSONB, strengths, weaknesses, recommendations)
- `resumes` (id, user_id, job_target_id, profile JSONB, latex_source, ats_score, length_mode, iterations JSONB, status, created_at)

### 2.4 ATS Resume Module — Design Notes

There's no universal external "ATS score" API to call — this is a self-scored rubric (same pattern as the evaluation engine), not a claim about matching any specific third-party ATS product's internal scoring.

- **Generation constraints (hard, enforced in the prompt):** single-column LaTeX only (`article` class + `geometry`/`enumitem`/`titlesec`/`hyperref` — nothing else), no tables-as-layout, no icon fonts, no images/graphics, standard section headers (Summary / Experience / Skills / Education), bullets quantified only where the user's own input supports it.
- **Loop:** generate → score against a 5-part rubric (keyword coverage, structure, ATS-safe formatting, quantified bullets, length/density) → if below 90, feed the specific gaps back into the next generation attempt → cap at 4 attempts → always return the best attempt, and say so plainly if 90 wasn't reached rather than silently claiming it was.
- **Compilation:** compile the returned LaTeX server-side with **Tectonic** (self-contained TeX engine, no full TeX Live install needed) to a downloadable PDF alongside the raw `.tex` source.
- **Length mode:** `half` (fills ~50–65% of a US Letter page — condensed, not just truncated) or `full` (one full page), user-selectable per generation.

---

## 3. Delivery Roadmap (Production Phases)

Run this as 2-week sprints. Total estimate: **~16–18 weeks to a real production launch** with a small team (2–3 engineers + 1 designer, part-time PM). Compress if you're solo + AI agent (see Section 4) but keep the phase order — sequencing matters more than speed here.

### Phase 0 — Discovery & Setup (Week 1)
- Finalize scope (this doc), wireframes for core flows, define the evaluation rubric with real examples (this is your product's IP — spend real time here)
- Repo setup, CI/CD skeleton, environments (dev/staging/prod), LLM API endpoint and key provisioned
- **Exit criteria:** clickable wireframe reviewed, rubric document signed off, empty repo deploys to staging

### Phase 1 — MVP Core Loop (Weeks 2–5)
- Auth, JD input (paste text only, URL scraping deferred), JD extraction via the LLM API, MCQ + short-answer question generation
- Basic dashboard showing generated question set
- **Exit criteria:** a user can paste a JD and get a relevant, correctly-formatted question set end to end

### Phase 2 — Mock Interview & Evaluation (Weeks 6–9)
- Text-based mock interview flow (voice deferred), turn-by-turn Q&A with follow-ups
- Evaluation engine: rubric scoring, strengths/weaknesses extraction
- Background job queue for async evaluation
- **Exit criteria:** full loop works — JD → questions → mock interview → scored feedback

### Phase 3 — Personalization, Voice, Resume, Polish (Weeks 10–14)
- URL-based JD scraping, resume upload (optional context boost)
- Speech-to-text for spoken mock interviews
- Personalized recommendations engine, skill-progress dashboard with charts
- Coding-problem sandbox (Judge0 or similar) for technical roles
- **ATS resume generator** — profile input, generate→score→regenerate loop, LaTeX + PDF export (see Section 2.4)
- **Skill-gap roadmap** — turn each weakness from the evaluation engine into a short, concrete resource list (not just a label)
- **Exit criteria:** feature-complete against the abstract's promises, resume generator reliably clears the 90+ ATS rubric within 4 attempts on test profiles

### Phase 4 — Hardening & Launch (Weeks 14–16)
- Load testing, prompt-injection and abuse testing on JD/answer inputs, cost monitoring on LLM spend
- Accessibility pass, mobile responsiveness pass
- Analytics instrumentation, error monitoring, on-call runbook
- Closed beta → public launch
- **Exit criteria:** SLOs defined and met (p95 API latency, uptime), beta feedback incorporated

### Phase 5 — Post-launch (ongoing)
- A/B test question difficulty calibration, expand question bank coverage, add company-specific interview style presets, consider recruiter-facing tier

---

## 4. Agent Coding Plan (Building This with Claude Code)

This is the part most teams get wrong: they either hand an AI agent one giant prompt ("build Evolora") and get a shallow scaffold, or they micromanage every file and lose the speed advantage. The right approach is **spec-driven, session-scoped delegation** — each session has one clear deliverable, a defined "done" state, and tests before moving on.

### 4.1 Repo Structure for Agent-Friendly Development

```
/evolora
  /apps
    /web          (Next.js frontend)
    /api          (backend service)
  /packages
    /shared-types (TypeScript types shared frontend/backend)
    /prompts      (versioned LLM prompt templates, NOT hardcoded in business logic)
  /docs
    /specs        (one markdown spec per module — this is what you feed the agent)
    /adr          (architecture decision records — short, dated, one decision each)
  /infra          (Docker, CI/CD configs)
  /.claude/skills (project-specific Claude Skills — see 4.1.1)
  CLAUDE.md       (persistent project context: conventions, stack, "never do X")
```

Keep a `CLAUDE.md` at the repo root with: tech stack, coding conventions, testing requirements, and known gotchas ("we use FastAPI not Flask", "all LLM calls go through `lib/llm.ts` — an OpenAI-compatible client pointed at `LLM_BASE_URL`, never call a provider SDK directly elsewhere", "never commit API keys"). This is the single highest-leverage file for agent coding quality — write it before session 1 and update it as decisions get made.

#### 4.1.1 Project Skills (`.claude/skills/`)

`CLAUDE.md` covers general repo conventions; **Skills** cover domain-specific knowledge that's too detailed to keep restating and too easy for an agent to quietly reinvent wrong. Eight skills are written for this project, checked into `.claude/skills/`, and load automatically in sessions that touch the relevant code:

| Skill | Triggers on | Why it exists as a skill, not just a CLAUDE.md note |
|---|---|---|
| `llm-integration` | Any code calling the LLM (extraction, generation, evaluation, resume) | Keeps every module routed through the shared `lib/llm.ts` client instead of a provider SDK sneaking in somewhere, which is exactly how a future provider swap turns into a rewrite |
| `ats-latex-resume` | Resume generation, LaTeX output, ATS scoring code | Encodes hard, non-obvious constraints (approved LaTeX packages, the exact scoring rubric, "never fabricate content") that are easy to accidentally relax if asked for a "nicer template" |
| `llm-golden-file-testing` | Finishing any session that adds/changes a prompt module | Standard unit-test instincts don't work on non-deterministic LLM output — this skill is what stops "definition of done" from silently becoming "looked right once" |
| `mock-interview-engine` | Interview state machine, question plans, follow-up logic, voice mode | The turn-based state machine has invariants (frozen question plans, depth caps, transcript append-only) that are easy to violate when adding features like "skip question" or "restart" |
| `evaluation-rubric` | Scoring, grading, feedback reports, study plans | The "ruthless" 5-dimension rubric, score calculation formula, and zero-answer handling define the product's credibility — relaxing them makes the product dishonest |
| `code-sandbox` | Code execution, test case format, builtins whitelist | Security-critical module executing untrusted code; the allowed builtins whitelist and output comparison logic are the primary security and correctness boundaries |
| `ai-provider-backend` | Backend Python AI calls, structured output schemas, retry/timeout config | The Python counterpart to `llm-integration` — documents the `NVIDIAProvider` class, JSON cleanup pipeline, and Pydantic schema conventions that every backend AI call depends on |
| `question-generation` | Assessment generation, MCQ/coding batches, caching, fallback banks | Role-signature caching, cache validation against stale options, fallback question bank sizing, and test case format coupling with the code sandbox |

Add a new skill here whenever a module accumulates constraints worth protecting from casual erosion.

### 4.2 Session Breakdown

Each session below assumes a fresh Claude Code session working from `CLAUDE.md` + the relevant spec doc. Treat each as a PR-sized unit of work — review and merge before starting the next.

| # | Session | Deliverable | Definition of done |
|---|---|---|---|
| 1 | Repo scaffold | Monorepo structure, CI pipeline, lint/format config, empty deploy to staging | `main` branch deploys automatically; a trivial health-check endpoint returns 200 in staging |
| 2 | Auth & user model | Signup/login, user table, session middleware | A new user can register, log in, and hit a protected route; tests cover token expiry |
| 3 | JD ingestion service | Endpoint accepting pasted JD text, calls the LLM API with structured-output prompt, stores `job_targets` | Given 5 sample JDs, extracted skills/role/seniority are manually verified accurate |
| 4 | Question generator | Given a `job_target`, generates MCQ + short-answer set, stores `assessments` | Generated questions are relevant and non-duplicated across 10 test runs; response cached |
| 5 | Assessment UI | Frontend flow: paste JD → view generated questions → answer them | End-to-end manual walkthrough works without console errors |
| 6 | Evaluation engine (assessment scoring) | Scores submitted answers against rubric, stores `evaluations` | Scoring is consistent (same input → same score band) across repeated runs; async via job queue |
| 7 | Mock interview state machine | Turn-based interview session with follow-up logic | A 5-turn scripted conversation produces coherent, on-topic follow-ups |
| 8 | Interview evaluation & feedback report | Post-interview rubric scoring, strengths/weaknesses summary, recommendations | Feedback report is specific (references actual answers, not generic advice) |
| 9 | Dashboard & analytics | Session history, skill radar, progress over time | A user with 3+ completed sessions sees accurate aggregated data |
| 10 | Voice input (mock interviews) | Speech-to-text integration for spoken answers | Voice answers transcribe accurately enough to feed the evaluation engine (manual spot-check) |
| 11 | ATS resume generator | Profile input form, generate→score→regenerate loop, LaTeX + Tectonic-compiled PDF download | 10 test profiles across different JDs each produce a resume scoring ≥90 within 4 attempts; no attempt uses a multi-column, table, or graphics package (grep-checkable) |
| 12 | Skill-gap roadmap | Extends the evaluation engine to attach a short resource list per weakness | Every weakness in a feedback report has ≥1 concrete, relevant resource attached, not a generic label |
| 13 | Cover letter generator (stretch) | Reuses the resume profile + JD extraction to draft a tailored cover letter | Draft references specific, true details from both the JD and the user's profile, not boilerplate |
| 14 | Hardening pass | Rate limiting, prompt-injection tests on JD/answer/profile fields, cost guardrails on LLM calls | Adversarial test inputs (injected instructions in JD text or resume profile) don't alter system behavior |
| 15 | Launch readiness | Monitoring, error boundaries, load test, accessibility audit | p95 latency and uptime targets met in a staging load test |

### 4.3 How to Prompt Each Session

For every session, give the agent:
1. The relevant spec doc from `/docs/specs/`
2. The current `CLAUDE.md`
3. An explicit "done" condition (copy from the table above)
4. A note on what NOT to touch (scope containment — this is the #1 way agent sessions sprawl)

Example session-opening prompt structure:
> "Implement the JD ingestion service per `/docs/specs/jd-ingestion.md`. Stack and conventions are in `CLAUDE.md`. Done = endpoint tested against the 5 sample JDs in `/docs/specs/sample-jds/` with extracted output matching `/docs/specs/expected-extractions.json` within reasonable tolerance. Do not modify auth or the frontend in this session."

### 4.4 Testing Discipline for Agent-Built Code

- Every session ends with the agent writing tests for what it built, not just the feature — untested agent output is technical debt with extra steps.
- For LLM-dependent modules (extraction, generation, evaluation), use **golden-file tests**: fixed inputs with manually-reviewed expected outputs, re-run whenever the prompt template changes.
- Keep prompt templates in `/packages/prompts` under version control — treat prompt changes like code changes (PR review, changelog).

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM cost blows up at scale | Cache question sets by role-signature; use cheaper models (Haiku) for classification/extraction, reserve stronger models for generation/evaluation; set per-user daily call limits |
| Evaluation feels inconsistent/unfair to users | Lock the rubric early (Phase 0), golden-file test it, show users *why* they got a score (cite specific parts of their answer) |
| JD scraping breaks on many sites | Treat URL scraping as best-effort with graceful fallback to "paste the text instead" — don't block the core loop on it |
| Prompt injection via pasted JD or answers | Sanitize/delimit user content clearly in prompts, test adversarial inputs before launch (Session 14) |
| Mock interview conversations go off-rails | Constrain the state machine — cap follow-up depth, always have a fallback "move to next question" path |
| Resume generator fabricates experience or numbers to hit the ATS score | Hard-constrain the generation prompt to only rephrase/quantify user-supplied facts; the scoring rubric penalizes but never rewards invented content; spot-check a sample of outputs against source profiles before launch |
| "ATS score 90+" gets read as a guarantee against real-world ATS tools | Always label it as Evolora's own rubric-based estimate, not a certification; show the score breakdown so it's inspectable, not a black-box number |
| LaTeX compilation fails or hangs on malformed output | Sandbox the Tectonic compile step with a timeout; fall back to returning the raw `.tex` source with a clear error if PDF compilation fails |

---

## 6. Backlog / Ideas Not Yet in Scope

Logged for future consideration — not committed to the roadmap above, revisit after Phase 4 launch:

- **LinkedIn "About" section generator** — reuses the resume pipeline's profile data and generation loop
- **Recruiter-facing shared report link** — read-only, shareable link to a candidate's assessment/interview results; opens a monetization path but adds auth/sharing-permission complexity, deliberately deferred past the candidate-only v1 non-goal in Section 1
- **Interview recording playback tied to feedback timestamps** — valuable but depends on the voice module (Session 10) maturing first

---

## 7. Immediate Next Steps

1. Lock the evaluation rubric with 3–5 worked examples (this blocks Sessions 6 and 8)
2. Choose FastAPI vs NestJS for the backend — don't leave this open past Phase 0
3. Write the specs in `/docs/specs/` for Sessions 1–4 before starting any agent coding
4. Confirm rate limits / usage quotas on your LLM endpoint before Session 3 (first real LLM usage)
5. Decide on the resume module's length-mode default (`half` vs `full`) and gather 3–5 real user profiles to use as golden-file test cases for Session 11
