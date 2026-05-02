# Disney Character Dashboard

A full-stack dashboard application for exploring Disney characters, built with FastAPI and React.

## Tech Stack

- **Frontend:** React (Vite)
- **Backend:** FastAPI (Python) — secure proxy layer between frontend and external API
- **External API:** [Disney API](https://api.disneyapi.dev) — free, no authentication required

## Implementation

### Async UI States
The application handles all async states explicitly:
- **Loading** — skeleton cards rendered while API call is in progress
- **Error** — user-friendly error message on API failure, raw errors never exposed to UI
- **Success** — character grid rendered on successful data fetch
- **Empty** — appropriate message when search returns no results

### Error Boundary
A class-based `ErrorBoundary` component wraps the entire application using `componentDidCatch` and `getDerivedStateFromError` to catch unexpected runtime errors and render a fallback UI instead of crashing.

### Pagination & Search
- Page-based pagination with previous/next controls and page number display
- Character search by name with input sanitization before sending to backend
- State resets correctly on every new search or page change

### Component Architecture
All components follow single responsibility principle:
- `useCharacters` — custom hook managing all fetch logic and UI state
- `SearchBar` — controlled input with validation and animations
- `CharacterCard` — displays character image, name and associated films
- `SkeletonCard` — loading placeholder with shimmer effect
- `Pagination` — page navigation with bounce animation
- `ErrorMessage` — error display component
- `Modal` — full character detail overlay
- `ErrorBoundary` — runtime error catch with fallback UI

## Security

- CORS restricted to frontend origin only
- Rate limiting — 30 requests/minute per IP via `slowapi`
- Input validation using Pydantic — `page` must be positive integer, `name` max 50 characters
- HTTP security headers added via middleware
- Clean JSON error responses — internal errors never leaked to frontend
- All configuration in `.env`, nothing hardcoded

## Getting Started

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env`: VITE_API_URL=http://localhost:8000

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/characters` | Paginated characters — accepts `page` and `pageSize` |
| GET | `/characters/search?name=` | Search characters by name |
| GET | `/characters/{id}` | Single character detail |

