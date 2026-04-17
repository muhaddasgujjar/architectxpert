<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai&logoColor=white" alt="OpenAI" />
  <img src="https://img.shields.io/badge/RAG-TF--IDF%20Retrieval-orange" alt="RAG" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e" alt="License" />
</p>

<h1 align="center">🏗️ ArchitectXpert — AI-Powered Architectural Design Platform</h1>

<p align="center">
  An intelligent, full-stack platform that helps architects, developers, and homeowners in Pakistan<br/>
  design floor plans, analyze blueprints, estimate construction costs, and get AI-powered advice — all in one sleek interface.
</p>

---

## ✨ Features at a Glance

| Feature | Description | Who It's For |
|---|---|---|
| 🏠 **Floor Plan Generator** | Generates 2D architectural layouts from plain-English requirements (bedrooms, bathrooms, garage, etc.) as interactive SVG | Homeowners & Architects |
| 💰 **Cost Estimator** | Dual-mode: formula-based pricing **+** a Python neural network (12→16→8→1) trained on Pakistani market data | Builders & Project Managers |
| 📊 **Report Analyzer** | Upload any floor plan image → AI identifies rooms, scores layout quality, and exports a professional PDF report | Architects & Engineers |
| 🤖 **RAG Chatbot** | GPT-4o-mini powered by a **local TF-IDF knowledge retrieval engine** — answers architecture questions with curated Pakistani construction data injected into every prompt | Everyone |
| 🔐 **Auth** | Secure registration & login with session-based authentication and PostgreSQL-backed session storage | All Users |

---

## 🏛️ System Architecture

ArchitectXpert uses a **microservices architecture** — each feature runs as an independent Node.js/Python service connected through an Express API Gateway.

```
┌──────────────────────────────────────────────────────────────────────┐
│                      BROWSER  (React 18 + Vite)                      │
│                       http://localhost:5000                           │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │  HTTP / SSE
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│              FRONTEND SERVER  (Express.js 5 — API Gateway)           │
│          Auth (Passport.js) · Session Store · Proxy Middleware        │
│                           Port 5000                                   │
└───────┬──────────────┬──────────────┬──────────────┬─────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐
  │ Floorplan│  │  Cost    │  │ Report   │  │   Floorplan Advisor  │
  │Generator │  │ Analyzer │  │ Analysis │  │   (RAG Chatbot)      │
  │          │  │          │  │          │  │                      │
  │ Port 8000│  │ Port 8001│  │ Port 8002│  │   Port 8003          │
  └──────────┘  └────┬─────┘  └────┬─────┘  └──────────┬──────────┘
                     │             │                    │
              Python Neural   OpenAI Vision        RAG Engine
              Network (ML)    + K-Means           (TF-IDF) →
              Zameen RF Model Clustering          GPT-4o-mini
```

### 🧠 RAG Pipeline (Floorplan Advisor)

```
User message
     │
     ▼
rag_engine.py  ──  TF-IDF retrieval over 200+ architecture knowledge chunks
     │              (materials, costs, codes, layout, MEP, sustainability…)
     ▼
Top-5 relevant chunks injected into GPT-4o-mini system prompt
     │
     ▼
OpenAI streams response  ──  token-by-token SSE  ──▶  Chatbot UI
     │
     ▼
Full response saved to PostgreSQL conversation history
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **Vite** | Dev server & build tool |
| **TypeScript 5.6** | Type-safe code |
| **Tailwind CSS** | Utility-first styling, premium dark theme |
| **Framer Motion** | Page transitions & micro-animations |
| **Radix UI** | Accessible headless component primitives |
| **Recharts** | Data visualization |

### Backend & Gateway
| Technology | Purpose |
|---|---|
| **Express.js 5** | API server & gateway for all microservices |
| **Passport.js** | Session-based authentication (local strategy) |
| **Drizzle ORM** | Type-safe PostgreSQL queries |
| **PostgreSQL** | Primary database (users, sessions, chat history) |
| **http-proxy-middleware** | API Gateway routing |

### AI & Machine Learning
| Technology | Purpose |
|---|---|
| **RAG Engine** (Python, zero deps) | TF-IDF keyword retrieval over a curated architecture knowledge base — retrieves top-5 relevant chunks per query |
| **OpenAI GPT-4o-mini** | Response generation, RAG context-augmented system prompts, streaming via SSE |
| **OpenAI Vision** | Floor plan image analysis & room detection |
| **Custom Neural Network** (Python) | Construction cost prediction — architecture `12→16→8→1` with ReLU, trained on 2,000 Pakistani data points |
| **Random Forest** (scikit-learn) | Zameen.com market valuation model |
| **K-Means Clustering** (TypeScript) | Floor plan layout classification into 5 categories |

---

## 📁 Project Structure

```
architectxpert/
├── frontend/                       # Main frontend + API Gateway
│   ├── client/src/
│   │   ├── pages/                  # Route-level page components
│   │   ├── components/             # Reusable UI (Chatbot, Workstation, etc.)
│   │   │   └── ui/Chatbot.tsx      # RAG chatbot UI — SSE streaming
│   │   ├── hooks/                  # Custom React hooks
│   │   └── lib/                    # Query client, context providers
│   ├── server/
│   │   ├── index.ts                # Express server entry point
│   │   ├── routes.ts               # API Gateway proxy routes
│   │   ├── auth.ts                 # Passport.js auth configuration
│   │   ├── db.ts                   # Drizzle DB connection
│   │   └── storage.ts              # User data access layer
│   ├── shared/schema.ts            # Drizzle ORM table definitions (shared)
│   ├── .env                        # Environment variables
│   └── package.json
│
├── floorplan-generation/           # Microservice: SVG floor plan generator
│   ├── index.ts                    # Express server (port 8000)
│   ├── floorplanSvg.ts             # Room layout engine & SVG renderer
│   └── .env
│
├── cost-analyzer/                  # Microservice: Construction cost estimator
│   ├── index.ts                    # Express server (port 8001)
│   ├── model.ts                    # TypeScript → Python bridge
│   ├── model.py                    # Neural network inference
│   ├── market_model.py             # Random Forest market valuation
│   ├── weights.json                # Pre-trained neural network weights
│   ├── zameen_rf_model.pkl         # Pre-trained RF model
│   └── .env
│
├── report-analysis/                # Microservice: AI blueprint analyzer
│   ├── index.ts                    # Express server (port 8002)
│   ├── clustering.ts               # K-Means clustering
│   ├── generatePdf.ts              # PDF report generator (PDFKit)
│   ├── analyze_floorplan.py        # Pillow-based image analysis pipeline
│   └── .env
│
├── floorplan-advisor/              # Microservice: RAG-powered AI chatbot
│   ├── index.ts                    # Express server (port 8003) + RAG orchestration
│   ├── rag_engine.py               # TF-IDF retriever + system prompt builder
│   ├── rag_knowledge_base.py       # 200+ curated architecture knowledge chunks
│   ├── architecture_advisor.py     # Rule-based project analysis engine
│   ├── db.ts                       # Drizzle DB (conversation history)
│   └── .env
│
├── package.json                    # npm workspaces root
├── requirements.txt                # Python dependencies
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Minimum Version | Download |
|---|---|---|
| **Node.js** | v20 | [nodejs.org](https://nodejs.org) |
| **Python** | 3.10 | [python.org](https://python.org) |
| **Git** | Any | [git-scm.com](https://git-scm.com) |

You'll also need:
- A **PostgreSQL** database — [Supabase](https://supabase.com) free tier works perfectly
- An **OpenAI API key** — [platform.openai.com](https://platform.openai.com)

---

### Step 1 — Clone

```bash
git clone https://github.com/muhaddasgujjar/architectxpert.git
cd architectxpert
```

### Step 2 — Install All Dependencies

```bash
# Install all Node.js workspace dependencies at once
npm install

# Install Python dependencies
pip install -r requirements.txt
```

### Step 3 — Configure Environment Variables

Create a `.env` file inside **each** service directory:

**`frontend/.env`**
```env
DATABASE_URL=postgresql://user:password@host:5432/architectxpert
SESSION_SECRET=any-random-secret-string
AI_INTEGRATIONS_OPENAI_API_KEY=sk-proj-your-openai-key
FLOORPLAN_SERVICE_URL=http://localhost:8000
COST_SERVICE_URL=http://localhost:8001
REPORT_SERVICE_URL=http://localhost:8002
ADVISOR_SERVICE_URL=http://localhost:8003
```

**`floorplan-generation/.env`**
```env
PORT=8000
```

**`cost-analyzer/.env`**
```env
PORT=8001
```

**`report-analysis/.env`**
```env
PORT=8002
AI_INTEGRATIONS_OPENAI_API_KEY=sk-proj-your-openai-key
```

**`floorplan-advisor/.env`**
```env
PORT=8003
DATABASE_URL=postgresql://user:password@host:5432/architectxpert
AI_INTEGRATIONS_OPENAI_API_KEY=sk-proj-your-openai-key
```

### Step 4 — Push Database Schema

```bash
cd frontend
npx drizzle-kit push
cd ..
```

### Step 5 — Start All Services

Open **5 terminals** and run one command in each:

```bash
# Terminal 1 — Floor Plan Generator  (port 8000)
cd floorplan-generation
npx tsx --env-file=.env index.ts

# Terminal 2 — Cost Analyzer  (port 8001)
cd cost-analyzer
npx tsx --env-file=.env index.ts

# Terminal 3 — Report Analysis  (port 8002)
cd report-analysis
npx tsx --env-file=.env index.ts

# Terminal 4 — Floorplan Advisor / RAG Chatbot  (port 8003)
cd floorplan-advisor
node --import tsx/esm --env-file=.env index.ts

# Terminal 5 — Frontend + API Gateway  (port 5000)
cd frontend
# Windows:
set NODE_ENV=development && npx tsx --env-file=.env server/index.ts
# Linux / macOS:
NODE_ENV=development npx tsx --env-file=.env server/index.ts
```

### Step 6 — Open the App

Visit **[http://localhost:5000](http://localhost:5000)**

1. Click **Sign In** → switch to the **Sign Up** tab
2. Create your account
3. Explore the Workspace, Tools, and AI Chatbot

---

## 📖 Feature Walkthroughs

### 🏠 Floor Plan Generator
1. Open **Workspace** from the navigation bar
2. Set plot **Width × Height** (in feet)
3. Type requirements: `"3 bedrooms, 2 bathrooms, open kitchen, garage"`
4. Click **Generate Floor Plan** — get an interactive SVG layout
5. Download as SVG or PNG

### 💰 Cost Estimator
1. Go to **Tools → Estimate Cost**
2. Enter: area, floors, bedrooms, bathrooms, quality level, location
3. Click **Calculate & Predict**
4. Compare **formula estimate** vs **neural network prediction** side-by-side
5. View full breakdown: structure, finishes, MEP, external works

### 📊 Report Analyzer
1. Go to **Tools → Report Analysis**
2. Upload a floor plan image (PNG, JPEG, PDF, SVG, WebP)
3. AI analyzes rooms, scores layout quality, and flags issues
4. Download a professional **PDF report**

### 🤖 RAG Architecture Advisor
1. Click the **chat bubble** (bottom-right corner)
2. Ask anything about architecture, e.g.:
   - *"What wall materials should I use in Lahore?"*
   - *"How do I estimate construction costs in Pakistan?"*
   - *"What are the building code setback requirements?"*
3. The RAG engine retrieves the most relevant knowledge chunks and feeds them to GPT-4o-mini
4. Get a detailed, Pakistan-specific, streamed response

---

## 🔌 API Reference

All requests go through the gateway at `http://localhost:5000`:

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/user` | Get current session user |

### Floor Plan Generation
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/tools/generate-floorplan` | Generate SVG floor plan |

### Cost Analysis
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/tools/predict-cost` | Neural network cost prediction |

### Report Analysis
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/tools/analyze-floorplan` | Upload & analyze floor plan image |
| `POST` | `/api/tools/generate-report-pdf` | Export PDF report |

### RAG Chatbot & Advisor
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/chat/conversations` | List user's conversations |
| `POST` | `/api/chat/conversations` | Create a new conversation |
| `DELETE` | `/api/chat/conversations/:id` | Delete a conversation |
| `GET` | `/api/chat/conversations/:id/messages` | Fetch message history |
| `POST` | `/api/chat/conversations/:id/messages` | Send message → **RAG retrieval → GPT-4o-mini stream (SSE)** |
| `POST` | `/api/tools/architecture-advisor` | Rule-based project analysis (JSON) |

---

## 🗄️ Database Schema

| Table | Columns | Purpose |
|---|---|---|
| `users` | id, username, password (hashed) | User accounts |
| `conversations` | id, userId, title, createdAt | Chat sessions |
| `messages` | id, conversationId, role, content, createdAt | Chat messages |
| `user_sessions` | Auto-managed | Express session storage |

---

## 🧪 Test Individual Services

```bash
# Floor Plan Generator
curl -X POST http://localhost:8000/api/tools/generate-floorplan \
  -H "Content-Type: application/json" \
  -d '{"bedrooms":3,"bathrooms":2,"totalArea":1200,"floors":1,"style":"Modern"}'

# Cost Analyzer
curl -X POST http://localhost:8001/api/tools/predict-cost \
  -H "Content-Type: application/json" \
  -d '{"area":1200,"floors":1,"quality":"standard","bedrooms":3,"bathrooms":2,"hasGarage":true,"locationTier":2}'

# RAG Knowledge Retrieval (direct Python test)
python floorplan-advisor/rag_engine.py '{"query":"What foundation should I use in Karachi?","history":[]}'
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author

**Muhaddas Gujjar** — [GitHub](https://github.com/muhaddasgujjar)

---

<p align="center">
  <b>Built with ❤️ for Pakistan's architectural community</b>
</p>
