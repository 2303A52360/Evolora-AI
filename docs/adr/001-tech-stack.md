# ADR-001: Technology Stack Selection

**Date:** 2026-08-11  
**Status:** Accepted

## Decision

- **Backend:** Python (FastAPI) — richest AI/LLM ecosystem
- **Database:** MongoDB — native document model for JSONB-heavy data
- **Frontend:** Next.js 14 + TypeScript + Tailwind
- **LLM:** Claude API (Haiku for classification, Sonnet for generation)

## Consequences

- All AI code in Python natively
- MongoDB needs careful indexing
- Motor + Beanie for async MongoDB in FastAPI
