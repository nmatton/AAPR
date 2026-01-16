# AAPPR - Agile Adaptation Platform for Practice Research

Research-grade web application for systematic identification and resolution of agile practice friction points through personality-informed collective decision-making.

## Tech Stack

**Frontend:**
- React 18.2.0 + TypeScript 5.2+
- Vite 5.0+ (build tool)
- TailwindCSS 3.3+ (styling)

**Backend:**
- Node.js 18+ LTS
- Express 4.18+
- TypeScript 5.2+
- PostgreSQL 14+ (planned)

## Prerequisites

- Node.js 18.0.0 or higher
- npm (comes with Node.js)

Check your Node version:
```bash
node -v  # Should be v18.0.0 or higher
```

## Setup Instructions

### 1. Clone and Install

```bash
# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../server
npm install
```

### 2. Configure Environment Variables

**Backend** - Copy and configure:
```bash
cd server
cp .env.example .env
# Edit .env with your database credentials
```

**Frontend** - Copy and configure:
```bash
cd client
cp .env.example .env
# Default API URL is http://localhost:3000
```

### 3. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
# Server runs on http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
# Client runs on http://localhost:5173
```

### 4. Verify Setup

- Open http://localhost:5173 in your browser
- Check backend health: http://localhost:3000/api/v1/health

## Development Workflow

### Running Tests
```bash
# Frontend
cd client
npm run type-check

# Backend
cd server
npm run build  # Validates TypeScript
```

### Production Build
```bash
# Frontend
cd client
npm run build
# Output: client/dist/

# Backend
cd server
npm run build
# Output: server/dist/
```

## Project Structure

```
bmad_version/
├── client/              # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   └── package.json
├── server/              # Express + TypeScript backend
│   ├── src/
│   │   ├── index.ts
│   │   └── logger/
│   ├── .env.example
│   └── package.json
└── README.md
```

## Architecture Documentation

See [`_bmad-output/planning-artifacts/architecture.md`](_bmad-output/planning-artifacts/architecture.md) for complete architectural decisions and patterns.

## Version Constraints

Critical version locking (DO NOT upgrade during MVP):
- React: **18.2.x** (locked for MVP stability)
- Node.js: **18.0.0+** (Vite requirement)
- TypeScript: **5.2.0+** with strict mode

See [VERSION_MANIFEST.md](VERSION_MANIFEST.md) for exact versions.

## Code Quality

- TypeScript strict mode enabled
- All code type-checked before commit
- ESLint + Prettier (coming soon)

## License

Research project - Université de Namur
