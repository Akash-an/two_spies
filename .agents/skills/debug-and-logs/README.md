# Debug and Logs Skill

Systematic debugging workflow for the Two Spies project focusing on log examination and error diagnosis.

## Quick Reference

**Log Locations:**
- Backend: `backend/server.log`
- Frontend: `frontend/vite.log`

**Common Commands:**
```bash
# View logs
cat backend/server.log
tail -f backend/server.log

# Search for errors
grep -i error backend/server.log
```

**Workflow:**
1. Check logs first
2. Identify error patterns
3. Implement fix
4. Verify in logs
5. Test functionality

See [SKILL.md](SKILL.md) for comprehensive debugging scenarios and workflows.
