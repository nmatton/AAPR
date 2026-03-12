#!/bin/sh
set -eu

API_URL="${VITE_API_URL:-http://localhost:3000}"
ESCAPED_API_URL=$(printf '%s' "$API_URL" | sed 's/\\/\\\\/g; s/"/\\"/g')

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__APP_CONFIG__ = Object.assign({}, window.__APP_CONFIG__, {
  VITE_API_URL: "${ESCAPED_API_URL}",
})
EOF