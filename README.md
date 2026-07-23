# SignMeeting

SignMeeting is a Next.js app for creating meeting attendance sessions, generating QR registration links, collecting attendee records, and exporting attendance reports as Excel/PDF.

## Key Features

- Admin login for meeting management.
- Create/edit meetings with Thai date display and 24-hour time ranges.
- Encrypted-style QR tokens for internal and external registration URLs.
- Separate registration channels:
  - `สำหรับผู้ปฏิบัติงาน` for internal personnel.
  - `สำหรับผู้ร่วมประชุม` for external participants.
- Internal personnel master data for dropdown registration.
- Meeting attendance table with live search, pagination, sorting, and export.
- Attendance PDF export supports both landscape detail format and a compact portrait format with combined organization/contact fields.
- QR Code new-tab view with meeting details and copy-as-image support.
- Meeting photos, capped at 20 MB total per meeting.
- Group thumbnail images for internal/external QR cards, capped at 2 MB per group image.
- External registration can use a fixed group name as the attendee department, or require each attendee to enter their own department.
- Server-enforced meeting edit policy locks Meeting Type, protects schedule/group fields after Attendance exists, and rejects stale concurrent edits.
- Meeting metadata changes are recorded with administrator, timestamp, and before/after values in `MeetingChangeLog`.
- Prompt font and footer: `© 2026 TPT Team • Version 1.0`.

## Source Structure

The admin console is split by responsibility so feature work does not accumulate in one component:

| Path | Responsibility |
| --- | --- |
| `src/components/SignMeetingApp.tsx` | Admin orchestration, data loading, actions, QR preview, and page composition. |
| `src/components/RegisterPage.tsx` | Public internal/external registration flow and signature capture. |
| `src/components/signmeeting/MeetingFormFields.tsx` | Create/edit meeting form, group options, images, and meeting photos. |
| `src/components/signmeeting/AttendanceTable.tsx` | Attendance search, sorting, pagination, and delete action. |
| `src/components/signmeeting/ui.tsx` | Shared UI styles, date formatting, sorting, highlighting, and pagination controls. |
| `src/components/signmeeting/types.ts` | Shared Meeting, Attendance, form, and image types. |
| `src/lib/meeting-input.ts` | Shared server-side normalization and validation for meeting create/update APIs. |

Keep database validation in API/service modules and keep display-only behavior inside components. New large views or modals should be added as focused files under `src/components/signmeeting/`.

## Meeting Edit Policy

- `Meeting ID`, `Meeting Type`, and QR tokens are immutable after creation.
- Date and time can be changed only while the meeting has no Attendance records, and cannot be changed to the past.
- Internal/external group names are locked independently after the corresponding channel has Attendance records.
- Project name, meeting name, location, late-registration setting, and images remain editable by an authenticated administrator.
- Existing Attendance keeps its stored department snapshot; later meeting metadata edits do not rewrite historical exports.
- Updates require the latest `updatedAt` value to prevent one administrator from silently overwriting another administrator's changes.

## Local Development

```bash
cd /home/johnson/projects/signmeeting
npm install
npm run db:generate
npm run db:push
npm run dev -- --hostname 127.0.0.1 --port 3009
```

Open:

```text
http://127.0.0.1:3009
```

Default local admin:

```text
username: admin
password: signmeeting
```

Change production credentials and secrets before real use.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma SQLite database URL. Local default is usually `file:./dev.db`; production uses `file:/var/lib/2startup/signmeeting/signmeeting.db`. |
| `NEXT_PUBLIC_BASE_PATH` | Set to `/signmeeting` in production so API calls, QR/register URLs, static assets, and exports resolve under `https://2startup.cloud/signmeeting`. |
| `SIGNMEETING_UPLOAD_DIR` | Persistent upload root. Production uses `/var/lib/2startup/signmeeting/uploads`. |

Do not commit `.env`, `.env.production`, SQLite databases, passwords, tokens, or uploaded files.

## Production Paths

| Purpose | Path |
| --- | --- |
| App checkout | `/var/www/apps/signmeeting` |
| SQLite DB | `/var/lib/2startup/signmeeting/signmeeting.db` |
| Upload root | `/var/lib/2startup/signmeeting/uploads` |
| PM2 process | `signmeeting` |
| Private port | `127.0.0.1:3009` |
| Public route | `https://2startup.cloud/signmeeting` |

Keep SQLite and uploads outside the application checkout so deploys do not overwrite production data.

## Useful Scripts

```bash
npm run lint
npm run build
npm run smoke
npm run test:e2e
npm run test:e2e:report
npm run db:generate
npm run db:push
npm run db:backfill-end-times
npm run db:backfill-qr-tokens
```

## Pre-Deploy Checks

Run before pushing/deploying:

```bash
cd /home/johnson/projects/signmeeting
git status -sb
npm run lint
npm run build
npm run smoke
```

If routing, QR registration, exports, or admin flows changed, also run:

```bash
npm run test:e2e
```

## Production Deploy Summary

Use the shared runbook in:

```text
/home/johnson/projects/2startup-landing/DEPLOYMENT.md
```

Production deploy should be scoped to SignMeeting only:

```bash
ssh -A root@72.62.247.131
cd /var/www/apps/signmeeting
git pull --ff-only origin main
npm ci
mkdir -p /var/lib/2startup/signmeeting/backups
cp -p /var/lib/2startup/signmeeting/signmeeting.db "/var/lib/2startup/signmeeting/backups/signmeeting-pre-schema-$(date +%Y%m%d-%H%M%S).db"
DATABASE_URL="file:/var/lib/2startup/signmeeting/signmeeting.db" SIGNMEETING_UPLOAD_DIR="/var/lib/2startup/signmeeting/uploads" npx prisma generate
DATABASE_URL="file:/var/lib/2startup/signmeeting/signmeeting.db" SIGNMEETING_UPLOAD_DIR="/var/lib/2startup/signmeeting/uploads" npx prisma db push
NEXT_PUBLIC_BASE_PATH=/signmeeting DATABASE_URL="file:/var/lib/2startup/signmeeting/signmeeting.db" SIGNMEETING_UPLOAD_DIR="/var/lib/2startup/signmeeting/uploads" npm run build
pm2 restart signmeeting --update-env
pm2 save
```

After build, ensure `.next/static` and `public` are copied into `.next/standalone` if the app is running the standalone server.

## Production Health Check

```bash
curl -I -s https://2startup.cloud/signmeeting | head -n 1
curl -I -s http://127.0.0.1:3009/signmeeting | head -n 1
pm2 status signmeeting
ss -ltnp | grep ':3009'
ls -lh /var/lib/2startup/signmeeting/signmeeting.db
ls -ld /var/lib/2startup/signmeeting/uploads
```

Expected:

- Public and internal routes return `HTTP/1.1 200 OK`.
- PM2 process `signmeeting` is `online`.
- Port `3009` is bound to `127.0.0.1`.
- SQLite DB and upload directory exist under `/var/lib/2startup/signmeeting`.

## Operational Notes

- Keep PM2 in fork mode while using SQLite.
- Do not run demo seed commands against production data.
- Restrict production `.env`, SQLite DB, and upload data to administrator access.
- Use SSH remotes and SSH agent forwarding for deploy. Do not use GitHub PATs in command history or docs.
- Review `npm audit` findings separately before dependency upgrades.
