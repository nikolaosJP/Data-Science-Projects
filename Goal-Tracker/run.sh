#!/bin/bash

if [ ! -f "public/index.html" ]; then
    exit 1
fi

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    sleep 1
fi

if command -v python3 > /dev/null; then
    echo "Starting app at http://localhost:8000/"
    echo "Press Ctrl+C to stop the server"
    python3 server.py
    exit 0
fi

if command -v python > /dev/null; then
    echo "Starting app at http://localhost:8000/"
    echo "Press Ctrl+C to stop the server"
    python server.py
    exit 0
fi

exit 1

