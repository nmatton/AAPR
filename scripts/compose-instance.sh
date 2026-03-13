#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <action> [env-file]"
  echo "  action:   up | down | clean | ps | logs | config | health"
  echo "  env-file: path to instance env file (default: deploy/compose/stu.env)"
  exit 1
}

ACTION="${1:-}"
ENV_FILE="${2:-deploy/compose/stu.env}"

if [ -z "$ACTION" ]; then
  usage
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: Env file not found: $ENV_FILE" >&2
  exit 1
fi

COMPOSE_ARGS="--env-file $ENV_FILE -f docker-compose.yml"

case "$ACTION" in
  up)     docker compose $COMPOSE_ARGS up -d ;;
  down)   docker compose $COMPOSE_ARGS down --remove-orphans ;;
  clean)  docker compose $COMPOSE_ARGS down --remove-orphans --volumes ;;
  ps)     docker compose $COMPOSE_ARGS ps ;;
  logs)   docker compose $COMPOSE_ARGS logs --tail=200 ;;
  config) docker compose $COMPOSE_ARGS config ;;
  health)
    FRONTEND_PORT=$(grep '^FRONTEND_HOST_PORT=' "$ENV_FILE" | cut -d= -f2)
    BACKEND_PORT=$(grep '^BACKEND_HOST_PORT=' "$ENV_FILE" | cut -d= -f2)
    if [ -z "$FRONTEND_PORT" ] || [ -z "$BACKEND_PORT" ]; then
      echo "Error: FRONTEND_HOST_PORT and BACKEND_HOST_PORT must be defined in env file" >&2
      exit 1
    fi
    echo "Checking backend health on http://localhost:$BACKEND_PORT/api/v1/health"
    curl -sf "http://localhost:$BACKEND_PORT/api/v1/health" > /dev/null && echo "Backend: OK" || echo "Backend: FAIL"
    echo "Checking frontend health on http://localhost:$FRONTEND_PORT/"
    curl -sf "http://localhost:$FRONTEND_PORT/" > /dev/null && echo "Frontend: OK" || echo "Frontend: FAIL"
    docker compose $COMPOSE_ARGS ps
    ;;
  *)
    echo "Error: Unknown action '$ACTION'" >&2
    usage
    ;;
esac
