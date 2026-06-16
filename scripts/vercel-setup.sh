#!/usr/bin/env bash
#
# Configure + deploy the ResumAI web and API projects on Vercel via the REST API.
#
# Why a script: the Claude coding environment blocks egress to api.vercel.com,
# so the agent can't call Vercel directly. Run this anywhere network is open
# (your laptop, CI, or a Claude session with api.vercel.com allowlisted).
#
# It auto-locates the two projects across EVERY team your token can access, so
# you don't have to know which team they live in.
#
# Usage:
#   export VERCEL_TOKEN=...                 # https://vercel.com/account/tokens
#   cp .env.vercel.example .env.vercel.local && edit it   # DB + Descope values
#   ./scripts/vercel-setup.sh
#
# Re-runnable (env vars upsert).

set -uo pipefail
API="https://api.vercel.com"

: "${VERCEL_TOKEN:?set VERCEL_TOKEN (https://vercel.com/account/tokens)}"
PREF_TEAM="${VERCEL_TEAM:-resum-ai-64a9b374}"   # tried first; falls back to all teams

if [ -f .env.vercel.local ]; then set -a; . ./.env.vercel.local; set +a; fi
WEB_PROJECT="${WEB_PROJECT:-resume-ai-web}"
API_PROJECT="${API_PROJECT:-resumeforge-api}"
JWT_SIGNING_SECRET="${JWT_SIGNING_SECRET:-$(openssl rand -hex 32)}"

AUTH=(-H "Authorization: Bearer ${VERCEL_TOKEN}" -H "Content-Type: application/json")
jstr() { python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$1"; }
tq()    { [ -n "$1" ] && printf '?teamId=%s' "$1"; }
tqamp() { [ -n "$1" ] && printf 'teamId=%s&' "$1"; }

team_ids() {
  curl -s "${AUTH[@]}" "$API/v2/teams" \
    | python3 -c "import sys,json;print('\n'.join(t['id'] for t in json.load(sys.stdin).get('teams',[])))" 2>/dev/null
}

# NAME -> "teamId|projectId" (empty teamId = personal scope); blank id if not found
resolve() {
  local name="$1" t q id
  for t in "$PREF_TEAM" $(team_ids) "__personal__"; do
    q=""; [ "$t" != "__personal__" ] && q="?teamId=$t"
    id=$(curl -s "${AUTH[@]}" "$API/v9/projects/$name$q" \
      | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['id'] if isinstance(d,dict) and 'id' in d else '')" 2>/dev/null)
    if [ -n "$id" ]; then [ "$t" = "__personal__" ] && t=""; echo "$t|$id"; return; fi
  done
  echo "|"
}

set_root() { # team id rootDir frameworkJSON
  curl -s -X PATCH "${AUTH[@]}" "$API/v9/projects/$2$(tq "$1")" \
    -d "{\"rootDirectory\":$(jstr "$3"),\"framework\":$4}" >/dev/null && echo "    rootDirectory=$3"
}
put_env() { # team id key value type
  [ -z "${4:-}" ] && { echo "    skip $3 (no value)"; return; }
  curl -s -X POST "${AUTH[@]}" "$API/v10/projects/$2/env?$(tqamp "$1")upsert=true" \
    -d "{\"key\":\"$3\",\"value\":$(jstr "$4"),\"type\":\"$5\",\"target\":[\"production\",\"preview\",\"development\"]}" \
    >/dev/null && echo "    set $3"
}
deploy() { # team id name
  local repoId
  repoId=$(curl -s "${AUTH[@]}" "$API/v9/projects/$2$(tq "$1")" \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print((d.get('link') or {}).get('repoId') or '')" 2>/dev/null)
  if [ -z "$repoId" ]; then echo "    no git link; push to main or click Redeploy"; return; fi
  curl -s -X POST "${AUTH[@]}" "$API/v13/deployments$(tq "$1")" \
    -d "{\"name\":\"$3\",\"project\":\"$2\",\"target\":\"production\",\"gitSource\":{\"type\":\"github\",\"repoId\":$repoId,\"ref\":\"main\"}}" \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print('    deploy ->', d.get('url') or (d.get('error') or {}).get('message','?'))" 2>/dev/null
}

echo "Locating projects with the token (searching all teams)…"
IFS='|' read -r WT WID <<<"$(resolve "$WEB_PROJECT")"
IFS='|' read -r AT AID <<<"$(resolve "$API_PROJECT")"

if [ -n "$AID" ]; then
  echo "API  $API_PROJECT  (team=${AT:-personal}, id=$AID)"
  set_root "$AT" "$AID" "apps/api" "null"
  put_env "$AT" "$AID" DATABASE_URL       "${DATABASE_URL:-}"       encrypted
  put_env "$AT" "$AID" JWT_SIGNING_SECRET "$JWT_SIGNING_SECRET"     encrypted
  put_env "$AT" "$AID" DESCOPE_PROJECT_ID "${DESCOPE_PROJECT_ID:-}" encrypted
  [ -n "${DESCOPE_MANAGEMENT_KEY:-}" ] && put_env "$AT" "$AID" DESCOPE_MANAGEMENT_KEY "$DESCOPE_MANAGEMENT_KEY" encrypted
  [ -n "${PUBLIC_BASE_URL:-}" ] && put_env "$AT" "$AID" PUBLIC_BASE_URL "$PUBLIC_BASE_URL" plain
  deploy "$AT" "$AID" "$API_PROJECT"
else
  echo "WARN: API project '$API_PROJECT' not found in any team your token can access."
fi

if [ -n "$WID" ]; then
  echo "WEB  $WEB_PROJECT  (team=${WT:-personal}, id=$WID)"
  set_root "$WT" "$WID" "apps/web" "\"nextjs\""
  put_env "$WT" "$WID" NEXT_PUBLIC_API_BASE_URL       "${NEXT_PUBLIC_API_BASE_URL:-}" plain
  put_env "$WT" "$WID" NEXT_PUBLIC_DESCOPE_PROJECT_ID "${DESCOPE_PROJECT_ID:-}"        plain
  deploy "$WT" "$WID" "$WEB_PROJECT"
else
  echo "WARN: web project '$WEB_PROJECT' not found in any team your token can access."
fi

echo
echo "Done. If PUBLIC_BASE_URL / NEXT_PUBLIC_API_BASE_URL were blank, set them to the"
echo "API's deployed URL and re-run. Verify: curl https://<api-url>/health"
