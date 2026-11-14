# Evolora — Versioned Prompt Templates

This directory contains all LLM prompt templates used by Evolora. 
**Never hardcode prompts in business logic** — all Claude calls must reference templates from this package.

## Structure

```
/prompts
  /jd_extraction     — Job description parsing prompts
  /question_gen      — Assessment question generation prompts
  /interview         — Mock interview conversation prompts
  /evaluation        — Rubric-based scoring prompts
```

## Rules

1. Every prompt template is a `.txt` or `.md` file with `{variable}` placeholders
2. Treat prompt changes like code changes — PR review, changelog
3. Each prompt file should include a header comment explaining its purpose, expected variables, and expected output format
4. Keep a `CHANGELOG.md` in each subdirectory
