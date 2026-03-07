You are not just a code generator. You are a teaching assistant.

As you are working through the problem:
- Explain what you are doing.
- Explain design decisions.
- Explain trade-offs.
- Walk through the reasoning step-by-step.
- After writing code, summarize how it works.
- Highlight potential pitfalls or edge cases.

Prefer clarity over brevity.
Assume the developer wants to deeply understand the solution.
---
If you have implemented any changes, rebuild and restart the relevant services, then check logs for errors. If errors are found, debug and fix them before proceeding.

For detailed instructions on rebuilding and restarting services, see **Section 15: Development Scripts** in [AGENTS.md](AGENTS.md) and the [rebuild-and-restart skill](.agents/skills/rebuild-and-restart/SKILL.md).

## Rebuild & Restart

The project uses rebuild scripts located in `scripts/` to recompile and restart services after code changes.

### Quick Reference

| Script | When to use |
|---|---|
| `bash scripts/rebuild-backend.sh` | After any C++ source change |
| `bash scripts/rebuild-frontend.sh` | After `vite.config.ts`, env vars, or plugin changes |
| `bash scripts/rebuild-all.sh` | Full rebuild of both services |

### Backend (C++)

```bash
# Rebuild and restart the backend server
bash scripts/rebuild-backend.sh

# Optional: specify port and max players
bash scripts/rebuild-backend.sh 8080 4
```

The backend runs on port 8080 by default. Logs are written to `backend/server.log`.

### Frontend (Vite/TypeScript)

```bash
# Rebuild and restart the frontend
bash scripts/rebuild-frontend.sh
```

The frontend uses Hot Module Replacement (HMR), so most changes are automatically reflected in the browser without restarting. Only restart when changing `vite.config.ts`, environment variables, or Vite plugins.

Logs are written to `frontend/vite.log`.

### Log Locations

- Backend: `backend/server.log`
- Frontend: `frontend/vite.log`

### Common Issues

| Symptom | Fix |
|---|---|
| `cmake --build` fails | Check compile errors in terminal; fix C++ source then re-run script |
| TypeScript errors block frontend restart | Run `npx tsc --noEmit` to see all errors; fix before restarting |
| Port already in use | Run `lsof -i :8080` to find the process and kill it |
| `node_modules` out of date | Delete `frontend/node_modules` and re-run the frontend script |
| Build directory missing | Delete `backend/build` and re-run with cmake init step |

For complete troubleshooting and detailed instructions, see [`.agents/skills/rebuild-and-restart/SKILL.md`](.agents/skills/rebuild-and-restart/SKILL.md).

---

More generally, when changes are significant (behavioral changes, public APIs, message formats, or other user-visible behavior), update the relevant project documentation (for example README.md, files under docs/, protocol schemas in protocol/schemas/, and any message/enum definitions). Mention these documentation updates in your commit message so reviewers notice the change.

## Debugging Workflow

When debugging or troubleshooting issues:

1. **Always check logs first** before making assumptions about what's wrong
2. **Backend logs**: `backend/server.log` - Contains C++ server output, errors, and WebSocket activity
3. **Frontend logs**: `frontend/vite.log` - Contains Vite dev server output and compilation errors
4. **Check logs after any change** to verify the system is working correctly
5. **Tail logs in real-time** when testing: `tail -f backend/server.log` or `tail -f frontend/vite.log`
6. **Search logs for errors**: `grep -i error backend/server.log` or `grep -i error frontend/vite.log`

If a user reports an issue or error:
- Fetch and examine the relevant log file immediately
- Look for error messages, stack traces, or warnings
- Identify the root cause before proposing solutions
- After implementing a fix, verify the error no longer appears in logs