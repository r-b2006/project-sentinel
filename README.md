# Project Sentinel

Autonomous Incident Resolution Engine powered by Claude Code.

## What is Project Sentinel?

Project Sentinel is an AI-driven incident management system that automatically detects, investigates, and resolves service failures. It uses a multi-agent architecture where Claude Code acts as the orchestrator, delegating tasks to specialized sub-agents.

## The 3-Agent System

### Main Agent (Coordinator)
- Orchestrates the entire resolution workflow
- Updates the dashboard UI and incident status in the database
- Logs all actions to the incident history

### Alpha (Debugger)
- Reads error logs to identify root causes
- Implements fixes in service code
- Restarts affected services

### Beta (QA)
- Writes and runs regression tests
- Verifies that fixes resolve the issue without breaking other functionality
- Reports test results back to Main Agent

## How to Run Locally

### 1. Start the Microservices

```bash
cd services
node service-auth.js    # Port 3001
node service-payment.js # Port 3002
node service-inventory.js # Port 3003
```

### 2. Start the Next.js Dashboard

```bash
cd app
npm run dev
```

Visit `http://localhost:3000` to see the dashboard.

### 3. Run the Chaos Monkey (Optional)

To inject bugs and test the system:

```bash
node scripts/chaos-monkey.js
```

### 4. Run Health Monitoring

```bash
node scripts/poll-services.js
```

## Tech Stack

- **Frontend**: Next.js 14 with React and Tailwind CSS
- **Backend Services**: Node.js with Express
- **Database**: SQLite with better-sqlite3
- **AI Orchestration**: Claude Code
- **Deployment**: Vercel (via GitHub Actions)

## Project Structure

```
project-sentinel/
├── app/                 # Next.js dashboard
│   ├── app/page.tsx    # Main dashboard UI
│   └── api/            # API routes
├── services/           # Microservices
│   ├── service-auth.js
│   ├── service-payment.js
│   ├── service-inventory.js
│   └── tests/          # Regression tests
├── scripts/            # Automation scripts
│   ├── chaos-monkey.js # Bug injection
│   └── poll-services.js # Health monitoring
├── docs/               # Documentation
│   └── incident-history.log
└── sentinel.db         # SQLite database
```