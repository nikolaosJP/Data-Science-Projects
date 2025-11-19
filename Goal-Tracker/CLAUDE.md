# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Goal Tracker is a personal productivity application for managing and tracking daily, weekly, monthly, and annual goals. It's a single-page React application with a Python backend server that persists data to JSON files.

## Running the Application

```bash
./run.sh
```

The application will start at http://localhost:8000/

The run script:
- Checks for required files (public/index.html)
- Kills any existing process on port 8000
- Starts the Python server using python3 or python

## Architecture

### Server Architecture (server.py)

The application uses Python's built-in HTTP server with a custom handler (`CustomHandler` extending `SimpleHTTPRequestHandler`). Key architectural decisions:

- **Static file serving**: All paths except `/api.php` and `/api` are mapped to the `public/` directory
- **API endpoint**: Both `/api.php` and `/api` paths serve the same JSON API (for compatibility)
- **Data persistence**: Goal data is stored in `data/goal-tracker-data.json`
- **CORS enabled**: Full CORS headers allow cross-origin requests
- **Server logging disabled**: `log_message` is overridden to suppress console output

### Frontend Architecture (public/index.html)

Self-contained single-file React application:

- **Framework**: React 18 loaded via CDN (unpkg)
- **Styling**: TailwindCSS via CDN
- **Transpilation**: Babel standalone for JSX in-browser compilation
- **Icons**: Custom inline SVG components (Lucide-style icons)
- **Charts**: References Recharts components (conditionally loaded)
- **State management**: React hooks (useState, useEffect)
- **Data flow**: Direct API calls to `/api` endpoint for GET/POST operations

### Data Storage

- Location: `data/goal-tracker-data.json`
- Format: JSON with 2-space indentation
- Created automatically when first POST occurs
- Returns `null` on GET if file doesn't exist

### API Contract

**GET /api or /api.php**
- Returns: JSON data from goal-tracker-data.json or `null`

**POST /api or /api.php**
- Accepts: JSON payload with goal data
- Returns: `{"success": true}` on success or `{"error": "message"}` on failure
- Status codes: 200 (success), 400 (error)

## Development Notes

### Modifying the Frontend

All frontend code is embedded in `public/index.html` as a single file. React components are written as JSX within a `<script type="text/babel">` tag. The application uses:
- Functional components with hooks
- No build step or bundler
- CDN-loaded dependencies

### Modifying the Backend

The server logic is split between:
- `server.py`: Main server with static file serving + API endpoints
- `public/api.py`: Standalone API handler (appears to be unused/legacy)

When modifying API behavior, edit `server.py` which is the active server implementation.

### Port Management

The server runs on port 8000. The run.sh script automatically kills any existing process on this port before starting.
