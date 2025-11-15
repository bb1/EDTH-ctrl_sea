# EDTH-CTRL-SEA Maritime Client

This is the Next.js frontend client for the EDTH-CTRL-SEA maritime surveillance system.

## Project Structure

```
client/app/
├── page.tsx                 # Main entry point (Dashboard)
├── layout.tsx               # Root layout with metadata
├── globals.css              # Global styles (Tailwind + MapLibre)
├── components/
│   ├── Dashboard.tsx        # Main 3-column layout
│   ├── MaritimeMap.tsx      # MapLibre map with vessel/infrastructure overlays
│   ├── AlertsFeed.tsx       # Left sidebar - alerts list
│   ├── VesselDetails.tsx    # Right sidebar - vessel details
│   └── Header.tsx           # Top header bar
├── api/
│   ├── ships/route.ts       # Proxy to backend /api/ships
│   ├── infrastructure/route.ts  # Proxy to backend /api/infrastructure
│   └── alerts/route.ts      # Proxy to backend /api/alerts
├── lib/
│   ├── types.ts             # TypeScript interfaces
│   ├── utils.ts             # Utility functions
│   └── api.ts               # API client functions
└── hooks/
    └── useMaritimeData.ts   # Custom hook for data fetching
```

## Setup

### Environment Variables

Create a `.env.local` file in the project root (not in `client/`):

```env
BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### Running the Client

The client should be run from the project root (where `package.json` is):

```bash
bun dev
```

This will start the Next.js dev server at `http://localhost:3000`.

**Note:** If Next.js is configured to use the root `app/` directory instead of `client/app/`, you may need to:

1. Move the contents of `client/app/` to the root `app/` directory, OR
2. Configure Next.js to use `client/app` as the app directory (requires custom Next.js configuration)

## Features

- ✅ Interactive MapLibre map centered on Baltic Sea (55°N, 18°E)
- ✅ Real-time vessel tracking with risk-based coloring
- ✅ Infrastructure zones visualization
- ✅ Alerts feed with filtering
- ✅ Vessel details panel
- ✅ Auto-refresh every 5 seconds
- ✅ Export alerts to CSV
- ✅ Dark theme UI
- ✅ Responsive 3-column layout

## API Integration

The client uses Next.js API routes (`/api/ships`, `/api/infrastructure`, `/api/alerts`) which proxy requests to the backend server at `http://localhost:3001`.

## Backend Requirements

The backend must provide these endpoints:

- `GET http://localhost:3001/api/ships` - Returns array of ship objects
- `GET http://localhost:3001/api/infrastructure` - Returns array of infrastructure objects
- `GET http://localhost:3001/api/alerts` - Returns array of alert objects

See `lib/types.ts` for the expected data structures.

