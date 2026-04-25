#!/bin/bash

# Simple test to debug match code display

echo "=== Starting Debug Test ==="
echo ""
echo "Make sure:"
echo "  1. Backend is running: tail -f backend/server.log"
echo "  2. Frontend is running: cd stitch-frontend && npx vite"
echo ""
echo "This test will:"
echo "  1. Open Player 1 and initiate operation"
echo "  2. Note the displayed code"
echo "  3. Check backend logs for the generated code"
echo "  4. Compare them"
echo ""

# Check if ports are open
echo "Checking services..."
if ! nc -z localhost 8080 2>/dev/null; then
  echo "❌ Backend not running on port 8080"
  exit 1
fi

if ! nc -z localhost 5174 2>/dev/null && ! nc -z localhost 5173 2>/dev/null; then
  echo "❌ Frontend not running on ports 5173-5174"
  exit 1
fi

echo "✓ Services running"
echo ""

# Get latest log lines
echo "Last 20 backend log lines:"
tail -20 backend/server.log | grep -E "created match|code:"

echo ""
echo "Now manually:"
echo "  1. Go to http://localhost:5174"
echo "  2. Enter codename"
echo "  3. Click INITIATE OPERATION"
echo "  4. NOTE the displayed frequency code"
echo "  5. Come back here and look at the backend logs"
echo ""
echo "Run this command to watch for new matches:"
echo "  tail -f backend/server.log | grep 'created match'"
echo ""
