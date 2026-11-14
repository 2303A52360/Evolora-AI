# Evolora — Project Context (CLAUDE.md)

## What is Evolora?
AI-powered personalized interview preparation platform.
Core loop: **job input → skill extraction → personalized assessment → mock interview → evaluation → adaptive feedback**

## Tech Stack
| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Backend API | Python (FastAPI) |
| AI/LLM | Claude API (Sonnet for generation/eval, Haiku for classification) |
| Database | MongoDB (via Mongoose on frontend, Motor/Beanie on backend) |
| Cache/Queue | Redis + Celery (background jobs for JD parsing, transcript scoring) |
| Auth | NextAuth + JWT |
| Speech | Web Speech API (MVP) → Whisper API (production) |
| Infra | Docker + GitHub Actions CI/CD → Vercel (frontend) + Railway (backend) |
| Observability | Sentry + PostHog + structured logging |

## Monorepo Structure
```
/evolora
  /apps
    /web          — Next.js frontend (App Router, TypeScript, Tailwind)
    /api          — FastAPI backend (Python 3.11+)
  /packages
    /shared-types — TypeScript types shared frontend/backend
    /prompts      — Versioned LLM prompt templates
  /docs
    /specs        — One markdown spec per module
    /adr          — Architecture decision records
  /infra          — Docker, CI/CD configs
  CLAUDE.md       — This file
```

## Coding Conventions

### Backend (Python/FastAPI)
- Python 3.11+, type hints everywhere
- Pydantic v2 models for all request/response schemas
- Async endpoints by default
- All LLM calls go through `packages/prompts` — never hardcode prompts in business logic
- Use `motor` for async MongoDB access, `beanie` as ODM
- Background tasks via Celery — never block API responses on LLM calls
- All endpoints return structured JSON with consistent error format
- Use `loguru` for structured logging

### Frontend (Next.js/TypeScript)
- App Router (no Pages Router)
- Server Components by default, Client Components only when needed
- All API calls go through a centralized API client (`src/lib/api.ts`)
- Tailwind CSS for styling — no inline styles, no CSS modules
- Use `shadcn/ui` components as the base component library
- Form validation with `zod` + `react-hook-form`

### General
- Never commit API keys or secrets — use environment variables
- Every module gets tests before merging
- Prompt templates are version-controlled in `/packages/prompts`
- Treat prompt changes like code changes (review, changelog)
- All user-facing text content in English

## Data Model (MongoDB Collections)
- `users` — { _id, email, name, profile, plan, createdAt }
- `jobTargets` — { _id, userId, rawJd, sourceUrl, extractedSkills, seniority, createdAt }
- `assessments` — { _id, jobTargetId, questionSet, type, difficulty, createdAt }
- `attempts` — { _id, assessmentId, userId, answers, score, submittedAt }
- `interviewSessions` — { _id, userId, jobTargetId, transcript, status, createdAt }
- `evaluations` — { _id, sessionId/attemptId, rubricScores, strengths, weaknesses, recommendations }

## Never Do
- Never roll custom auth — use NextAuth
- Never block UI on LLM calls — always async
- Never hardcode prompts in business logic
- Never store secrets in code
- Never use `any` type in TypeScript without justification
