# ArchitectXpert

ArchitectXpert is an AI-Powered Architectural Design Platform featuring a cinematic, award-winning dark mode aesthetic. This platform provides architectural floorplan generation, AI-powered building cost estimation, ML-based report analysis, and an architecture advisor chatbot. 

## Features

- **AI Floorplan Generation**: Generates 2D architectural drawings dynamically based on user requirements.
- **Report Analysis & Clustering**: ML-powered validation and K-Means clustering of floorplan layouts.
- **Cost Estimator**: Building cost calculator featuring a neural network predictor.
- **AI Architecture Advisor**: An intelligent chatbot that helps users with architectural recommendations, sustainability tips, and codes.
- **Secure Authentication**: Robust user authentication and session management.

## Tech Stack
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Framer Motion, Three.js (@react-three/fiber)
- **Backend**: Express.js, PostgreSQL (Drizzle ORM), Passport.js
- **AI / ML**: OpenAI API integrations, Custom Neural Network, K-Means Clustering

## Getting Started

### Prerequisites
- Node.js (v20+)
- PostgreSQL Database

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/muhaddasgujjar/architectxpert.git
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Set up environment variables
   Create a `.env` file in the root directory and add the following context:
   ```env
   DATABASE_URL=your_postgresql_database_url
   SESSION_SECRET=your_session_secret
   AI_INTEGRATIONS_OPENAI_API_KEY=your_openai_api_key
   ```
4. Push the database schema
   ```bash
   npm run db:push
   ```
5. Run the development server
   ```bash
   npm run dev
   ```

## License
MIT License
