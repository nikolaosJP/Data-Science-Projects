# Goal Tracker

A lightweight personal productivity app for managing daily, weekly, monthly, and annual goals.

## Features

- Track goals across multiple time horizons (daily, weekly, monthly, annual)
- Simple, intuitive interface
- Persistent data storage
- No build step required

## Tech Stack

- **Frontend**: React 18 + TailwindCSS (CDN-loaded, single-file SPA)
- **Backend**: Python HTTP server
- **Storage**: JSON file persistence

## Quick Start

```bash
./run.sh
```

Opens at http://localhost:8000/

## API

- `GET /api` - Retrieve goal data
- `POST /api` - Save goal data
