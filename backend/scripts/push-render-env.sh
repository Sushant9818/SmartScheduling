#!/usr/bin/env bash
# Push env vars from backend/render.env to Render (requires RENDER_API_KEY).
# Usage:
#   cp backend/render.env.example backend/render.env
#   # edit backend/render.env
#   export RENDER_API_KEY="rnd_..."
#   ./backend/scripts/push-render-env.sh

set -euo pipefail

ENV_FILE="${1:-backend/render.env}"
API_KEY="${RENDER_API_KEY:-}"
SERVICE_ID="${RENDER_SERVICE_ID:-}"
SERVICE_NAME="${RENDER_SERVICE_NAME:-smart-scheduling-api}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from render.env.example and fill in." >&2
  exit 1
fi

if [[ -z "$API_KEY" ]]; then
  echo "Set RENDER_API_KEY from https://dashboard.render.com/u/settings#api-keys" >&2
  exit 1
fi

if [[ -z "$SERVICE_ID" ]]; then
  SERVICE_ID=$(curl -s "https://api.render.com/v1/services?limit=50" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Accept: application/json" \
    | SERVICE_NAME="$SERVICE_NAME" python3 -c "
import sys, json, os
for item in json.load(sys.stdin):
    s = item.get('service', item)
    if s.get('name') == os.environ['SERVICE_NAME']:
        print(s['id']); break
")
fi

if [[ -z "$SERVICE_ID" ]]; then
  echo "Service not found. Set RENDER_SERVICE_ID=srv_..." >&2
  exit 1
fi

PAYLOAD=$(python3 << PY
import json
pairs = []
with open("$ENV_FILE") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if "localhost" in v and k == "MONGO_URI":
            raise SystemExit("MONGO_URI must be mongodb+srv (Atlas), not localhost")
        if "YOUR_" in v or "change_to" in v:
            raise SystemExit(f"Replace placeholder value for {k} in $ENV_FILE")
        pairs.append({"envVarKey": k, "envVarValue": v})
print(json.dumps(pairs))
PY
)

echo "Updating env vars on $SERVICE_ID ..."
curl -s -X PUT "https://api.render.com/v1/services/${SERVICE_ID}/env-vars" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"

echo ""
echo "Triggering deploy ..."
curl -s -X POST "https://api.render.com/v1/services/${SERVICE_ID}/deploys" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"clearCache":"clear"}'

echo ""
echo "Done. Watch logs for: MongoDB Connected"
