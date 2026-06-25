#!/bin/bash
set -euo pipefail

cd /home/ubuntu/app

echo "==> Building fresh images..."
docker compose -f docker-compose.prod.yaml build api

echo "==> Applying database migrations..."
docker compose -f docker-compose.prod.yaml run --rm api npm run db:migrate

echo "==> Building and restarting containers..."
docker compose -f docker-compose.prod.yaml up -d --build --remove-orphans

echo "==> Cleaning up old/unused images..."
docker image prune -f

echo "Deploy complete."
docker compose -f docker-compose.prod.yaml ps