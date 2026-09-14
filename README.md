# MARG — AI-Powered Automatic Block Planning Platform

**SIH 2026 Problem Statement SIH26027**: Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways.

---

## 🚀 One-Command Quick Start

### First Time Setup
```bash
cd MARG
npm run setup
npm run dev
```

### Daily Development Workflow
```bash
cd MARG
npm run dev
```

Single command starts the full application simultaneously:
- **Frontend**: `http://localhost:5173`
- **Backend**: `http://127.0.0.1:5000`
- **Python Optimizer**: `http://127.0.0.1:5001`

To stop all services cleanly, press `Ctrl+C`.

---

## 📌 System Architecture

```
                                MARG FRONTEND
                          (React + Vite + Tailwind)
                                     │
                                     ↓
                            MARG BACKEND ENGINE
                          (Node.js + Express REST API)
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ↓                           ↓                           ↓
   SQLite Database           Python Solver Service         Groq AI Agent
  (marg.db Persistent)       (Flask + Google OR-Tools)    (gpt-oss-120b)
```

---

## 🛠 Tech Stack

* **Frontend**: React, Vite, Tailwind CSS, Recharts, Lucide Icons
* **Backend**: Node.js, Express, SQLite (`sqlite3`)
* **Optimization Service**: Python 3, Flask, Google OR-Tools (CP-SAT Solver)
* **AI Copilot**: Groq AI (`openai/gpt-oss-120b`) with multi-step tool/function calling
* **Process Manager**: Concurrently

---

## ⚙️ Environment Configuration

Set your environment variables in `backend/.env` (never check secrets into git):

```env
PORT=5000
PYTHON_SERVICE_URL=http://127.0.0.1:5001
DATABASE_URL=./database/marg.db

# Groq AI API Configuration (Backend Only - NEVER expose to frontend)
# Get your API key from https://console.groq.com
GROQ_API_KEY=YOUR_GROQ_API_KEY_HERE
GROQ_MODEL=openai/gpt-oss-120b
GROQ_BASE_URL=https://api.groq.com/openai/v1
MARG_AGENT_MAX_ITERATIONS=10
```

---

## 📁 Directory Structure

```
MARG/
├── package.json          # Root scripts & process orchestrator (concurrently)
├── scripts/              # Setup & Python launcher scripts
├── frontend/             # React + Vite User Interface
│   ├── src/
│   └── package.json
├── backend/              # Node.js + Express REST API Server
│   ├── server.js
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   ├── services/         # Groq AI & Train Impact Engine
│   ├── database/         # SQLite DB Driver & migrations
│   └── python/           # Flask + Google OR-Tools CP-SAT Solver
│       ├── app.py
│       ├── optimizer.py
│       ├── priority.py
│       ├── validator.py
│       └── requirements.txt
└── database/             # SQLite Database Schema & Persistence
    ├── marg.db
    ├── schema.sql
    └── seed.sql
```

---

## 🔒 Security & Best Practices

- `GROQ_API_KEY` is kept strictly on the Express backend and is **never** exposed to the browser/frontend.
- `.env` files are ignored by git (`.gitignore`). `.env.example` provides non-sensitive template defaults.
- Database persistence is maintained across dev restarts (`database/marg.db`).
