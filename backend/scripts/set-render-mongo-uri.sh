#!/usr/bin/env bash
# Set MONGO_URI on a Render web service and trigger a deploy without replacing
# any other environment variables.
# Usage:
#   export RENDER_API_KEY="rnd_..."
#   ./backend/scripts/set-render-mongo-uri.sh 'mongodb+srv://user:pass@cluster.../smart-scheduling?retryWrites=true&w=majority'

set -euo pipefail

URI="${1:-}"
SERVICE_ID="${RENDER_SERVICE_ID:-}"
SERVICE_NAME="${RENDER_SERVICE_NAME:-smart-scheduling-api}"
API_KEY="${RENDER_API_KEY:-}"

if [[ -z "$URI" ]]; then
  echo "Usage: $0 'mongodb+srv://...'" >&2
  exit 1
fi

if [[ -z "$API_KEY" ]]; then
  echo "Set RENDER_API_KEY (from https://dashboard.render.com/u/settings#api-keys)" >&2
  exit 1
fi

if [[ "$URI" == *localhost* ]] || [[ "$URI" == *127.0.0.1* ]]; then
  echo "Refusing localhost URI. Use MongoDB Atlas — see backend/ATLAS_QUICKSTART.md" >&2
  exit 1
fi

if [[ -z "$SERVICE_ID" ]]; then
  echo "Looking up service: $SERVICE_NAME ..."
  SERVICE_ID=$(curl -s "https://api.render.com/v1/services?limit=50" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Accept: application/json" \
    | SERVICE_NAME="$SERVICE_NAME" python3 -c "
import sys, json, os
name = os.environ['SERVICE_NAME']
for item in json.load(sys.stdin):
    s = item.get('service', item)
    if s.get('name') == name:
        print(s['id'])
        break
")
fi

if [[ -z "$SERVICE_ID" ]]; then
  echo "Service not found. Set RENDER_SERVICE_ID=srv_... from Render dashboard." >&2
  exit 1
fi

PAYLOAD=$(MONGO_URI="$URI" python3 -c 'import json,os; print(json.dumps({"value":os.environ["MONGO_URI"]}))')

echo "Updating MONGO_URI on $SERVICE_ID ..."
curl -fsS -X PUT "https://api.render.com/v1/services/${SERVICE_ID}/env-vars/MONGO_URI" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"

echo ""
echo "Triggering deploy ..."
curl -fsS -X POST "https://api.render.com/v1/services/${SERVICE_ID}/deploys" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"clearCache":"clear"}'

echo ""
echo "Done. Check Render logs for: MongoDB Connected"
