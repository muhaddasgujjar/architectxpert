<p align="center">
  <img src="https://img.shields.io/badge/Node.js-24+-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai&logoColor=white" alt="OpenAI" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

# 🏗️ ArchitectXpert — AI-Powered Architectural Design Platform

**ArchitectXpert** is an intelligent, full-stack platform that helps architects, developers, and homeowners in Pakistan design, analyze, and estimate building costs — all powered by AI and machine learning.

> Think of it as your **AI architectural assistant**: draw floor plans, get instant cost estimates using a neural network, analyze existing blueprints with computer vision, and chat with an AI architecture advisor — all in one sleek, dark-themed interface.

---

## 🎯 What Can It Do?

| Feature | What It Does | Who It's For |
|---------|-------------|--------------|
| 🏠 **Floor Plan Generator** | Automatically creates 2D architectural layouts based on your room requirements (bedrooms, bathrooms, kitchen, garage, etc.) | Homeowners & Architects |
| 💰 **Cost Estimator** | Calculates construction costs using both formula-based pricing and a **Python neural network** trained on Pakistani market rates | Builders & Project Managers |
| 📊 **Report Analyzer** | Upload a floor plan image → AI validates it, identifies rooms, scores layout quality, and generates a professional PDF report | Architects & Engineers |
| 🤖 **Architecture Advisor** | AI chatbot that provides building recommendations, sustainability tips, material guidance, and code compliance | Everyone |
| 🔐 **User Authentication** | Secure registration & login with session management | All Users |

---

## 🏛️ Architecture Overview

ArchitectXpert uses a **microservices architecture** — each major feature runs as its own independent service, connected through an API Gateway.

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (React + Vite)                  │
│                     http://localhost:5000                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                   FRONTEND SERVER (API Gateway)                  │
│              Express.js + Auth + Proxy Middleware                 │
│                      Port 5000                                   │
└───────┬──────────┬──────────┬──────────┬────────────────────────┘
        │          │          │          │
        ▼          ▼          ▼          ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐
   │ Floor   │ │  Cost   │ │ Report  │ │  Floor Plan  │
   │  Plan   │ │Analyzer │ │Analysis │ │   Advisor    │
   │Generator│ │         │ │         │ │              │
   │Port 8000│ │Port 8001│ │Port 8002│ │  Port 8003   │
   └─────────┘ └────┬────┘ └────┬────┘ └──────┬───────┘
                     │          │              │
                Python ML    OpenAI       OpenAI +
                Neural Net   Vision       PostgreSQL
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18** — UI framework
- **Vite** — Lightning-fast build tool
- **TypeScript** — Type-safe code
- **Tailwind CSS** — Utility-first styling with a premium dark theme
- **Framer Motion** — Smooth page transitions & micro-animations
- **Three.js** (`@react-three/fiber`) — 3D visual elements
- **Recharts** — Data visualization charts
- **Radix UI** — Accessible component primitives

### Backend
- **Express.js 5** — API server & gateway
- **Passport.js** — User authentication (local strategy)
- **PostgreSQL** — Relational database (via [Supabase](https://supabase.com))
- **Drizzle ORM** — Type-safe database queries
- **http-proxy-middleware** — API Gateway routing to microservices

### AI & Machine Learning
- **OpenAI GPT-4o Mini** — Architecture advisor chatbot & floor plan analysis
- **OpenAI Vision** — Image-based floor plan validation & room detection
- **Custom Neural Network** (Python) — Construction cost prediction
  - Architecture: `12 → 16 → 8 → 1` with ReLU activation
  - Trained on 2,000 Pakistani construction data points
  - Features: area, floors, quality, bedrooms, bathrooms, location tier, etc.
- **K-Means Clustering** (TypeScript) — Floor plan layout classification into 5 categories

---

## 📁 Project Structure

```
ArchitectXpert/
├── frontend/                    # Main frontend + API Gateway
│   ├── client/                  # React application
│   │   ├── src/
│   │   │   ├── pages/           # All page components
│   │   │   ├── components/      # Reusable UI components
│   │   │   └── hooks/           # Custom React hooks
│   │   └── index.html
│   ├── server/                  # Express.js backend
│   │   ├── index.ts             # Server entry point
│   │   ├── routes.ts            # API Gateway proxy routes
│   │   ├── auth.ts              # Authentication logic
│   │   ├── db.ts                # Database connection
│   │   └── storage.ts           # User data access layer
│   ├── shared/                  # Shared database schema
│   │   └── schema.ts            # Drizzle ORM table definitions
│   ├── .env                     # Environment variables
│   └── package.json
│
├── floorplan-generation/        # Microservice: Floor plan SVG generator
│   ├── index.ts                 # Express server (port 8000)
│   ├── floorplanSvg.ts          # Room layout & SVG rendering engine
│   └── .env
│
├── cost-analyzer/               # Microservice: Construction cost estimator
│   ├── index.ts                 # Express server (port 8001)
│   ├── model.ts                 # TypeScript → Python bridge
│   ├── model.py                 # Neural network prediction model
│   ├── weights.json             # Pre-trained model weights
│   └── .env
│
├── report-analysis/             # Microservice: AI floor plan analyzer
│   ├── index.ts                 # Express server (port 8002)
│   ├── clustering.ts            # K-Means clustering algorithm
│   ├── generatePdf.ts           # Professional PDF report generator
│   └── .env
│
├── floorplan-advisor/           # Microservice: AI architecture chatbot
│   ├── index.ts                 # Express server (port 8003)
│   ├── db.ts                    # Database connection for chat history
│   └── .env
│
├── package.json                 # Root workspace configuration
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have these installed on your computer:

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | v20 or higher | [nodejs.org](https://nodejs.org) |
| **Python** | 3.10 or higher | [python.org](https://python.org) |
| **Git** | Any recent version | [git-scm.com](https://git-scm.com) |

You'll also need:
- A **PostgreSQL database** (we recommend [Supabase](https://supabase.com) — free tier works fine)
- An **OpenAI API key** ([platform.openai.com](https://platform.openai.com))

### Step 1: Clone the Repository

```bash
git clone https://github.com/muhaddasgujjar/architectxpert.git
cd architectxpert
```

### Step 2: Install Dependencies

From the project root, run:

```bash
npm install
```

This installs dependencies for all workspaces (frontend + all microservices) at once.

### Step 3: Set Up Environment Variables

Each service needs its own `.env` file. Create them as follows:

**`frontend/.env`**
```env
DATABASE_URL=postgresql://your_user:your_password@your_host:5432/your_db
SESSION_SECRET=any_random_secret_string_here
AI_INTEGRATIONS_OPENAI_API_KEY=sk-proj-your-openai-api-key
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
AI_INTEGRATIONS_OPENAI_API_KEY=sk-proj-your-openai-api-key
```

**`floorplan-advisor/.env`**
```env
PORT=8003
AI_INTEGRATIONS_OPENAI_API_KEY=sk-proj-your-openai-api-key
DATABASE_URL=postgresql://your_user:your_password@your_host:5432/your_db
```

### Step 4: Set Up the Database

Push the database schema to your PostgreSQL instance:

```bash
cd frontend
npx drizzle-kit push
cd ..
```

### Step 5: Start All Services

Open **5 separate terminal windows** and run one command in each:

```bash
# Terminal 1 — Floor Plan Generator (Port 8000)
cd floorplan-generation
npx tsx --env-file=.env index.ts

# Terminal 2 — Cost Analyzer (Port 8001)
cd cost-analyzer
npx tsx --env-file=.env index.ts

# Terminal 3 — Report Analysis (Port 8002)
cd report-analysis
npx tsx --env-file=.env index.ts

# Terminal 4 — Floor Plan Advisor (Port 8003)
cd floorplan-advisor
node --import tsx/esm --env-file=.env index.ts

# Terminal 5 — Frontend + API Gateway (Port 5000)
cd frontend
set NODE_ENV=development
npx tsx --env-file=.env server/index.ts
```

> **💡 Tip for Linux/Mac users:** Replace `set NODE_ENV=development` with `export NODE_ENV=development`

### Step 6: Open the App

Visit **[http://localhost:5000](http://localhost:5000)** in your browser.

1. Click **"Sign In"** → go to the **"Sign Up"** tab
2. Create an account (username + password)
3. You're in! Try the workspace and tools.

---

## 📖 How to Use Each Feature

### 🏠 Floor Plan Generator
1. Go to **Workspace** from the navigation bar
2. Set your desired **Width** and **Height** (in feet)
3. Enter **Requirements** (e.g., "3 bedrooms, 2 bathrooms, garage, open kitchen")
4. Click **"Generate Floor Plan"**
5. View and download the layout

### 💰 Cost Estimator
1. Go to **Tools → Estimate Cost**
2. Fill in project details: area, stories, bedrooms, bathrooms, quality level, location
3. Click **"Calculate & Predict"**
4. View both the **formula-based estimate** and the **ML neural network prediction** side by side
5. See the detailed cost breakdown (grey structure, finishing, electrical, plumbing, fixtures)

### 📊 Report Analysis
1. Go to **Tools → Report Analysis**
2. Upload a floor plan image (PNG, JPEG, PDF, SVG, or WebP)
3. AI validates the image, identifies rooms, and scores the layout
4. Download a professional **PDF report** with full analysis

### 🤖 Architecture Advisor
1. Click the **chat bubble** icon (bottom-right) from any page
2. Start a conversation with the AI advisor
3. Ask about building materials, costs, sustainability, codes, or design recommendations

---

## 🔌 API Endpoints

All API calls go through the gateway at `http://localhost:5000`:

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/logout` | Log out |
| `GET` | `/api/auth/user` | Get current user |

### Floor Plan Generation
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tools/generate-floorplan` | Generate a new floor plan |

### Cost Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tools/predict-cost` | Get ML-based cost prediction |

### Report Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tools/analyze-floorplan` | Upload & analyze a floor plan image |
| `POST` | `/api/tools/generate-report-pdf` | Generate a PDF report |

### Architecture Advisor
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/chat/conversations` | List conversations |
| `POST` | `/api/chat/conversations` | Create a conversation |
| `DELETE` | `/api/chat/conversations/:id` | Delete a conversation |
| `GET` | `/api/chat/conversations/:id/messages` | Get messages |
| `POST` | `/api/chat/conversations/:id/messages` | Send a message (SSE stream) |
| `POST` | `/api/tools/architecture-advisor` | Get project recommendations (JSON) |

---

## 🧪 Testing the Services Individually

You can test each microservice directly without the frontend:

```bash
# Test Floor Plan Generator
curl -X POST http://localhost:8000/api/tools/generate-floorplan \
  -H "Content-Type: application/json" \
  -d '{"bedrooms":3,"bathrooms":2,"totalArea":1200,"floors":1,"style":"Modern"}'

# Test Cost Analyzer
curl -X POST http://localhost:8001/api/tools/predict-cost \
  -H "Content-Type: application/json" \
  -d '{"area":1200,"floors":1,"quality":"standard","bedrooms":3,"bathrooms":2,"hasBasement":false,"hasGarage":true,"locationTier":2}'
```

---

## 🗄️ Database Schema

The application uses three main tables in PostgreSQL:

| Table | Purpose |
|-------|---------|
| `users` | User accounts (id, username, hashed password) |
| `conversations` | AI chat sessions per user |
| `messages` | Individual chat messages (user & assistant) |
| `user_sessions` | Express session storage (auto-created) |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Muhaddas Gujjar** — [GitHub](https://github.com/muhaddasgujjar)

---

<p align="center">
  <b>Built with ❤️ for Pakistan's architectural community</b>
</p>
