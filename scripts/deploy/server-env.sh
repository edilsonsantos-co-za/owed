#!/usr/bin/env bash
# Prepare .env on the VPS before a deploy. Run by .github/workflows/deploy.yml from the app folder.
# Only fills what is missing, except the API keys passed in from GitHub secrets, which always win.
# No secret is ever printed.
#
#   - OWED_BASE_URL: the public address
#   - SESSION_SECRET: generated once
#   - LOGTO_*: once the SSO deploy has registered owed-webapp (secret from core-sso-webapp/.env.production)
#   - ANTHROPIC_API_KEY, PAYPAL_CLIENT_ID/SECRET, AG_STUDIO_LICENSE_KEY, OWED_YOUTUBE_ID: from the
#     environment when set (the workflow passes the repo's GitHub secrets)
set -euo pipefail

ENV_FILE=.env
SITE_URL="${SITE_URL:-https://owed.edilsonsantos.co.za}"
SSO_ENV=/workspace/datasparklab/core-sso-webapp/.env.production
SSO_APP_ID=owed-webapp

get_env() { grep -E "^$2=" "$1" 2>/dev/null | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true; }
set_env() {
  local tmp; tmp="$(mktemp)"
  SET_ENV_VALUE="$2" awk -v k="$1" 'BEGIN{d=0; v=ENVIRON["SET_ENV_VALUE"]} index($0, k"=")==1 {print k"="v; d=1; next} {print} END{if(!d) print k"="v}' "$ENV_FILE" > "$tmp"
  cat "$tmp" > "$ENV_FILE"; rm -f "$tmp"
}
ensure() { [ -n "$(get_env "$ENV_FILE" "$1")" ] || { set_env "$1" "$2"; echo "  set $1"; }; }

echo "Preparing $ENV_FILE"
if [ ! -s "$ENV_FILE" ]; then
  install -m 600 /dev/null "$ENV_FILE"
  grep -vE '^\s*#|^\s*$' .env.example > "$ENV_FILE" || true
  echo "  created from .env.example"
fi
chmod 600 "$ENV_FILE"

ensure OWED_BASE_URL "$SITE_URL"
ensure PAYPAL_API_BASE https://api-m.sandbox.paypal.com
ensure OWED_BUSINESS_NAME "Owed Studio"
ensure SESSION_SECRET "$(openssl rand -base64 48 | tr -d '\n')"

for key in ANTHROPIC_API_KEY PAYPAL_CLIENT_ID PAYPAL_CLIENT_SECRET AG_STUDIO_LICENSE_KEY OWED_YOUTUBE_ID; do
  value="${!key:-}"
  if [ -n "$value" ] && [ "$(get_env "$ENV_FILE" "$key")" != "$value" ]; then
    set_env "$key" "$value"
    echo "  updated $key"
  fi
done

var="SSO_APP_SECRET_$(printf '%s' "$SSO_APP_ID" | tr '[:lower:]-' '[:upper:]_')"
secret="$( [ -r "$SSO_ENV" ] && get_env "$SSO_ENV" "$var" || true)"
if [ -n "$secret" ] && { [ "$(get_env "$ENV_FILE" LOGTO_APP_SECRET)" != "$secret" ] || [ "$(get_env "$ENV_FILE" LOGTO_APP_ID)" != "$SSO_APP_ID" ]; }; then
  set_env LOGTO_ENDPOINT https://sso.datasparklab.com
  set_env LOGTO_INTERNAL_ENDPOINT http://dsl-sso:3001
  set_env LOGTO_APP_ID "$SSO_APP_ID"
  set_env LOGTO_APP_SECRET "$secret"
  echo "  linked to SSO as $SSO_APP_ID"
fi
[ -n "$(get_env "$ENV_FILE" LOGTO_APP_SECRET)" ] || echo "::warning::No Logto secret for $SSO_APP_ID yet: the app runs open (no sign-in) until the SSO deploy registers it."

echo "$ENV_FILE ready"
