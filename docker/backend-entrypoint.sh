#!/bin/sh
set -eu

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting backend server..."
exec node dist/server.js
