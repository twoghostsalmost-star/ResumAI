#!/usr/bin/env bash
#
# Configure + deploy the ResumAI web and API projects on Vercel via the REST API.
#
# Why a script: the Claude coding environment blocks egress to api.vercel.com,
# so the agent can't call Vercel directly. Run this anywhere network is open
# (your laptop, CI, or a Claude session with api.vercel.com allowlisted).
#
# Usage:
#   export VERCEL_TOKEN=...                # https://vercel.com/account/tokens
#   export VERCEL_TEAM=evolution3nk       # team slug or id (optional)
#   cp .env.vercel.example .env.vercel.local && edit it   # DB + Descope values
#   ./scripts/vercel-setup.sh
#
# It sets the Root Directory + framework, upserts env vars, and triggers a
# production deploy for each project. Re-runnable (idempotent: env vars upsert).

set -uo pipefail
API="https://api.vercel.com"

: "${VERCEL_TOKEN:?set VERCEL_TOKEN (https://vercel.com/account/tokens)}"
# Defaults to the resumAI team; override with VERCEL_TEAM (slug or team_… id).
TEAM="${VERCEL_TEAM:-resum-ai-64a9b374}"

# Load secret values from a gitignored file if present (.env*.local is ignored).
if [ -f .env.vercel.local ]; then set -a; . ./.env.vercel.local; set +a; fi

WEB_PROJECT="${WEB_PROJECT:-resume-ai-web}"
API_PROJECT="${API_PROJECT:-resumeforge-api}"
JWT_SIGNING_SECRET="${JWT_SIGNING_SECRET:-$(openssl rand -hex 32)}"

AUTH=(-H "Authorization: Bearer ${VERCEL_TOKEN}" -H "Content-Type: application/json")
teamq() { [ -n "$TEAM" ] && printf 'teamId=%s' "$TEAM"; }
jstr() { python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$1"; }   # JSON-quote a string

pid() { # project name/slug -> id
  curl -s "${AUTH[@]}" "$API/v9/projects/$1?$(teamq)" \
    | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))" 2>/dev/null
}

set_root() { # id rootDir frameworkJSON
  curl -s -X PATCH "${AUTH[@]}" "$API/v9/projects/$1?$(teamq)" \
    -d "{\"rootDirectory\":$(jstr "$2"),\"framework\":$3}" >/dev/null \
    && echo "    rootDirectory=$2"
}

put_env() { # id KEY VALUE [plain|encrypted]
  local id="$1" key="$2" val="${3:-}" type="${4:-encrypted}"
  if [ -z "$val" ]; then echo "    skip $key (no value)"; return; fi
  curl -s -X POST "${AUTH[@]}" "$API/v10/projects/$id/env?upsert=true&$(teamq)" \
    -d "{\"key\":\"$key\",\"value\":$(jstr "$val"),\"type\":\"$type\",\"target\":[\"production\",\"preview\",\"development\"]}" \
    >/dev/null && echo "    set $key"
}

deploy() { # id name
  local id="$1" name="$2"
  local repoId
  repoId=$(curl -s "${AUTH[@]}" "$API/v9/projects/$id?$(teamq)" \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print((d.get('link') or {}).get('repoId') or '')" 2>/dev/null)
  if [ -z "$repoId" ]; then
    echo "    no git link found — push to main or click Redeploy to deploy"
    return
  fi
  curl -s -X POST "${AUTH[@]}" "$API/v13/deployments?$(teamq)" \
    -d "{\"name\":\"$name\",\"project\":\"$id\",\"target\":\"production\",\"gitSource\":{\"type\":\"github\",\"repoId\":$repoId,\"ref\":\"main\"}}" \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print('    deploy ->', d.get('url') or (d.get('error') or {}).get('message','unknown'))" 2>/dev/null
}

echo "Resolving projects (team='${TEAM:-personal}')…"
WID=$(pid "$WEB_PROJECT"); AID=$(pid "$API_PROJECT")
[ -z "$WID" ] && { echo "ERROR: project '$WEB_PROJECT' not found (check name/VERCEL_TEAM)"; exit 1; }
[ -z "$AID" ] && { echo "ERROR: project '$API_PROJECT' not found (check name/VERCEL_TEAM)"; exit 1; }
echo "  web=$WID  api=$AID"

echo "Configuring API ($API_PROJECT)…"
set_root "$AID" "apps/api" "null"
put_env "$AID" DATABASE_URL        "${DATABASE_URL:-}"
put_env "$AID" JWT_SIGNING_SECRET  "$JWT_SIGNING_SECRET"
put_env "$AID" DESCOPE_PROJECT_ID  "${DESCOPE_PROJECT_ID:-}"
[ -n "${DESCOPE_MANAGEMENT_KEY:-}" ] && put_env "$AID" DESCOPE_MANAGEMENT_KEY "$DESCOPE_MANAGEMENT_KEY"
[ -n "${PUBLIC_BASE_URL:-}" ] && put_env "$AID" PUBLIC_BASE_URL "$PUBLIC_BASE_URL" plain
deploy "$AID" "$API_PROJECT"

echo "Configuring web ($WEB_PROJECT)…"
set_root "$WID" "apps/web" "\"nextjs\""
put_env "$WID" NEXT_PUBLIC_API_BASE_URL       "${NEXT_PUBLIC_API_BASE_URL:-}" plain
put_env "$WID" NEXT_PUBLIC_DESCOPE_PROJECT_ID "${DESCOPE_PROJECT_ID:-}"        plain
deploy "$WID" "$WEB_PROJECT"

echo
echo "Done. Notes:"
echo " - If PUBLIC_BASE_URL / NEXT_PUBLIC_API_BASE_URL were blank, set them to the"
echo "   API's deployed URL (PUBLIC_BASE_URL on api, NEXT_PUBLIC_API_BASE_URL on web)"
echo "   and re-run — both need the API URL to function."
echo " - Verify: curl https://<api-url>/health  -> {\"ok\":true,...}"
