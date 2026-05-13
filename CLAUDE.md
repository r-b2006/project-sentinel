# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Project Sentinel is an autonomous incident resolution engine. It uses a 3-agent architecture (Main Agent, Alpha-Debugger, Beta-QA) to detect, investigate, and resolve service failures.

## Tech Stack
- **Dashboard (app/)**: Next.js 14 with React, TypeScript, Tailwind CSS
- **Services (services/)**: Node.js with Express, JavaScript
- **Database**: SQLite with better-sqlite3 (sentinel.db)
- **AI**: Claude Code orchestrating sub-agents

## Running the Project

### Start Services
```bash
cd services
node service-auth.js    # Port 3001
node service-payment.js # Port 3002
node service-inventory.js # Port 3003
```

### Start Dashboard
```bash
cd app
npm run dev
# Visit http://localhost:3000
```

### Run Tests (per service)
```bash
cd services
node tests/service-payment.test.js
node tests/service-auth.test.js
node tests/service-inventory.test.js
```

### Chaos Monkey (inject bugs)
```bash
node scripts/chaos-monkey.js
```

### Health Monitoring
```bash
node scripts/poll-services.js
```

## Architecture

```
project-sentinel/
├── app/                 # Next.js dashboard (TypeScript)
│   ├── app/page.tsx    # Main dashboard UI
│   └── app/api/        # API routes for incidents
├── services/           # Microservices (JavaScript)
│   ├── service-auth.js    # Auth service (port 3001)
│   ├── service-payment.js # Payment service (port 3002)
│   ├── service-inventory.js # Inventory service (port 3003)
│   └── tests/          # Regression tests per service
├── scripts/            # Automation
│   ├── chaos-monkey.js    # Bug injection
│   └── poll-services.js   # Health monitoring
├── docs/
│   └── incident-history.log  # Resolution log
└── sentinel.db         # SQLite database for service status
```

## Agent Protocol

### Resolution Protocol (follow this order)
1. Read error log in `/services/logs/`
2. Check `/docs/incident-history.log` for same error
3. If fix failed before → find alternative approach
4. After fixing → run relevant test before committing
5. Log action to incident-history.log with timestamp
6. Update dashboard via POST to `/api/incidents`

### Agent Roles
- **Main Agent**: Orchestrates, updates dashboard/incident status
- **Alpha (Debugger)**: Reads logs, finds bugs, implements fixes
- **Beta (QA)**: Writes and runs regression tests

## Code Standards

- Services: JavaScript with Express
- Dashboard: TypeScript with Next.js
- Use `const`/`let` — never `var`
- All functions need try/catch error handling
- Log key actions with console.log and timestamps
- Test files: `service-name.test.js`
- Log files: `service-name.log` in `services/logs/`

## Commit Rules
- Never commit without passing tests
- Message format: `"fix: [what was fixed] by Sentinel Agent"`