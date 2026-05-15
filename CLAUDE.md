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
- **Resolved by Claude**: Count of CLOSED entries in /docs/incident-history.log (recounted from log file on each dashboard refresh)
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

This triggers full flow - complete ALL 10 steps automatically, never stop to ask questions:

```
**Step 1**: Main Agent updates dashboard to INVESTIGATING via POST to http://localhost:3000/api/services/update
**Step 2**: Main Agent logs INVESTIGATING entry to /docs/incident-history.log
**Step 3**: Spawn Subagent Alpha to read /services/logs/, find and fix the bug
**Step 4**: Spawn Subagent Beta to write and run regression tests
**Step 5**: Main Agent calculates resolution time
**Step 6**: Main Agent logs RESOLVED|CLOSED|[resolution_time] to /docs/incident-history.log
**Step 7**: Main Agent updates dashboard to RESOLVED, recounts ALL CLOSED entries in incident-history.log and updates Resolved by Claude counter
**Step 8**: Strictly Restart fixed service using "start cmd /k node <service-file>.js" — opens in visible CMD window
**Step 9**: Verify health endpoint returns OK
**Step 10**: Poll-services window auto-updates showing service back as OK
```

**STRICT RULES:**
- Never stop to ask questions
- Never use start /b
- If a command fails, try alternative and continue automatically
- Complete ALL 10 steps every single time

## Auto-Restart Protocol
- poll-services.js monitors all services every 10 seconds
- When service status is RESOLVED in database → automatically restart using: start cmd /k node <service-file>.js
- NEVER use "start /b" or "start node"
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
