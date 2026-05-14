# Project Sentinel — Claude Agent Rules

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

## TypeScript & Code Standards
- Always use strict TypeScript
- All variables: camelCase naming
- Never use var — only const or let
- All functions must have error handling with try/catch
- Every file must have console.log for key actions

## Resolution Protocol
Before applying ANY fix:
1. Read the error log in /services/logs/
2. Open /docs/incident-history.log — check if this exact error happened before
3. If same fix was tried and FAILED before → activate Thinking Mode to find alternative
4. After fixing, always run npm test before committing
5. Log every action to /docs/incident-history.log with timestamp
6. Always update dashboard status after each action
7. Track resolution time (time from INVESTIGATING to RESOLVED) and include in log entry

## Dashboard Metrics
- **Active Incidents**: Count of services with status=CRITICAL or INVESTIGATING
- **Resolved by Claude**: TOTAL count of incidents resolved in current session (increments by 1 each time status=RESOLVED is set)
- **Resolution Time**: Time difference between INVESTIGATING timestamp and RESOLVED timestamp, displayed in format "Xm Ys"

## Incident Log Format
Each entry follows this format:
- INCIDENT: "INCIDENT|[timestamp]|[service]|[bug description]|OPEN"
- INVESTIGATING: "INVESTIGATING|[timestamp]|[service]|Main Agent activated|IN_PROGRESS"
- RESOLVED: "RESOLVED|[timestamp]|[service]|[notes]|CLOSED|[resolution_time]"
  - resolution_time format: "Xm Ys" (e.g., "5m 23s")

## Short Sentinel Agent Command
When a service is CRITICAL, use this short command:
"SENTINEL AGENT — [service-name] is CRITICAL. Execute full Resolution Protocol from CLAUDE.md with Main Agent, Alpha Debugger, and Beta QA. After Beta confirms, restart the fixed service."

This triggers full flow:
1. Main Agent updates dashboard to INVESTIGATING
2. Appends "INVESTIGATING|[timestamp]|[service]|Main Agent activated|IN_PROGRESS" to incident-history.log
3. Spawns Subagent Alpha to read logs, find and fix the bug
4. Spawns Subagent Beta to write and run regression tests
5. Main Agent calculates resolution time (RESOLVED timestamp - INVESTIGATING timestamp)
6. Main Agent updates dashboard to RESOLVED with resolved_by="Claude Sentinel" — increments "Resolved by Claude" counter
7. Appends "RESOLVED|[timestamp]|[service]|Fix verified by Beta|CLOSED|[resolution_time]" to incident-history.log
8. Restarts the fixed service using "node <service-file>.js &"

## Auto-Restart Protocol
- poll-services.js monitors all services every 10 seconds
- When service status is RESOLVED in database → automatically restart using: node <service-file>.js &
- IMPORTANT: On Git Bash (Windows), use "node <service-file>.js &" directly. NEVER use "start /b"
- After restart wait 3 seconds → check health → if OK update database to OK
- Service paths:
  * service-auth: C:/Users/HP/project-sentinel/services/service-auth.js
  * service-payment: C:/Users/HP/project-sentinel/services/service-payment.js
  * service-inventory: C:/Users/HP/project-sentinel/services/service-inventory.js

## Agent Roles — STRICT
- Main Agent: ONLY updates dashboard UI and incident status
- Subagent Alpha (Debugger): ONLY reads logs, finds bugs, implements fixes
- Subagent Beta (QA): ONLY writes regression tests and runs them

## 5 Bug Types (Chaos Monkey)
- Bug Type 1: Syntax Error — adds "const x = ;" on line 2
- Bug Type 2: Type Mismatch — wraps port in quotes + throws error
- Bug Type 3: Logic Error — changes "OK" to "BROKEN" in health route
- Bug Type 4: Delete Dependency — comments out express require line
- Bug Type 5: Corrupt JSON — creates invalid config.json + requires it

## Naming Conventions
- Service files: service-name.js
- Test files: service-name.test.js
- Log files: service-name.log

## Commit Rules
- Never commit without passing tests
- Commit message format: "fix: [what was fixed] by Sentinel Agent"