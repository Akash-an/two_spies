---
name: debug-and-logs
description: >-
  Systematic debugging workflow focusing on log examination and error diagnosis
allowed-tools:
  - "Bash(*)"
  - "View(*)"
---

# Debug and Logs Skill

## Purpose
Systematic debugging workflow for the Two Spies project, focusing on log examination and error diagnosis.

---

## When to Use This Skill

Trigger this skill when:
- User reports an error or unexpected behavior
- Services fail to start or crash
- WebSocket connection issues occur
- Game state synchronization problems arise
- After implementing changes that might affect runtime behavior
- User asks to "debug", "check logs", "what's wrong", or "why isn't it working"

---

## Log File Locations

### Backend (C++ Server)
- **Path**: `backend/server.log`
- **Contains**: 
  - Server startup/shutdown messages
  - WebSocket connection/disconnection events
  - Match creation and player assignment
  - Game state updates
  - Error messages and exceptions
  - Validation failures

### Frontend (Vite Dev Server)
- **Path**: `frontend/vite.log`
- **Contains**:
  - Vite dev server startup
  - TypeScript compilation errors
  - Module resolution issues
  - Hot module replacement (HMR) activity
  - Build errors

### Process IDs
- **Backend PID**: `backend/build/server.pid` (if server is running)

---

## Debugging Workflow

### Step 1: Identify the Problem Area

Ask yourself:
- Is it a connection issue? → Check both logs
- Is it a compilation issue? → Check frontend log
- Is it a game logic issue? → Check backend log
- Is it a UI rendering issue? → Check browser console + frontend log

### Step 2: Read the Relevant Log

```bash
# View full log
cat backend/server.log
cat frontend/vite.log

# View last N lines
tail -n 50 backend/server.log

# Follow log in real-time
tail -f backend/server.log

# Search for errors
grep -i error backend/server.log
grep -i "exception" backend/server.log
grep -i "failed" backend/server.log

# Search for specific terms
grep "WebSocket" backend/server.log
grep "Match" backend/server.log
```

### Step 3: Identify Root Cause

Common error patterns:

**Backend**:
- `Address already in use` → Server already running, kill it first
- `Connection refused` → Server not started or wrong port
- `JSON parse error` → Client sending malformed messages
- `Validation failed` → Client sent invalid game action
- `Match not found` → Session/match lifecycle issue

**Frontend**:
- `ECONNREFUSED` → Backend server not running
- `Module not found` → Missing dependency or wrong import path
- `Type error` → TypeScript compilation failure
- `WebSocket connection failed` → Backend not reachable

### Step 4: Implement Fix

After identifying the root cause:
1. Implement the fix
2. Rebuild the affected service (use scripts/rebuild-*.sh)
3. Check logs again to confirm the error is resolved
4. Test the functionality

### Step 5: Verify Resolution

- Confirm error messages no longer appear
- Verify expected behavior is working
- Check logs show successful operations

---

## Common Debugging Scenarios

### Scenario: Server Won't Start

```bash
# Check if server is already running
cat backend/build/server.pid
ps aux | grep two_spies_server

# Kill existing server if needed
kill $(cat backend/build/server.pid)

# Check for port conflicts
lsof -i :8080

# Read server log to see startup errors
tail -n 100 backend/server.log
```

### Scenario: Frontend Can't Connect

```bash
# Verify backend is running
ps aux | grep two_spies_server

# Check backend log for connection attempts
tail -f backend/server.log

# Check frontend log for connection errors
tail -f frontend/vite.log

# Verify WebSocket URL is correct
grep -r "ws://" frontend/src/
```

### Scenario: Game State Desync

```bash
# Check backend log for state updates
grep "MATCH_STATE" backend/server.log

# Check for validation failures
grep -i "invalid\|failed" backend/server.log

# Look for player action processing
grep "PLAYER_ACTION" backend/server.log
```

### Scenario: Build Failures

```bash
# Check compilation errors
cat frontend/vite.log

# Check C++ build errors
cat backend/server.log

# Verify dependencies
cd frontend && npm list
```

---

## Advanced Debugging

### Enable Verbose Logging

If more detail is needed, consider:
- Adding debug print statements to C++ code
- Adding console.log to TypeScript code
- Using browser DevTools Network tab for WebSocket messages
- Using browser DevTools Console for JavaScript errors

### Log Rotation

For long debugging sessions:
```bash
# Archive old logs
mv backend/server.log backend/server.log.old
mv frontend/vite.log frontend/vite.log.old

# Restart services to create fresh logs
./scripts/rebuild-all.sh
```

### Real-time Monitoring

```bash
# Monitor both logs simultaneously (in separate terminals)
tail -f backend/server.log
tail -f frontend/vite.log

# Or use split terminal with tmux/screen
```

---

## Integration with Other Skills

- After using **rebuild-and-restart** skill → Always check logs to verify services started correctly
- After implementing game logic changes → Check backend log for validation errors
- Before using any other skill when something is broken → Use this skill first to diagnose

---

## Best Practices

1. **Check logs before asking for help** - The answer is often in the logs
2. **Read recent entries first** - Use `tail` instead of `cat` for large logs
3. **Search systematically** - Use grep with relevant keywords
4. **Correlate timestamps** - Match frontend and backend log entries by time
5. **Clear logs when confused** - Start fresh if logs are too cluttered
6. **Add logging during development** - Log important state transitions
7. **Keep logs during debugging** - Don't delete until issue is resolved

---

## Agent Implementation Notes

When implementing this skill:
1. Always read the relevant log file using `view` tool or `bash` (tail/grep)
2. If log is large (>1000 lines), use `bash` with `tail` to read the last 100-200 lines first
3. Use `grep` tool to find specific error patterns
4. Parse error messages carefully before proposing solutions
5. After implementing a fix, re-read logs to verify success
6. Explain to the user what you found in the logs and why it matters

---

## Example Agent Response Flow

```
User: "The server won't start"

Agent thinks:
1. This is a backend startup issue
2. I should check backend/server.log first
3. Then check if server is already running

Agent actions:
- bash: tail -n 100 backend/server.log
- Identify error: "Address already in use"
- bash: cat backend/build/server.pid
- bash: kill <pid>
- bash: ./scripts/rebuild-backend.sh
- bash: tail -n 50 backend/server.log (to confirm successful start)
- Report to user: "Server was already running. I killed the old process and restarted it."
```

---

## Summary

**Always check logs when debugging. They are the source of truth.**

This skill ensures systematic log examination becomes second nature, leading to faster diagnosis and more reliable fixes.
