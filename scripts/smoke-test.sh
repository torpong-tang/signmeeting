#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3009}"
BASE_URL="http://127.0.0.1:${PORT}"
PUBLIC_URL="http://localhost:${PORT}"
LOG_FILE="/tmp/signmeeting-smoke.log"
COOKIE_FILE="/tmp/signmeeting-smoke-cookie.txt"
TOMORROW="$(date -d tomorrow +%F)"

cd "$(dirname "$0")/.."

pid=""
if ! curl -fsS "$BASE_URL/" >/tmp/signmeeting-home.html 2>/dev/null; then
  npm run dev -- --hostname 127.0.0.1 --port "$PORT" >"$LOG_FILE" 2>&1 &
  pid=$!
fi
trap 'if [ -n "$pid" ]; then kill "$pid" >/dev/null 2>&1 || true; fi' EXIT

for _ in $(seq 1 45); do
  if curl -fsS "$BASE_URL/" >/tmp/signmeeting-home.html 2>/dev/null; then
    break
  fi
  sleep 1
done

curl -fsS -c "$COOKIE_FILE" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  --data "{\"username\":\"${ADMIN_USERNAME:-admin}\",\"password\":\"${ADMIN_PASSWORD:-signmeeting}\"}" >/dev/null

created="$(curl -fsS -b "$COOKIE_FILE" -X POST "$BASE_URL/api/meetings" \
  -H "Content-Type: application/json" \
  -H "Origin: $PUBLIC_URL" \
  --data "{\"meetingProjectName\":\"SignMeeting Pilot\",\"meetingName\":\"Kickoff Meeting\",\"meetingDate\":\"$TOMORROW\",\"startTime\":\"09:30\",\"endTime\":\"10:30\",\"meetingLocation\":\"Meeting Room A\",\"meetingType\":\"EXTERNAL\",\"internalMeetingName\":\"Smarterware\",\"externalMeetingName\":\"Vendor Team\"}")"

meeting_id="$(printf '%s' "$created" | grep -o '"meetingId":"[^"]*"' | head -1 | cut -d '"' -f4)"

attendance="$(curl -fsS -X POST "$BASE_URL/api/meetings/$meeting_id/attendance" \
  -H "Content-Type: application/json" \
  --data '{"channel":"EXTERNAL","fname":"Somchai","lname":"Test","department":"Vendor","position":"Consultant"}')"

meeting="$(curl -fsS -b "$COOKIE_FILE" "$BASE_URL/api/meetings/$meeting_id")"

if ! printf '%s' "$meeting" | grep -q '"attendances":\['; then
  echo "Attendance list missing" >&2
  exit 1
fi

printf 'Smoke OK: %s\n' "$meeting_id"
printf 'Created: %s\n' "$created"
printf 'Attendance: %s\n' "$attendance"
