set -euo pipefail

cd /home/ubuntu/app

echo "==> Applying database migrations..."
docker compose -f docker-compose.prod.yml run --rm api npm run db:migrate

echo "==> Building and restarting containers..."
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

echo "==> Cleaning up old/unused images..."
docker image prune -f

echo "Deploy complete."
docker compose -f docker-compose.prod.yml ps