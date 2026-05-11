# Project Sentinel — Claude Agent Rules

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

## Agent Roles — STRICT
- Main Agent: ONLY updates dashboard UI and incident status
- Subagent Alpha (Debugger): ONLY reads logs, finds bugs, implements fixes
- Subagent Beta (QA): ONLY writes regression tests and runs them

## Naming Conventions
- Service files: service-name.js
- Test files: service-name.test.js
- Log files: service-name.log

## Commit Rules
- Never commit without passing tests
- Commit message format: "fix: [what was fixed] by Sentinel Agent"