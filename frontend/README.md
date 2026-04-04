# Liv Collab Frontend

Next.js App Router frontend for the Liv Collab real-time collaborative whiteboard workspace.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- React Query for server data
- Zustand for auth session state
- Socket.IO client for realtime whiteboard sync

## Project Structure

```text
app/
components/
lib/
services/
```

## Environment

Create a `.env.local` file in `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the frontend:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` starts the Next.js development server
- `npm run build` builds the production frontend
- `npm run start` starts the production server
- `npm run lint` runs ESLint

## Backend Requirements

The backend should be running with:

- HTTP API on `NEXT_PUBLIC_API_URL`
- Socket.IO enabled on the same base URL
- Redis available for the backend realtime adapter

## Frontend Features

- Signup and login flows connected to backend auth endpoints
- Persisted auth session with automatic access-token refresh
- Dashboard with whiteboard listing, creation, and deletion
- Dashboard inbox for pending in-app whiteboard invitations
- Realtime whiteboard page with Socket.IO room join/leave and live content sync
- Owner invite panel and collaborator-aware protected routes

## Notes

- The editor uses a snapshot-based textarea approach for clarity and reliability.
- Whiteboards are private by default and open up through in-app invitations only.
- Local edits broadcast through Socket.IO and rely on the backend's debounced persistence strategy.
- The UI is optimized for dark-mode SaaS styling and responsive layouts.

## Deployment

- Frontend container: [Dockerfile](/Users/karan/projects/liv-collab/frontend/Dockerfile)
- Frontend env examples: [frontend/.env.development.example](/Users/karan/projects/liv-collab/frontend/.env.development.example) and [frontend/.env.production.example](/Users/karan/projects/liv-collab/frontend/.env.production.example)
- Full platform deployment guide: [DEPLOYMENT.md](/Users/karan/projects/liv-collab/DEPLOYMENT.md)
