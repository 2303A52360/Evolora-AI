# Running Evolora

## 🔧 Backend (FastAPI) — `backend`

### macOS / Linux
```bash
# Terminal 1
cd backend

# Activate virtual environment
source .venv/bin/activate

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Windows
```powershell
# Terminal 1
cd backend

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --port 8000
```

---

## 🌐 Frontend (Next.js) — `frontend`

### macOS / Linux / Windows
```bash
# Terminal 2
cd frontend

# Install dependencies (first time only)
npm install

# Run the dev server
npm run dev
```

---

## 🔗 Running Services & URLs
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:8000](http://localhost:8000)
- **API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
