# Liv Collab Backend

Production-grade backend starter for a real-time collaborative editor built with Node.js, Express, TypeScript, PostgreSQL, Prisma, and Redis-ready infrastructure.

## Stack

- Node.js
- Express.js
- TypeScript with strict compiler settings
- PostgreSQL via Prisma ORM
- Redis client scaffolded for future collaboration features
- Socket.IO realtime collaboration engine with Redis adapter scaling
- JWT authentication with refresh-token rotation
- bcrypt password hashing
- Zod for request validation
- ESLint + Prettier for code quality

## Project Structure

```text
src/
  config/
  middleware/
  modules/
    auth/
    whiteboard/
    realtime/
    user/
  types/
  utils/
  app.ts
  server.ts
prisma/
  schema.prisma
```

## Prerequisites

- Node.js 22+
- PostgreSQL running locally or remotely
- Redis available when you are ready to enable it

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file if needed:

   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your database, Redis, and JWT values.

4. Generate the Prisma client:

   ```bash
   npm run prisma:generate
   ```

5. Validate the Prisma configuration:

   ```bash
   npm run prisma:validate
   ```

6. Create the initial database migration:

   ```bash
   npm run prisma:migrate:dev -- --name init
   ```

7. Start the development server:

   ```bash
   npm run dev
   ```

## Environment Variables

```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/liv_collab?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
JWT_REFRESH_SECRET=replace-with-a-different-long-random-secret-at-least-32-characters
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=7
BCRYPT_SALT_ROUNDS=12
REALTIME_PERSIST_DEBOUNCE_MS=1500
```

## Scripts

- `npm run dev` starts the API in watch mode with `ts-node-dev`
- `npm run build` generates Prisma Client and compiles TypeScript to `dist/`
- `npm run start` runs the compiled server from `dist/server.js`
- `npm run test` runs the auth unit test scaffold with Vitest
- `npm run test:watch` runs Vitest in watch mode
- `npm run lint` runs ESLint on the TypeScript source tree
- `npm run format` formats the codebase with Prettier
- `npm run prisma:generate` regenerates Prisma Client
- `npm run prisma:validate` validates the Prisma schema
- `npm run prisma:migrate:dev -- --name init` creates and applies a local migration

## Response Format

Every endpoint follows the same API envelope:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

On failure:

```json
{
  "success": false,
  "data": null,
  "error": "Error message"
}
```

## API Overview

### Health

- `GET /health`

### Auth

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`

Example signup payload:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "StrongPassword123!"
}
```

Example login payload:

```json
{
  "email": "jane@example.com",
  "password": "StrongPassword123!"
}
```

Example refresh payload:

```json
{
  "refreshToken": "<jwt refresh token>"
}
```

Protected routes use a Bearer access token:

```http
Authorization: Bearer <access token>
```

### Realtime

Socket.IO runs on the same backend server and authenticates connections with the same JWT access token used for HTTP routes.

Handshake auth options:

- `auth.token = "<access token>"`
- `Authorization: Bearer <access token>`

Supported socket events:

- `join_whiteboard`
- `leave_whiteboard`
- `send_changes`
- `receive_changes`

`send_changes` broadcasts operational updates to other users in the same whiteboard room. If the payload includes the latest `title` and/or `content` snapshot, the backend stores that snapshot in memory and persists it to PostgreSQL with debounce instead of writing on every keystroke.

### Users

- `GET /api/v1/users`
- `GET /api/v1/users/:userId`

### Whiteboards

- `POST /api/v1/whiteboards`
- `GET /api/v1/whiteboards`
- `GET /api/v1/whiteboards/:whiteboardId`
- `PATCH /api/v1/whiteboards/:whiteboardId`
- `DELETE /api/v1/whiteboards/:whiteboardId`
- `POST /whiteboards`
- `GET /whiteboards/:id`
- `PATCH /whiteboards/:id`
- `DELETE /whiteboards/:id`

Compatibility aliases remain available at `/documents` and `/api/v1/documents` during the transition.

Example create whiteboard payload:

```json
{
  "title": "Sprint Notes",
  "content": "Initial collaborative draft",
  "isShared": false
}
```

Example update whiteboard payload:

```json
{
  "title": "Sprint Notes v2",
  "content": "Updated content",
  "isShared": true
}
```

## Notes

- Refresh tokens are stored as SHA-256 hashes in PostgreSQL and rotated on every `/auth/refresh` call.
- Passwords are hashed with bcrypt before persistence.
- `GET /auth/me` and user routes are protected with JWT auth middleware.
- Whiteboard routes are JWT-protected; only owners can update or delete, and non-owners can read whiteboards only when `isShared` is `true`.
- Realtime scaling uses the Socket.IO Redis adapter, so a reachable Redis instance is required when booting the websocket server.
- Prisma CLI configuration lives in `prisma.config.ts`, which matches Prisma 7's current setup requirements.
- The whiteboard model includes a `version` field to support future optimistic concurrency or CRDT/event-stream integrations.
- The server performs graceful shutdown for Prisma, Redis, and the realtime engine.

## Deployment

Production deployment assets are included:

- Backend container: [Dockerfile](/Users/karan/projects/liv-collab/Dockerfile)
- Frontend container: [frontend/Dockerfile](/Users/karan/projects/liv-collab/frontend/Dockerfile)
- Stack orchestration: [docker-compose.yml](/Users/karan/projects/liv-collab/docker-compose.yml)
- Full guide: [DEPLOYMENT.md](/Users/karan/projects/liv-collab/DEPLOYMENT.md)
