# Evolora AI

Evolora is an AI-powered personalized interview preparation platform featuring skill extraction, mock interviews, dynamic assessment generation, and intelligent feedback.

## Project Structure

```
Evolora-AI/
├── frontend/    # Next.js 16 (App Router, TypeScript, Tailwind CSS)
└── backend/     # FastAPI (Python 3.11+, Beanie/Motor ODM, MongoDB)
```

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Setup Python virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run backend API
uvicorn app.main:app --reload --port 8000
```
- API Server: `http://localhost:8000`
- Swagger UI Docs: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```
- Web Application: `http://localhost:3000`

## Deployment

- **Frontend**: Deploy `frontend/` on [Vercel](https://vercel.com) (Root directory: `frontend`)
- **Backend**: Deploy `backend/` on [Render](https://render.com), [Railway](https://railway.app), or [Koyeb](https://koyeb.com) (Root directory: `backend`)
