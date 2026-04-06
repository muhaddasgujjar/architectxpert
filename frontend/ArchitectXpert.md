# ArchitectXpert - AI-Powered Architectural Design Platform

## Overview
A cinematic, award-winning landing page and workspace for ArchitectXpert, an AI-powered architectural floorplan generation platform. The aesthetic follows an "Antigravity" dark mode theme with WebGL effects, smooth scroll, glassmorphic UI, and Framer Motion animations. Includes full authentication system with login/register.

## Architecture
- **Frontend**: React + Vite with TypeScript
- **Backend**: Express.js with Passport.js authentication
- **Database**: PostgreSQL (Drizzle ORM) for users and sessions
- **Auth**: passport-local + express-session + connect-pg-simple
- **Routing**: wouter (/, /auth, /workspace, /blog, /contact, /resources, /resources/:id, /use-cases, /tools/report-analysis, /tools/estimate-cost, /tools/data-scientist)
- **Styling**: Tailwind CSS with custom glassmorphism and glow utilities
- **Animations**: Framer Motion for micro-interactions and scroll-driven animations
- **3D/Canvas**: Three.js via @react-three/fiber and @react-three/drei (particle field, wireframe globe, floating rings)
- **Smooth Scrolling**: Lenis for inertial momentum scrolling
- **Icons**: lucide-react for UI icons, react-icons/si for brand logos

## Pages
- `/` - Landing page with hero, features, studio preview, about us, pricing, FAQ, CTA, and footer
- `/auth` - Authentication page with login/register tabs and back-to-home button
- `/workspace` - Protected floor plan generation workspace with report generation (requires auth)
- `/blog` - Blog articles page with featured and regular articles
- `/contact` - Contact form page with company info
- `/resources` - Resources page with 5 article cards (authors: Muhammad Muhaddas, Huzaifa Tehseen)
- `/resources/:id` - Individual article detail pages with full content
- `/tools/floorplan-generation` - AI 2D floor plan generator: select bedrooms/bathrooms/area/style/city → GPT-4o generates room layout JSON → server-side SVG renderer produces professional architectural drawing → download PNG/SVG (requires auth)
- `/tools/report-analysis` - Upload floor plan → AI validates image is architectural → GPT-4o Vision analyzes rooms/layout → K-Means clustering → downloadable 2-page PDF report (requires auth)
- `/tools/estimate-cost` - Building cost calculator with materials breakdown (requires auth)
- `/tools/data-scientist` - AI Architecture Advisor: describe a building project and get AI-powered design recommendations, material suggestions, cost breakdown, sustainability tips, building codes, timeline, and risks (requires auth)
- `/use-cases` - Use cases page with 6 architecture use case cards (residential, commercial, institutional, healthcare, educational, hospitality)

## Authentication Flow
- Users register or login via `/auth` page
- Sessions stored in PostgreSQL via connect-pg-simple
- Workspace route (`/workspace`) redirects to `/auth` if not authenticated
- Tool pages (/tools/*) show sign-in prompt if not authenticated
- Navbar dynamically shows Sign In/Get Started or username/Workspace/Logout based on auth state
- Hero "Enter Workspace" and CTA buttons route to `/auth` for unauthenticated users, `/workspace` for authenticated
- Passwords hashed with scrypt + random salt
- SESSION_SECRET env var required (no fallback)

## Key Components
- `client/src/pages/landing.tsx` - Main landing page assembling all sections
- `client/src/pages/auth.tsx` - Authentication page with login/register toggle tabs + back button
- `client/src/pages/workspace.tsx` - Generation workspace with form inputs, floorplan viewer, and report panel (auth-protected)
- `client/src/pages/blog.tsx` - Blog/articles page (legacy, merged into resources)
- `client/src/pages/contact.tsx` - Contact form with company info sidebar
- `client/src/pages/resources.tsx` - Resources & Blog page with tabbed view (Resources + Blog tabs) and newsletter
- `client/src/pages/use-cases.tsx` - Use cases page with 6 architecture sector cards
- `client/src/pages/article.tsx` - Individual article reading page
- `client/src/pages/report-analysis.tsx` - Upload floor plan + ML-powered analysis (K-Means clustering) with downloadable PDF report
- `client/src/pages/estimate-cost.tsx` - Building cost estimator with materials calculator + ML neural network prediction (dual estimate view)
- `client/src/pages/data-scientist.tsx` - AI Architecture Advisor with project form, recharts cost pie chart, and OpenAI-powered recommendations
- `client/src/data/articles.ts` - Centralized article data with full content
- `client/src/hooks/use-auth.tsx` - AuthProvider context and useAuth hook
- `client/src/components/layout/Navbar.tsx` - Fixed glassmorphic navbar with Tools dropdown (auth-aware)
- `client/src/components/three/ParticleField.tsx` - WebGL background for landing page (particles, wireframe globe, rings)
- `client/src/components/ui/PageParticles.tsx` - Lightweight particle background for sub-pages
- `client/src/components/ui/CustomCursor.tsx` - Custom cursor with hover expansion
- `client/src/components/ui/Preloader.tsx` - Cinematic page preloader animation
- `client/src/components/sections/Hero.tsx` - Hero with word reveal animation and spotlight CTA
- `client/src/components/sections/Features.tsx` - Bento grid with parallax depth mapping
- `client/src/components/sections/Studio.tsx` - Studio preview with real floorplan image
- `client/src/components/sections/AboutUs.tsx` - About Us section with stats, values, and team
- `client/src/components/sections/Pricing.tsx` - Three-tier pricing
- `client/src/components/sections/FAQ.tsx` - Accordion FAQ section with 5 questions
- `client/src/components/sections/CTA.tsx` - Final call to action with newsletter
- `client/src/components/sections/Newsletter.tsx` - Shared newsletter subscription component
- `client/src/components/sections/Footer.tsx` - Footer with working links
- `client/src/components/providers/SmoothScrollProvider.tsx` - Lenis smooth scroll wrapper
- `client/src/lib/floorplanGenerator.ts` - Algorithmic floorplan generation from dimensions and requirements

## AI Chatbot
- Intercom-style floating support widget (bottom-right corner) using OpenAI via Replit AI Integrations
- Three-tab layout: Home (greeting, search, quick topics, "Ask a question"), Help (architecture articles), Messages (conversation list)
- Architecture-only RAG: rejects off-topic questions (sports, celebrities, etc.)
- Streaming SSE responses with markdown formatting
- Quick topic links auto-create conversations and send pre-defined architecture questions
- Search bar allows free-text queries that create new conversations
- Conversation history stored in PostgreSQL (conversations + messages tables)
- Only visible to authenticated users
- Component: `client/src/components/ui/Chatbot.tsx`
- API routes: `/api/chat/conversations` CRUD + `/api/chat/conversations/:id/messages` (streaming)
- Toggle button: blue circle (open) / chevron-down (close)
- Bottom nav tabs: Home, Help, Messages with active state highlighting

## Server Files
- `server/auth.ts` - Passport setup, session config, auth routes (register/login/logout/user)
- `server/db.ts` - PostgreSQL connection pool and Drizzle instance
- `server/storage.ts` - DatabaseStorage class implementing IStorage interface
- `server/routes.ts` - Route registration, auth setup, chatbot API with OpenAI streaming, architecture advisor API, ML cost prediction API
- `server/ml/model.ts` - Neural network inference (12→16→8→1, ReLU) for construction cost prediction
- `server/ml/train.ts` - Training script: generates 2000 synthetic Pakistani construction samples, trains with Adam optimizer (7.11% MAPE)
- `server/ml/weights.json` - Trained model weights (auto-generated by train.ts)
- `server/ml/clustering.ts` - K-Means unsupervised clustering for floorplan layout classification (5 categories)
- `server/ml/generatePdf.ts` - PDF report generator using pdfkit with dark-themed ArchitectXpert branding
- `server/ml/exportDataset.ts` - Script to export training dataset as CSV/JSON/TXT to data/ folder
- `data/cost_estimation_dataset.csv` - 2000-row training dataset (area, floors, quality, bedrooms, etc.)
- `data/dataset_info.json` - Feature descriptions, model metadata, and training results
- `data/summary_statistics.txt` - Human-readable dataset summary with stats by quality/location
- `shared/schema.ts` - Drizzle schema for users, conversations, messages tables + types
- `server/replit_integrations/` - OpenAI integration files (chat, audio, image, batch)

## Design System
- **Background**: #050505 (obsidian)
- **Text**: #f8fafc
- **Accent Blue**: #3b82f6
- **Gold**: #fbbf24
- **Glass Panels**: rgba(255,255,255,0.03) with blur(24px) and 1px white/8 border
- **Font**: Space Grotesk (display), Inter (body), JetBrains Mono (code)
- **Noise overlay**: SVG-based static grain texture at 3% opacity

## Custom CSS Utilities
- `.glass-panel` / `.glass-panel-strong` - Glassmorphic containers
- `.noise-overlay` - Cinematic grain texture
- `.gradient-text` / `.gradient-text-blue` / `.gradient-text-gold` - Gradient text effects
- `.spotlight-btn` - Button with rotating conic-gradient border on hover

## Navbar
Navigation links: Resources, Use Cases, Contact + Tools dropdown
- **Resources** → /resources (merged Resources + Blog with tabbed view)
- **Use Cases** → /use-cases (6 architecture sector use case cards)
- **Contact** → /contact
- **Tools dropdown** with: Floorplan Generation → /workspace, Report Analysis → /tools/report-analysis, Estimate Cost → /tools/estimate-cost, Architecture Advisor → /tools/data-scientist

## Particles
Every sub-page (blog, contact, resources, articles, tools) has a PageParticles background component for visual consistency. The landing page uses the full ParticleField with wireframe globe and floating rings.
