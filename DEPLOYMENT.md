# Deployment Guide

This project is split into:

- `backend/` at repo root: Express, Prisma, Socket.IO, PostgreSQL, Redis
- `frontend/`: Next.js App Router application

## Production Targets

- Backend: Railway or Render
- Frontend: Vercel
- Data: Managed PostgreSQL and Redis

## Environment Strategy

Use separate environment files for local and production setup:

- Backend local example: [.env.development.example](/Users/karan/projects/liv-collab/.env.development.example)
- Backend production example: [.env.production.example](/Users/karan/projects/liv-collab/.env.production.example)
- Frontend local example: [frontend/.env.development.example](/Users/karan/projects/liv-collab/frontend/.env.development.example)
- Frontend production example: [frontend/.env.production.example](/Users/karan/projects/liv-collab/frontend/.env.production.example)

Never commit real secrets. Keep production values in your deployment platform's secret manager or environment-variable UI.

## Local Production-Like Run With Docker

1. Copy the local environment examples:

   ```bash
   cp .env.development.example .env
   cp frontend/.env.development.example frontend/.env.local
   ```

2. Start the full stack:

   ```bash
   docker compose up --build
   ```

3. Open:

   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:4000`
   - Postgres: `localhost:5432`
   - Redis: `localhost:6379`

### Development Compose Override

For a bind-mounted dev workflow:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Docker Assets

- Backend image: [Dockerfile](/Users/karan/projects/liv-collab/Dockerfile)
- Backend startup entrypoint: [docker/backend-entrypoint.sh](/Users/karan/projects/liv-collab/docker/backend-entrypoint.sh)
- Frontend image: [frontend/Dockerfile](/Users/karan/projects/liv-collab/frontend/Dockerfile)
- Stack orchestration: [docker-compose.yml](/Users/karan/projects/liv-collab/docker-compose.yml)
- Dev override: [docker-compose.dev.yml](/Users/karan/projects/liv-collab/docker-compose.dev.yml)

### Backend Container Notes

- Uses a multi-stage build
- Runs `prisma migrate deploy` before boot
- Exposes port `4000`
- Requires `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`

### Frontend Container Notes

- Uses a multi-stage Next.js standalone build
- Exposes port `3000`
- Requires `NEXT_PUBLIC_API_URL` at build time and runtime

## Railway Deployment

Railway works well for the backend because it can deploy directly from a Dockerfile and attach managed services.

Recommended setup:

1. Create a backend service from this repository root.
2. Let Railway build from [Dockerfile](/Users/karan/projects/liv-collab/Dockerfile).
3. Add a PostgreSQL service and a Redis service.
4. Set backend environment variables:

   - `PORT=4000`
   - `DATABASE_URL`
   - `REDIS_URL`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `ACCESS_TOKEN_TTL_MINUTES`
   - `REFRESH_TOKEN_TTL_DAYS`
   - `BCRYPT_SALT_ROUNDS`
   - `REALTIME_PERSIST_DEBOUNCE_MS`

5. Deploy and confirm `GET /health` returns success.

Operational note:

- Because the container entrypoint runs `prisma migrate deploy`, Railway will apply committed Prisma migrations on boot.

## Render Deployment

Render is also a strong fit for the backend because it supports Docker-based web services and managed data services.

Recommended setup:

1. Create a new Web Service from this repository root.
2. Choose Docker deployment and point it at [Dockerfile](/Users/karan/projects/liv-collab/Dockerfile).
3. Attach a managed PostgreSQL instance and Redis instance.
4. Configure the same backend environment variables listed above.
5. Make sure the public backend URL is available for the frontend as `NEXT_PUBLIC_API_URL`.

Operational note:

- Keep the service on an always-on plan if low-latency realtime collaboration matters.

## Vercel Deployment

Deploy the frontend from the `frontend/` directory on Vercel.

Recommended setup:

1. Import the repository into Vercel.
2. Set the project root directory to `frontend`.
3. Add:

   - `NEXT_PUBLIC_API_URL=https://<your-backend-domain>`

4. Deploy and verify:

   - `/login`
   - `/signup`
   - `/dashboard`
   - `/whiteboards/[id]`

Important:

- `NEXT_PUBLIC_API_URL` is embedded into the frontend bundle at build time, so it must point at the correct backend public URL before deployment.

## CI/CD

GitHub Actions workflow: [.github/workflows/ci.yml](/Users/karan/projects/liv-collab/.github/workflows/ci.yml)

Current pipeline checks:

- Backend: Prisma validate, lint, test, build, Docker image build
- Frontend: lint, build, Docker image build

Typical promotion flow:

1. Open a pull request.
2. Let CI validate both apps and both container builds.
3. Merge to `main`.
4. Let Railway/Render/Vercel deploy from the updated default branch.

## Security Checklist

- Store secrets only in platform environment settings or GitHub secrets
- Do not commit `.env`, `.env.local`, or production credentials
- Rotate `JWT_SECRET` and `JWT_REFRESH_SECRET` using strong random values
- Restrict database and Redis network access to the deployment platform when possible
- Serve the frontend over HTTPS and point it only at the HTTPS backend URL in production
- Review CORS and websocket origin settings before exposing the backend publicly

## Pre-Launch Checklist

- Run committed Prisma migrations against production
- Verify `GET /health`
- Verify login, signup, whiteboard CRUD, and realtime whiteboard sync
- Confirm Redis connectivity for Socket.IO adapter
- Confirm Vercel `NEXT_PUBLIC_API_URL` points at the public backend domain
- Confirm logs do not expose secrets or JWTs
