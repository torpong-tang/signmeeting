#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3019}"
BASE_URL="http://127.0.0.1:${PORT}"
PUBLIC_URL="http://localhost:${PORT}"
LOG_FILE="/tmp/signmeeting-smoke.log"

cd "$(dirname "$0")/.."

npm run dev -- --hostname 127.0.0.1 --port "$PORT" >"$LOG_FILE" 2>&1 &
pid=$!
trap 'kill "$pid" >/dev/null 2>&1 || true' EXIT

for _ in $(seq 1 45); do
  if curl -fsS "$BASE_URL/" >/tmp/signmeeting-home.html 2>/dev/null; then
    break
  fi
  sleep 1
done

created="$(curl -fsS -X POST "$BASE_URL/api/meetings" \
  -H "Content-Type: application/json" \
  -H "Origin: $PUBLIC_URL" \
  --data '{"meetingProjectName":"SignMeeting Pilot","meetingName":"Kickoff Meeting","meetingDate":"2026-06-09","startTime":"09:30","meetingLocation":"Meeting Room A","meetingType":"EXTERNAL"}')"

meeting_id="$(printf '%s' "$created" | grep -o '"meetingId":"[^"]*"' | head -1 | cut -d '"' -f4)"

attendance="$(curl -fsS -X POST "$BASE_URL/api/meetings/$meeting_id/attendance" \
  -H "Content-Type: application/json" \
  --data '{"channel":"EXTERNAL","fname":"Somchai","lname":"Test","department":"Vendor","position":"Consultant"}')"

meeting="$(curl -fsS "$BASE_URL/api/meetings/$meeting_id")"

if ! printf '%s' "$meeting" | grep -q '"attendances":\['; then
  echo "Attendance list missing" >&2
  exit 1
fi

printf 'Smoke OK: %s\n' "$meeting_id"
printf 'Created: %s\n' "$created"
printf 'Attendance: %s\n' "$attendance"
