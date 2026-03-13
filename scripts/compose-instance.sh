#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <action> [env-file]"
  echo "  action:   up | down | clean | ps | logs | config | health | inspect | validate-isolation"
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
  inspect)
    PROJECT_NAME=$(grep '^COMPOSE_PROJECT_NAME=' "$ENV_FILE" | cut -d= -f2)
    INSTANCE_KEY=$(grep '^INSTANCE_KEY=' "$ENV_FILE" | cut -d= -f2)
    DB_NAME=$(grep '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2)

    if [ -z "$PROJECT_NAME" ]; then
      echo "Error: COMPOSE_PROJECT_NAME must be defined in env file" >&2
      exit 1
    fi

    echo "=== Instance Resource Inspection: $INSTANCE_KEY ($PROJECT_NAME) ==="
    echo ""

    echo "--- Containers ---"
    docker ps --filter "label=com.aapr.instance=$INSTANCE_KEY" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""

    echo "--- Network ---"
    NETWORK_NAME="${PROJECT_NAME}-net"
    if docker network ls --filter "name=^${NETWORK_NAME}$" --format "{{.Name}}" 2>/dev/null | grep -q .; then
      echo "Network: $NETWORK_NAME (exists)"
      docker network inspect "$NETWORK_NAME" --format '{{range .Containers}}  - {{.Name}}{{println}}{{end}}' 2>/dev/null
    else
      echo "Network: $NETWORK_NAME (not found)"
    fi
    echo ""

    echo "--- Volume ---"
    VOLUME_NAME="${PROJECT_NAME}-postgres-data"
    if docker volume ls --filter "name=^${VOLUME_NAME}$" --format "{{.Name}}" 2>/dev/null | grep -q .; then
      echo "Volume: $VOLUME_NAME (exists)"
    else
      echo "Volume: $VOLUME_NAME (not found)"
    fi
    echo ""

    echo "--- Database ---"
    echo "Database name: $DB_NAME"
    echo "Container: ${PROJECT_NAME}-db"
    ;;
  validate-isolation)
    echo "=== Isolation Validation Across All Instance Profiles ==="
    echo ""

    ENV_DIR="deploy/compose"
    ERRORS=0

    # Collect values from all env files
    declare -A PROJECT_NAMES DB_NAMES PORT_OWNERS

    for envfile in "$ENV_DIR"/*.env; do
      [ -f "$envfile" ] || continue
      fname=$(basename "$envfile")

      instance=$(grep '^INSTANCE_KEY=' "$envfile" | cut -d= -f2)
      project=$(grep '^COMPOSE_PROJECT_NAME=' "$envfile" | cut -d= -f2)
      db=$(grep '^POSTGRES_DB=' "$envfile" | cut -d= -f2)
      fp=$(grep '^FRONTEND_HOST_PORT=' "$envfile" | cut -d= -f2)
      bp=$(grep '^BACKEND_HOST_PORT=' "$envfile" | cut -d= -f2)
      pp=$(grep '^POSTGRES_HOST_PORT=' "$envfile" | cut -d= -f2)
      jwt=$(grep '^JWT_SECRET=' "$envfile" | cut -d= -f2)

      echo "Profile: $fname (instance=$instance)"

      # Check required fields
      for field in INSTANCE_KEY COMPOSE_PROJECT_NAME FRONTEND_IMAGE BACKEND_IMAGE POSTGRES_IMAGE POSTGRES_DB POSTGRES_USER FRONTEND_HOST_PORT BACKEND_HOST_PORT POSTGRES_HOST_PORT POSTGRES_PASSWORD JWT_SECRET FRONTEND_RUNTIME_API_URL; do
        val=$(grep "^${field}=" "$envfile" | cut -d= -f2)
        if [ -z "$val" ]; then
          echo "  MISSING: $field in $fname"
          ERRORS=$((ERRORS + 1))
        fi
      done

      # Validate numeric port bounds for every profile
      for portdef in "FRONTEND_HOST_PORT:$fp" "BACKEND_HOST_PORT:$bp" "POSTGRES_HOST_PORT:$pp"; do
        port_name="${portdef%%:*}"
        port_value="${portdef##*:}"

        if [ -z "$port_value" ] || ! [[ "$port_value" =~ ^[0-9]+$ ]] || [ "$port_value" -lt 1 ] || [ "$port_value" -gt 65535 ]; then
          echo "  INVALID: ${port_name} must be an integer between 1 and 65535 in $fname, got '${port_value}'"
          ERRORS=$((ERRORS + 1))
        fi
      done

      # Validate runtime URL aligns with backend host port for localhost contracts
      runtime_api=$(grep '^FRONTEND_RUNTIME_API_URL=' "$envfile" | cut -d= -f2 | tr -d '\r')
      if [ -n "$runtime_api" ]; then
        if [[ "$runtime_api" =~ ^https?://(localhost|127\.0\.0\.1)(:([0-9]+))?(/.*)?$ ]]; then
          runtime_host="${BASH_REMATCH[1]}"
          runtime_port="${BASH_REMATCH[3]}"
          # If port is missing from URL, assume 80 for http or 443 for https (though for these local tests we just check against explicitly missing or implicit port)
          if [ -z "$runtime_port" ]; then
             if [[ "$runtime_api" =~ ^https:// ]]; then
                runtime_port="443"
             else
                runtime_port="80"
             fi
          fi
          
          if [ "$runtime_port" != "$bp" ]; then
            echo "  CONTRACT: FRONTEND_RUNTIME_API_URL port '${runtime_port}' must match BACKEND_HOST_PORT '${bp}' in $fname"
            ERRORS=$((ERRORS + 1))
          fi
        elif ! [[ "$runtime_api" =~ ^https?://[^[:space:]]+$ ]]; then
          echo "  INVALID: FRONTEND_RUNTIME_API_URL must be a valid URL in $fname, got '$runtime_api'"
          ERRORS=$((ERRORS + 1))
        fi
      fi

      # Check uniqueness
      if [ -n "$project" ] && [ -n "${PROJECT_NAMES[$project]+x}" ]; then
        echo "  COLLISION: COMPOSE_PROJECT_NAME='$project' shared by $fname and ${PROJECT_NAMES[$project]}"
        ERRORS=$((ERRORS + 1))
      elif [ -n "$project" ]; then
        PROJECT_NAMES[$project]=$fname
      fi

      if [ -n "$db" ] && [ -n "${DB_NAMES[$db]+x}" ]; then
        echo "  COLLISION: POSTGRES_DB='$db' shared by $fname and ${DB_NAMES[$db]}"
        ERRORS=$((ERRORS + 1))
      elif [ -n "$db" ]; then
        DB_NAMES[$db]=$fname
      fi

      for portdef in "FRONTEND_HOST_PORT:$fp" "BACKEND_HOST_PORT:$bp" "POSTGRES_HOST_PORT:$pp"; do
        port_name="${portdef%%:*}"
        port_value="${portdef##*:}"
        owner="${fname}:${port_name}"

        if [ -z "$port_value" ]; then
          continue
        fi

        if [ -n "${PORT_OWNERS[$port_value]+x}" ]; then
          echo "  COLLISION: host port '${port_value}' used by ${owner} and ${PORT_OWNERS[$port_value]}"
          ERRORS=$((ERRORS + 1))
        else
          PORT_OWNERS[$port_value]=$owner
        fi
      done
    done

    echo ""
    if [ "$ERRORS" -gt 0 ]; then
      echo "ISOLATION VALIDATION FAILED: $ERRORS error(s)"
      exit 1
    else
      echo "ISOLATION VALIDATION PASSED"
      echo "  Project names: ${!PROJECT_NAMES[*]}"
      echo "  Database names: ${!DB_NAMES[*]}"
      echo "  No port collisions detected"
    fi
    ;;
  *)
    echo "Error: Unknown action '$ACTION'" >&2
    usage
    ;;
esac
