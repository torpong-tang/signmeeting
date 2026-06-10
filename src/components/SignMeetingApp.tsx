"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  CheckCircle2,
  ClipboardList,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Loader2,
  MapPin,
  ExternalLink,
  Plus,
  QrCode,
  RefreshCw,
  Repeat2,
  Search,
  Settings,
  Save,
  ShieldCheck,
  ArrowUpDown,
  Trash2,
  Users,
  X,
} from "lucide-react";
import "driver.js/dist/driver.css";

type MeetingType = "INTERNAL" | "EXTERNAL";
type AttendanceType = "INTERNAL" | "EXTERNAL";

type Attendance = {
  id: string;
  personNo: number;
  meetingId: string;
  channel: AttendanceType;
  fname: string;
  lname: string;
  department: string;
  position: string;
  timestamp: string;
};

type InternalPerson = {
  intPid: number;
  fname: string;
  lname: string;
  department: string;
  position: string;
  isActive: boolean;
};

type Meeting = {
  id: string;
  meetingId: string;
  meetingProjectName: string;
  meetingName: string;
  meetingDate: string;
  startTime: string;
  meetingLocation: string;
  meetingType: MeetingType;
  allowLateRegister: boolean;
  qrTokenInt: string | null;
  qrTokenExt: string | null;
  qrUrlInt: string | null;
  qrUrlExt: string | null;
  createdAt: string;
  attendances: Attendance[];
  photos: MeetingPhoto[];
};

type MeetingPhoto = {
  id: string;
  meetingId: string;
  filename: string;
  mimeType: string;
  size: number;
  data?: string;
  createdAt: string;
};

type ConfigValues = {
  meeting_running?: string;
  close_time?: string;
};

type MeetingForm = {
  meetingProjectName: string;
  meetingName: string;
  meetingDate: string;
  startTime: string;
  meetingLocation: string;
  meetingType: MeetingType;
  allowLateRegister: boolean;
};

type SortDirection = "asc" | "desc";
type MeetingSortKey = "meetingId" | "meetingProjectName" | "meetingName" | "meetingDate" | "meetingType" | "attendances";
type AttendanceSortKey = "personNo" | "name" | "department" | "position" | "channel" | "timestamp";

function getBangkokDateInput() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

const emptyForm: MeetingForm = {
  meetingProjectName: "",
  meetingName: "",
  meetingDate: getBangkokDateInput(),
  startTime: "09:00",
  meetingLocation: "",
  meetingType: "EXTERNAL",
  allowLateRegister: false,
};

const pageSizeOptions = [10, 30, 50, 100];
const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0");
  const minute = index % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

const emptyPerson = {
  fname: "",
  lname: "",
  department: "",
  position: "",
};

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
const iconButtonBase =
  "inline-flex h-11 w-11 items-center justify-center rounded-lg text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
const iconButtonBaseSm =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
const inputBase =
  "min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20";

function buttonTone(tone: "create" | "save" | "edit" | "delete" | "preview" | "excel" | "pdf" | "muted") {
  const tones = {
    create: "bg-cyan-500 text-slate-950 hover:bg-cyan-300",
    save: "bg-emerald-500 text-slate-950 hover:bg-emerald-300",
    edit: "bg-indigo-500 text-white hover:bg-indigo-400",
    delete: "bg-rose-500 text-white hover:bg-rose-400",
    preview: "bg-violet-500 text-white hover:bg-violet-400",
    excel: "bg-lime-500 text-slate-950 hover:bg-lime-300",
    pdf: "bg-amber-400 text-slate-950 hover:bg-amber-300",
    muted: "bg-slate-700 text-white hover:bg-slate-600",
  };
  return `${buttonBase} ${tones[tone]}`;
}

function iconButtonTone(tone: "edit" | "delete" | "preview" | "excel" | "pdf" | "muted", size: "md" | "sm" = "md") {
  const tones = {
    edit: "bg-indigo-500 text-white hover:bg-indigo-400",
    delete: "bg-rose-500 text-white hover:bg-rose-400",
    preview: "bg-violet-500 text-white hover:bg-violet-400",
    excel: "bg-lime-500 text-slate-950 hover:bg-lime-300",
    pdf: "bg-amber-400 text-slate-950 hover:bg-amber-300",
    muted: "bg-slate-700 text-white hover:bg-slate-600",
  };
  return `${size === "sm" ? iconButtonBaseSm : iconButtonBase} ${tones[tone]}`;
}

function formatThaiDate(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year + 543}`;
}

function formatTime24(value: string) {
  if (!value) return "-";
  return value.slice(0, 5);
}

function formatThaiDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear() + 543;
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

function getMeetingStartDate(form: Pick<MeetingForm, "meetingDate" | "startTime">) {
  return new Date(`${form.meetingDate}T${form.startTime || "00:00"}:00+07:00`);
}

function isPastMeetingTime(form: Pick<MeetingForm, "meetingDate" | "startTime">) {
  return getMeetingStartDate(form).getTime() < Date.now();
}

function isRegistrationWindowClosed(form: Pick<MeetingForm, "meetingDate" | "startTime" | "allowLateRegister">, limitMinutes?: string) {
  const limit = Number.parseInt(limitMinutes ?? "15", 10) || 15;
  const deadline = new Date(getMeetingStartDate(form).getTime() + limit * 60 * 1000);
  return !form.allowLateRegister && Date.now() > deadline.getTime();
}

function compareValues(a: unknown, b: unknown, direction: SortDirection) {
  const modifier = direction === "asc" ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * modifier;
  return String(a ?? "").localeCompare(String(b ?? ""), "th", { numeric: true }) * modifier;
}

function includesQuery(values: unknown[], query: string) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return true;
  return values.some((value) => String(value ?? "").toLowerCase().includes(keyword));
}

function Highlight({ text, query }: { text: React.ReactNode; query: string }) {
  const raw = String(text ?? "");
  const keyword = query.trim();
  if (!keyword) return <>{raw}</>;
  const index = raw.toLowerCase().indexOf(keyword.toLowerCase());
  if (index < 0) return <>{raw}</>;
  return (
    <>
      {raw.slice(0, index)}
      <mark className="rounded bg-amber-300 px-1 text-slate-950">{raw.slice(index, index + keyword.length)}</mark>
      {raw.slice(index + keyword.length)}
    </>
  );
}

// Builds the page-number list with ellipses, e.g. page 1 of 16 → [1,2,3,4,5,"…",16].
function getPageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3) return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const navBtn = "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-col items-center gap-3 border-t border-slate-700 bg-slate-950/35 px-4 py-3 md:flex-row md:justify-between">
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <span>Show</span>
        <select
          className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-white"
          value={pageSize}
          onChange={(event) => {
            onPageSizeChange(Number(event.target.value));
            onPageChange(1);
          }}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span>rows</span>
      </div>

      <div className="text-sm font-semibold text-amber-300 md:flex-1 md:text-center">
        พบจำนวนรายการทั้งสิ้น {total} รายการ
      </div>

      <div className="flex items-center gap-1">
        <button aria-label="หน้าแรก" className={navBtn} disabled={page <= 1} onClick={() => onPageChange(1)} type="button">
          <ChevronsLeft className="h-5 w-5" />
        </button>
        <button aria-label="ก่อนหน้า" className={navBtn} disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button">
          <ChevronLeft className="h-5 w-5" />
        </button>
        {getPageList(page, pages).map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1 text-slate-500">
              …
            </span>
          ) : (
            <button
              key={item}
              aria-current={item === page ? "page" : undefined}
              className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold transition ${
                item === page
                  ? "bg-amber-400 text-slate-950"
                  : "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
              onClick={() => onPageChange(item)}
              type="button"
            >
              {item}
            </button>
          ),
        )}
        <button aria-label="ถัดไป" className={navBtn} disabled={page >= pages} onClick={() => onPageChange(page + 1)} type="button">
          <ChevronRight className="h-5 w-5" />
        </button>
        <button aria-label="หน้าสุดท้าย" className={navBtn} disabled={page >= pages} onClick={() => onPageChange(pages)} type="button">
          <ChevronsRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function SpinnerOverlay({ text }: { text: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-xl border border-cyan-400/40 bg-slate-900 px-5 py-4 text-cyan-100 shadow-2xl">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
        <span className="font-semibold">{text}</span>
      </div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  zClass = "z-40",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  zClass?: string;
}) {
  return (
    <div className={`fixed inset-0 ${zClass} flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm`}>
      <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-700 bg-slate-900 px-5 py-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button className={buttonTone("muted")} onClick={onClose} type="button">
            <X className="h-4 w-4" /> ปิด
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// Non-blocking notification for action results. Auto-dismisses and infers a
// success/error tone from the message text, so existing setAlert(...) call
// sites don't need to change.
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  const isError = /ไม่สำเร็จ|ไม่ถูกต้อง|ไม่สามารถ|กรุณา|ผิดพลาด|ห้าม|เกิน|ไม่ได้/.test(message);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Restart the auto-dismiss timer only when a new message arrives.
  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), 3200);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div className="fixed right-4 top-4 z-[70] flex max-w-[calc(100vw-2rem)] justify-end">
      <div
        role="status"
        className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-sm ${
          isError ? "border-rose-400/40 bg-rose-500/15 text-rose-100" : "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
        }`}
      >
        {isError ? (
          <X className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
        )}
        <p className="text-sm font-medium">{message}</p>
        <button aria-label="ปิด" className="ml-2 shrink-0 text-slate-300 transition hover:text-white" onClick={onClose} type="button">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ConfirmModal({
  message,
  onCancel,
  onConfirm,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="ยืนยันการทำรายการ" onClose={onCancel} zClass="z-[60]">
      <p className="mb-5 text-slate-200">{message}</p>
      <div className="flex justify-end gap-3">
        <button className={buttonTone("muted")} onClick={onCancel} type="button">
          <X className="h-4 w-4" /> ยกเลิก
        </button>
        <button className={buttonTone("delete")} onClick={onConfirm} type="button">
          <Trash2 className="h-4 w-4" /> ยืนยัน
        </button>
      </div>
    </Modal>
  );
}

type QrItem = {
  title: string;
  url: string;
};

function QrPanel({ items, meeting }: { items: QrItem[]; meeting: Meeting }) {
  const [images, setImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    Promise.all(
      items.map(async (item) => [item.url, await QRCode.toDataURL(item.url, { width: 260, margin: 2 })] as const),
    ).then((entries) => {
      if (active) setImages(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [items]);

  function openQrTab() {
    const qrPayload = {
      meetingId: meeting.meetingId,
      project: meeting.meetingProjectName,
      name: meeting.meetingName,
      date: formatThaiDate(meeting.meetingDate),
      time: formatTime24(meeting.startTime),
      location: meeting.meetingLocation,
      type: meeting.meetingType === "INTERNAL" ? "Internal meeting" : "External meeting",
      items: items.map((item) => ({ ...item, image: images[item.url] ?? "" })),
    };
    const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${meeting.meetingId} QR Codes</title>
  <style>
    *{box-sizing:border-box}
    body{
      margin:0;
      min-height:100vh;
      font-family:Arial,sans-serif;
      background:
        radial-gradient(circle at 12% 0%, rgba(34,211,238,.28), transparent 34%),
        radial-gradient(circle at 90% 10%, rgba(16,185,129,.18), transparent 30%),
        #07111f;
      color:#f8fafc;
      padding:36px;
    }
    .shell{max-width:1280px;margin:0 auto}
    .hero{
      border:1px solid #334155;
      border-radius:24px;
      background:rgba(15,23,42,.78);
      box-shadow:0 24px 70px rgba(0,0,0,.34);
      padding:30px;
      margin-bottom:34px;
    }
    .badge{
      display:inline-flex;
      border-radius:999px;
      background:#22d3ee;
      color:#06202c;
      font-weight:700;
      padding:8px 14px;
      margin-bottom:18px;
    }
    .hero-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap}
    .copy-button{
      border:0;
      border-radius:14px;
      background:#fbbf24;
      color:#111827;
      cursor:pointer;
      font-size:16px;
      font-weight:800;
      padding:13px 18px;
      box-shadow:0 14px 32px rgba(251,191,36,.24);
    }
    .copy-button:active{transform:scale(.98)}
    .copy-status{color:#a7f3d0;font-size:14px;margin-top:10px;text-align:right}
    h1{margin:0;font-size:34px;line-height:1.2}
    .meeting-name{margin:8px 0 0;color:#cbd5e1;font-size:20px}
    .meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:24px}
    .meta-card{border:1px solid #334155;border-radius:16px;background:#101d31;padding:16px}
    .meta-label{color:#94a3b8;font-size:13px;margin-bottom:6px}
    .meta-value{font-size:17px;font-weight:700}
    .grid{display:flex;gap:96px;justify-content:center;align-items:stretch;flex-wrap:wrap}
    .card{
      width:420px;
      min-height:520px;
      border:1px solid #334155;
      border-radius:24px;
      background:linear-gradient(180deg,#162235,#0f172a);
      padding:28px;
      text-align:center;
      box-shadow:0 20px 55px rgba(0,0,0,.26);
    }
    .title{font-size:25px;font-weight:800;margin-bottom:22px;color:#e0f2fe}
    img{width:320px;height:320px;border-radius:20px;background:white;padding:14px}
    .url{display:block;margin-top:20px;color:#67e8f9;font-size:14px;word-break:break-all;line-height:1.45;text-decoration:underline;cursor:pointer}
    .url:hover{color:#a5f3fc}
    .hint{margin-top:14px;color:#67e8f9;font-weight:700}
    @media (max-width: 900px){
      body{padding:18px}
      .meta{grid-template-columns:1fr}
      .grid{gap:24px}
      .card{width:100%}
      img{width:min(320px,100%);height:auto}
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div class="hero-head">
        <div>
          <div class="badge">SignMeeting • ${meeting.meetingId}</div>
        </div>
        <div>
          <button class="copy-button" id="copyQrImage" type="button">Copy QR Code ทั้งหมด</button>
          <div class="copy-status" id="copyStatus"></div>
        </div>
      </div>
      <h1>${meeting.meetingProjectName}</h1>
      <div class="meeting-name">${meeting.meetingName}</div>
      <div class="meta">
        <div class="meta-card">
          <div class="meta-label">วันที่ประชุม</div>
          <div class="meta-value">${formatThaiDate(meeting.meetingDate)}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">เวลา</div>
          <div class="meta-value">${formatTime24(meeting.startTime)}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">สถานที่</div>
          <div class="meta-value">${meeting.meetingLocation}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">ประเภท</div>
          <div class="meta-value">${meeting.meetingType === "INTERNAL" ? "Internal meeting" : "External meeting"}</div>
        </div>
      </div>
    </section>
    <div class="grid">
    ${items
      .map(
        (item) => `<section class="card">
      <div class="title">${item.title}</div>
      <img src="${images[item.url] ?? ""}" alt="${item.title}" />
      <div class="hint">สแกน QR Code เพื่อลงทะเบียน</div>
      <a class="url" href="${item.url}" target="_blank" rel="noopener noreferrer">${item.url}</a>
    </section>`,
      )
      .join("")}
    </div>
  </main>
  <script>
    const qrPayload = ${JSON.stringify(qrPayload)};

    function roundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
      const words = String(text).split(" ");
      let line = "";
      let currentY = y;
      for (const word of words) {
        const testLine = line ? line + " " + word : word;
        if (ctx.measureText(testLine).width > maxWidth && line) {
          ctx.fillText(line, x, currentY);
          line = word;
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, currentY);
      return currentY + lineHeight;
    }

    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }

    async function createMeetingQrBlob() {
      const qrImages = await Promise.all(qrPayload.items.map((item) => loadImage(item.image)));
      const width = 1400;
      const cardWidth = 430;
      const cardHeight = 560;
      const gap = qrPayload.items.length > 1 ? 140 : 0;
      const cardsWidth = qrPayload.items.length * cardWidth + Math.max(0, qrPayload.items.length - 1) * gap;
      const startX = (width - cardsWidth) / 2;
      const height = 920;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#07111f";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#0f172a";
      roundRect(ctx, 60, 46, width - 120, 250, 28);
      ctx.fill();
      ctx.fillStyle = "#22d3ee";
      roundRect(ctx, 92, 78, 270, 44, 22);
      ctx.fill();
      ctx.fillStyle = "#06202c";
      ctx.font = "700 22px Arial";
      ctx.fillText("SignMeeting • " + qrPayload.meetingId, 116, 107);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "800 42px Arial";
      wrapText(ctx, qrPayload.project, 92, 168, width - 184, 50);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "500 25px Arial";
      wrapText(ctx, qrPayload.name, 92, 226, width - 184, 34);

      const meta = [
        ["วันที่ประชุม", qrPayload.date],
        ["เวลา", qrPayload.time],
        ["สถานที่", qrPayload.location],
        ["ประเภท", qrPayload.type],
      ];
      meta.forEach(([label, value], index) => {
        const x = 92 + index * 300;
        ctx.fillStyle = "#1e293b";
        roundRect(ctx, x, 320, 270, 96, 18);
        ctx.fill();
        ctx.fillStyle = "#94a3b8";
        ctx.font = "500 16px Arial";
        ctx.fillText(label, x + 18, 354);
        ctx.fillStyle = "#f8fafc";
        ctx.font = "700 22px Arial";
        wrapText(ctx, value, x + 18, 386, 232, 26);
      });

      qrPayload.items.forEach((item, index) => {
        const x = startX + index * (cardWidth + gap);
        ctx.fillStyle = "#162235";
        roundRect(ctx, x, 470, cardWidth, cardHeight - 40, 26);
        ctx.fill();
        ctx.fillStyle = "#e0f2fe";
        ctx.font = "800 29px Arial";
        ctx.textAlign = "center";
        ctx.fillText(item.title, x + cardWidth / 2, 528);
        ctx.fillStyle = "#ffffff";
        roundRect(ctx, x + 55, 560, 320, 320, 22);
        ctx.fill();
        ctx.drawImage(qrImages[index], x + 63, 568, 304, 304);
        ctx.fillStyle = "#67e8f9";
        ctx.font = "700 18px Arial";
        ctx.fillText("สแกน QR Code เพื่อลงทะเบียน", x + cardWidth / 2, 920);
        ctx.textAlign = "left";
      });

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to create image")), "image/png");
      });
    }

    document.getElementById("copyQrImage").addEventListener("click", async () => {
      const status = document.getElementById("copyStatus");
      status.textContent = "กำลังสร้างรูปภาพ...";
      try {
        const blob = await createMeetingQrBlob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        status.textContent = "Copy รูปพร้อมรายละเอียดการประชุมแล้ว";
      } catch (error) {
        const blob = await createMeetingQrBlob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = qrPayload.meetingId + "-qr-meeting.png";
        link.click();
        URL.revokeObjectURL(link.href);
        status.textContent = "Browser ไม่รองรับ copy image จึงดาวน์โหลดรูปแทน";
      }
    });
  </script>
</body>
</html>`;
    const pageUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(pageUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(pageUrl), 60_000);
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-semibold text-cyan-100">
          <QrCode className="h-5 w-5 text-cyan-300" />
          QR Code สำหรับลงทะเบียน
        </div>
        <div className="flex gap-2">
          <button
            aria-label="Open QR codes in new tab"
            className={iconButtonTone("edit")}
            disabled={Object.keys(images).length < items.length}
            onClick={openQrTab}
            title="เปิด QR code ใน New tab"
            type="button"
          >
            <ExternalLink className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <QrCard key={item.url} image={images[item.url]} title={item.title} url={item.url} />
        ))}
      </div>
    </div>
  );
}

function QrCard({ image, title, url }: { image?: string; title: string; url: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold text-cyan-100">
        <QrCode className="h-5 w-5 text-cyan-300" />
        {title}
      </div>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={title} className="mx-auto rounded-lg bg-white p-2" src={image} />
      ) : (
        <div className="grid h-56 place-items-center text-slate-400">Generating QR...</div>
      )}
      <a
        className="mt-3 block break-all rounded-lg bg-slate-950 p-3 text-xs text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 transition hover:text-cyan-200 hover:decoration-cyan-300"
        href={url}
        rel="noopener noreferrer"
        target="_blank"
      >
        {url}
      </a>
    </div>
  );
}

function LoginPage({
  error,
  onLogin,
}: {
  error: string;
  onLogin: (username: string, password: string) => void;
}) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,#164e63_0,#07111f_34%,#020617_100%)] px-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/85 p-6 shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="SignMeeting logo" className="mb-6 h-24 w-full rounded-xl object-contain" src="/logosignmeeting1.png" />
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold">Admin Login</h1>
          <p className="text-slate-300">SignMeeting administration</p>
        </div>
        {error && <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-rose-100">{error}</div>}
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onLogin(username.trim(), password);
          }}
        >
          <Field label="Username">
            <input className={inputBase} value={username} onChange={(event) => setUsername(event.target.value)} />
          </Field>
          <Field label="Password">
            <div className="relative">
              <input
                className={`${inputBase} pr-12`}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
                onClick={() => setShowPassword((value) => !value)}
                tabIndex={-1}
                type="button"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </Field>
          <button className={buttonTone("save")} onClick={() => onLogin(username.trim(), password)} type="submit">
            <ShieldCheck className="h-5 w-5" /> Login
          </button>
        </form>
      </section>
    </main>
  );
}

export function SignMeetingApp() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<MeetingForm>(emptyForm);
  const [config, setConfig] = useState<ConfigValues>({});
  const [people, setPeople] = useState<InternalPerson[]>([]);
  const [personForm, setPersonForm] = useState(emptyPerson);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState("");
  const [confirm, setConfirm] = useState<{ message: string; action: () => void } | null>(null);
  const [openSections, setOpenSections] = useState({
    qr: true,
    settings: false,
    people: false,
  });
  const [meetingSearch, setMeetingSearch] = useState("");
  const [meetingPage, setMeetingPage] = useState(1);
  const [meetingPageSize, setMeetingPageSize] = useState(10);
  const [meetingSort, setMeetingSort] = useState<{ key: MeetingSortKey; direction: SortDirection }>({
    key: "meetingDate",
    direction: "desc",
  });
  // Build QR links from the origin the admin is currently using, so codes stay
  // valid even if the deployment domain changes (links are no longer baked in).
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    // Client-only: runs after hydration, so server and client agree on the
    // initial empty origin (no hydration mismatch) before the real value lands.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  async function startAdminTour() {
    const { driver } = await import("driver.js");
    const tour = driver({
      showProgress: true,
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Done",
      steps: [
        { element: "#createMeetingButton", popover: { title: "Create Meeting", description: "สร้างการประชุมใหม่ พร้อม QR สำหรับลงทะเบียน" } },
        { element: "#meetingsTable", popover: { title: "Meetings", description: "ค้นหา จัดเรียง เลือกประชุมเดิม แก้ไข ลบ หรือเรียกซ้ำประชุม" } },
        { element: "#qrAttendanceSection", popover: { title: "QR & Attendance", description: "แสดง QR และรายชื่อผู้ลงทะเบียนตาม Meeting ID" } },
        { element: "#settingsSection", popover: { title: "Settings", description: "กำหนด running number และเวลาปิดรับลงทะเบียน" } },
        { element: "#personnelSection", popover: { title: "Internal Personnel", description: "จัดการรายชื่อบุคลากรภายในสำหรับ dropdown ในหน้า QR" } },
      ],
    });
    tour.drive();
  }

  const selected = useMemo(
    () => meetings.find((meeting) => meeting.meetingId === selectedId) ?? meetings[0],
    [meetings, selectedId],
  );

  async function loadMeetings() {
    setLoading(true);
    try {
      const response = await fetch("/api/meetings");
      const data = (await response.json()) as Meeting[];
      setMeetings(data);
      if (!selectedId && data[0]) setSelectedId(data[0].meetingId);
    } finally {
      setLoading(false);
    }
  }

  async function loadSettings() {
    const [configResponse, peopleResponse] = await Promise.all([
      fetch("/api/config"),
      fetch("/api/internal-people"),
    ]);
    setConfig((await configResponse.json()) as ConfigValues);
    setPeople((await peopleResponse.json()) as InternalPerson[]);
  }

  // Determine login state from the server session cookie (no more trusting a
  // client-side localStorage flag).
  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data: { authenticated?: boolean }) => setIsAdmin(Boolean(data.authenticated)))
      .catch(() => setIsAdmin(false))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void Promise.resolve().then(async () => {
      await loadMeetings();
      await loadSettings();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setMeetingModalOpen(true);
  }

  function repeatMeeting(meeting: Meeting) {
    setEditingId(null);
    setForm({
      meetingProjectName: meeting.meetingProjectName,
      meetingName: meeting.meetingName,
      meetingDate: getBangkokDateInput(),
      startTime: "09:00",
      meetingLocation: meeting.meetingLocation,
      meetingType: meeting.meetingType,
      allowLateRegister: false,
    });
    setMeetingModalOpen(true);
  }

  function startEdit(meeting: Meeting) {
    setEditingId(meeting.meetingId);
    setForm({
      meetingProjectName: meeting.meetingProjectName,
      meetingName: meeting.meetingName,
      meetingDate: meeting.meetingDate,
      startTime: meeting.startTime,
      meetingLocation: meeting.meetingLocation,
      meetingType: meeting.meetingType,
      allowLateRegister: meeting.allowLateRegister,
    });
    setMeetingModalOpen(true);
  }

  function closeMeetingModal() {
    setMeetingModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveMeeting() {
    if (!form.meetingProjectName || !form.meetingName || !form.meetingDate || !form.startTime || !form.meetingLocation || !form.meetingType) {
      setAlert("กรุณากรอกข้อมูลการประชุมให้ครบทุก Field");
      return;
    }
    if (!editingId && isPastMeetingTime(form)) {
      setAlert("ไม่สามารถเลือกวันและเวลาย้อนหลังได้");
      return;
    }

    setConfirm({
      message: editingId ? `ยืนยันการแก้ไข ${editingId}?` : "ยืนยันการสร้างการประชุมใหม่?",
      action: async () => {
        setConfirm(null);
        setLoading(true);
        try {
          const response = await fetch(editingId ? `/api/meetings/${editingId}` : "/api/meetings", {
            method: editingId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
          if (!response.ok) {
            const result = (await response.json().catch(() => ({}))) as { message?: string };
            throw new Error(result.message ?? "บันทึกการประชุมไม่สำเร็จ");
          }
          const saved = (await response.json()) as Meeting;
          setAlert(editingId ? `บันทึกการแก้ไข ${saved.meetingId} แล้ว` : `สร้าง ${saved.meetingId} สำเร็จ`);
          closeMeetingModal();
          await loadMeetings();
          setSelectedId(saved.meetingId);
        } catch (error) {
          setAlert(error instanceof Error ? error.message : "บันทึกการประชุมไม่สำเร็จ");
        } finally {
          setLoading(false);
        }
      },
    });
  }

  async function uploadMeetingPhotos(meetingId: string, files: FileList | null) {
    if (!files?.length) return;
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));
    setLoading(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/photos`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(result.message ?? "Upload รูปไม่สำเร็จ");
      }
      await loadMeetings();
      setAlert("แนบรูปผู้เข้าร่วมประชุมเรียบร้อยแล้ว");
    } catch (error) {
      setAlert(error instanceof Error ? error.message : "Upload รูปไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  function deleteMeetingPhoto(meetingId: string, photo: MeetingPhoto) {
    setConfirm({
      message: `ยืนยันการลบรูป ${photo.filename}?`,
      action: async () => {
        setConfirm(null);
        setLoading(true);
        try {
          await fetch(`/api/meetings/${meetingId}/photos/${photo.id}`, { method: "DELETE" });
          await loadMeetings();
          setAlert("ลบรูปเรียบร้อยแล้ว");
        } finally {
          setLoading(false);
        }
      },
    });
  }

  async function saveConfig() {
    setConfirm({
      message: "ยืนยันการบันทึกค่าระบบ?",
      action: async () => {
        setConfirm(null);
        setLoading(true);
        try {
          const response = await fetch("/api/config", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config),
          });
          setConfig((await response.json()) as ConfigValues);
          setAlert("บันทึกค่าระบบเรียบร้อยแล้ว");
        } finally {
          setLoading(false);
        }
      },
    });
  }

  function startEditPerson(person: InternalPerson) {
    setEditingPersonId(person.intPid);
    setPersonForm({
      fname: person.fname,
      lname: person.lname,
      department: person.department,
      position: person.position,
    });
  }

  async function savePerson() {
    if (!personForm.fname || !personForm.lname || !personForm.department || !personForm.position) {
      setAlert("กรุณากรอกข้อมูลบุคลากรให้ครบถ้วน");
      return;
    }

    setConfirm({
      message: editingPersonId ? `ยืนยันการแก้ไขบุคลากร #${editingPersonId}?` : "ยืนยันการเพิ่มบุคลากรภายใน?",
      action: async () => {
        setConfirm(null);
        setLoading(true);
        try {
          await fetch(editingPersonId ? `/api/internal-people/${editingPersonId}` : "/api/internal-people", {
            method: editingPersonId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(personForm),
          });
          setPersonForm(emptyPerson);
          setEditingPersonId(null);
          await loadSettings();
          setAlert(editingPersonId ? "แก้ไขบุคลากรเรียบร้อยแล้ว" : "เพิ่มบุคลากรเรียบร้อยแล้ว");
        } finally {
          setLoading(false);
        }
      },
    });
  }

  function deletePerson(person: InternalPerson) {
    setConfirm({
      message: `ยืนยันการลบบุคลากร ${person.fname} ${person.lname}?`,
      action: async () => {
        setConfirm(null);
        setLoading(true);
        try {
          await fetch(`/api/internal-people/${person.intPid}`, { method: "DELETE" });
          if (editingPersonId === person.intPid) {
            setEditingPersonId(null);
            setPersonForm(emptyPerson);
          }
          await loadSettings();
          setAlert("ลบบุคลากรเรียบร้อยแล้ว");
        } finally {
          setLoading(false);
        }
      },
    });
  }

  function deleteMeeting(meeting: Meeting) {
    setConfirm({
      message: `ต้องการลบ ${meeting.meetingId} - ${meeting.meetingName} และรายชื่อผู้เข้าร่วมทั้งหมดใช่ไหม?`,
      action: async () => {
        setConfirm(null);
        setLoading(true);
        try {
          await fetch(`/api/meetings/${meeting.meetingId}`, { method: "DELETE" });
          setAlert(`ลบ ${meeting.meetingId} แล้ว`);
          setSelectedId("");
          await loadMeetings();
        } finally {
          setLoading(false);
        }
      },
    });
  }

  function downloadExport(meeting: Meeting, kind: "excel" | "pdf") {
    // Both the styled A4 workbook and the A4 PDF are generated server-side and
    // streamed back as a direct download.
    const extension = kind === "excel" ? "xlsx" : "pdf";
    const endpoint = kind === "excel" ? "export" : "export-pdf";
    const link = document.createElement("a");
    link.href = `/api/meetings/${meeting.meetingId}/${endpoint}`;
    link.download = `${meeting.meetingId}-attendance.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setAlert(`Export ${kind === "excel" ? "Excel" : "PDF"} ของ ${meeting.meetingId} แล้ว`);
  }

  const totalAttendance = meetings.reduce((sum, meeting) => sum + meeting.attendances.length, 0);
  const selectedQrItems = useMemo(() => {
    if (!selected) return [];
    const registerUrl = (token: string | null, channel: "internal" | "external", fallback: string | null) =>
      token && origin ? `${origin}/register/${token}/${channel}` : fallback;
    const items: QrItem[] = [];
    const intUrl = registerUrl(selected.qrTokenInt, "internal", selected.qrUrlInt);
    if (intUrl) {
      items.push({ title: "สำหรับบุคคลากรภายใน", url: intUrl });
    }
    const extUrl = registerUrl(selected.qrTokenExt, "external", selected.qrUrlExt);
    if (selected.meetingType === "EXTERNAL" && extUrl) {
      items.push({ title: "สำหรับบุคคลากรภายนอก", url: extUrl });
    }
    return items;
  }, [selected, origin]);

  const visibleMeetings = useMemo(() => {
    const filtered = meetings.filter((meeting) =>
      includesQuery(
        [
          meeting.meetingId,
          meeting.meetingProjectName,
          meeting.meetingName,
          meeting.meetingDate,
          meeting.startTime,
          meeting.meetingLocation,
          meeting.meetingType,
        ],
        meetingSearch,
      ),
    );
    const sorted = [...filtered].sort((a, b) => {
      const value = (meeting: Meeting) => {
        if (meetingSort.key === "attendances") return meeting.attendances.length;
        if (meetingSort.key === "meetingDate") return `${meeting.meetingDate} ${meeting.startTime}`;
        return meeting[meetingSort.key];
      };
      return compareValues(value(a), value(b), meetingSort.direction);
    });
    return sorted;
  }, [meetings, meetingSearch, meetingSort]);

  const pagedMeetings = useMemo(() => {
    const start = (meetingPage - 1) * meetingPageSize;
    return visibleMeetings.slice(start, start + meetingPageSize);
  }, [meetingPage, meetingPageSize, visibleMeetings]);

  function toggleMeetingSort(key: MeetingSortKey) {
    setMeetingSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  if (!authChecked) {
    return <SpinnerOverlay text="กำลังตรวจสอบสิทธิ์..." />;
  }

  if (!isAdmin) {
    return (
      <LoginPage
        error={loginError}
        onLogin={async (username, password) => {
          try {
            const response = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, password }),
            });
            if (!response.ok) {
              const result = (await response.json().catch(() => ({}))) as { message?: string };
              setLoginError(result.message ?? "Username หรือ Password ไม่ถูกต้อง");
              return;
            }
            setLoginError("");
            setIsAdmin(true);
          } catch {
            setLoginError("ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่");
          }
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#164e63_0,#07111f_32%,#020617_100%)] text-slate-50">
      {loading && <SpinnerOverlay text="กำลังประมวลผล..." />}
      {alert && <Toast message={alert} onClose={() => setAlert("")} />}
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onCancel={() => setConfirm(null)}
          onConfirm={confirm.action}
        />
      )}
      {meetingModalOpen && (
        <Modal title={editingId ? `แก้ไขการประชุม ${editingId}` : "สร้างการประชุมใหม่"} onClose={closeMeetingModal}>
          <MeetingFormFields
            editingId={editingId}
            form={form}
            onCancel={closeMeetingModal}
            onChange={setForm}
            onDeletePhoto={deleteMeetingPhoto}
            onSave={saveMeeting}
            onUploadPhotos={uploadMeetingPhotos}
            photos={meetings.find((meeting) => meeting.meetingId === editingId)?.photos ?? []}
            registrationClosed={isRegistrationWindowClosed(form, config.close_time)}
          />
        </Modal>
      )}

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
        <header className="flex flex-col gap-4 border-b border-slate-700 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="SignMeeting" className="h-20 w-auto rounded-xl object-contain md:h-24" src="/logosignmeeting1.png" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={buttonTone("preview")} onClick={startAdminTour} type="button">
              <ShieldCheck className="h-5 w-5" /> Guided Tour
            </button>
            <button
              className={buttonTone("muted")}
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
                setIsAdmin(false);
              }}
              type="button"
            >
              <X className="h-5 w-5" /> Logout
            </button>
            <button id="createMeetingButton" className={buttonTone("create")} onClick={startCreate} type="button">
              <Plus className="h-5 w-5" /> สร้างการประชุมใหม่
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <SummaryCard icon={<ClipboardList />} label="Meetings" value={meetings.length} tone="cyan" />
          <SummaryCard icon={<Users />} label="Attendance" value={totalAttendance} tone="emerald" />
        </section>

        <section>
          <div id="meetingsTable" className="rounded-2xl border border-slate-700 bg-slate-900/75 p-5 shadow-xl">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-bold">Meetings</h2>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <label className="relative min-w-72">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputBase} pl-10`}
                    placeholder="Live Search..."
                    value={meetingSearch}
                    onChange={(event) => {
                      setMeetingSearch(event.target.value);
                      setMeetingPage(1);
                    }}
                  />
                </label>
                <button className={buttonTone("muted")} onClick={loadMeetings} type="button">
                  <RefreshCw className="h-4 w-4" /> Refresh
                </button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Actions</th>
                    <SortableTh label="Meeting ID" onClick={() => toggleMeetingSort("meetingId")} />
                    <SortableTh label="Project" onClick={() => toggleMeetingSort("meetingProjectName")} />
                    <SortableTh label="Meeting" onClick={() => toggleMeetingSort("meetingName")} />
                    <SortableTh label="Date" onClick={() => toggleMeetingSort("meetingDate")} />
                    <SortableTh label="Count" onClick={() => toggleMeetingSort("attendances")} />
                  </tr>
                </thead>
                <tbody>
                  {pagedMeetings.map((meeting) => (
                    <tr
                      key={meeting.meetingId}
                      className={`border-t border-slate-800 hover:bg-slate-800/60 ${
                        selected?.meetingId === meeting.meetingId ? "bg-cyan-500/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-nowrap items-center gap-1">
                          <button
                            aria-label={`แสดง QR และรายชื่อของ ${meeting.meetingId}`}
                            className={iconButtonTone("preview", "sm")}
                            onClick={() => setSelectedId(meeting.meetingId)}
                            title="แสดง QR และ Attendance"
                            type="button"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            aria-label={`เรียกซ้ำ ${meeting.meetingId}`}
                            className={iconButtonTone("preview", "sm")}
                            onClick={() => repeatMeeting(meeting)}
                            title="ประชุมอีกครั้ง"
                            type="button"
                          >
                            <Repeat2 className="h-4 w-4" />
                          </button>
                          <button
                            aria-label={`แก้ไข ${meeting.meetingId}`}
                            className={iconButtonTone("edit", "sm")}
                            onClick={() => startEdit(meeting)}
                            title="แก้ไข"
                            type="button"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            aria-label={`ลบ ${meeting.meetingId}`}
                            className={iconButtonTone("delete", "sm")}
                            onClick={() => deleteMeeting(meeting)}
                            title="ลบ"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-cyan-200"><Highlight query={meetingSearch} text={meeting.meetingId} /></td>
                      <td className="px-4 py-3"><Highlight query={meetingSearch} text={meeting.meetingProjectName} /></td>
                      <td className="px-4 py-3"><Highlight query={meetingSearch} text={meeting.meetingName} /></td>
                      <td className="px-4 py-3">{formatThaiDate(meeting.meetingDate)} {formatTime24(meeting.startTime)}</td>
                      <td className="px-4 py-3">{meeting.attendances.length}</td>
                    </tr>
                  ))}
                  {visibleMeetings.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400" colSpan={6}>
                        ยังไม่มีรายการประชุม
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <PaginationControls
                page={meetingPage}
                pageSize={meetingPageSize}
                total={visibleMeetings.length}
                onPageChange={setMeetingPage}
                onPageSizeChange={setMeetingPageSize}
              />
            </div>
          </div>
        </section>

        {selected && (
          <AccordionSection
            id="qrAttendanceSection"
            icon={<QrCode className="h-6 w-6 text-cyan-300" />}
            isOpen={openSections.qr}
            onToggle={() => setOpenSections((current) => ({ ...current, qr: !current.qr }))}
            subtitle={`${selected.meetingId} • ${selected.meetingName}`}
            title="QR Code และ Attendance"
          >
            <div className="mb-5 rounded-xl border border-slate-700 bg-slate-950/40 p-4">
              <h2 className="mb-2 text-xl font-bold">{selected.meetingId}</h2>
              <p className="text-slate-300">{selected.meetingName}</p>
              <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-3">
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-300" /> {selected.meetingLocation}</p>
                <p>{formatThaiDate(selected.meetingDate)} เวลา {formatTime24(selected.startTime)}</p>
                <p>{selected.meetingType === "INTERNAL" ? "Internal meeting" : "External meeting"}</p>
              </div>
            </div>

            <QrPanel items={selectedQrItems} meeting={selected} />

            <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/40 p-4">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold">Attendance</h2>
                  <p className="text-sm text-slate-400">รายงานตาม Meeting ID: {selected.meetingId}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="min-w-64">
                    <span className="sr-only">เลือกการประชุม</span>
                    <select
                      className={inputBase}
                      value={selected.meetingId}
                      onChange={(event) => setSelectedId(event.target.value)}
                      title="เลือกการประชุมเพื่อแสดง Attendance"
                    >
                      {meetings.map((meeting) => (
                        <option key={meeting.meetingId} value={meeting.meetingId}>
                          {meeting.meetingId} - {meeting.meetingName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button aria-label="Refresh Attendance" className={iconButtonTone("muted")} onClick={loadMeetings} title="Refresh ข้อมูล Attendance" type="button">
                    <RefreshCw className="h-5 w-5" />
                  </button>
                  {selected.attendances.length > 0 && (
                    <>
                      <button aria-label="Export Excel" className={iconButtonTone("excel")} onClick={() => downloadExport(selected, "excel")} title="Export Excel" type="button">
                        <FileSpreadsheet className="h-5 w-5" />
                      </button>
                      <button aria-label="Export PDF" className={iconButtonTone("pdf")} onClick={() => downloadExport(selected, "pdf")} title="Export PDF" type="button">
                        <Download className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <AttendanceTable rows={selected.attendances} />
            </div>
          </AccordionSection>
        )}

        <AccordionSection
          id="settingsSection"
          icon={<Settings className="h-6 w-6 text-amber-300" />}
          isOpen={openSections.settings}
          onToggle={() => setOpenSections((current) => ({ ...current, settings: !current.settings }))}
          subtitle="กำหนดค่า Config ของระบบ"
          title="Settings"
        >
            <div className="grid gap-4">
              <Field label="Meeting Running">
                <input
                  className={inputBase}
                  inputMode="numeric"
                  value={config.meeting_running ?? ""}
                  onChange={(event) => setConfig({ ...config, meeting_running: event.target.value })}
                />
              </Field>
              <Field label="Register Time Limit (minutes)">
                <input
                  className={inputBase}
                  inputMode="numeric"
                  value={config.close_time ?? ""}
                  onChange={(event) => setConfig({ ...config, close_time: event.target.value })}
                />
              </Field>
              <button className={buttonTone("save")} onClick={saveConfig} type="button">
                <Save className="h-4 w-4" /> บันทึก Settings
              </button>
            </div>
        </AccordionSection>

        <AccordionSection
          id="personnelSection"
          icon={<Users className="h-6 w-6 text-emerald-300" />}
          isOpen={openSections.people}
          onToggle={() => setOpenSections((current) => ({ ...current, people: !current.people }))}
          subtitle="ใช้เป็น dropdown สำหรับ QR Internal"
          title="Internal Personnel"
        >
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div />
              <button
                className={buttonTone("muted")}
                onClick={() => {
                  setEditingPersonId(null);
                  setPersonForm(emptyPerson);
                }}
                type="button"
              >
                <RefreshCw className="h-4 w-4" /> ล้างฟอร์ม
              </button>
            </div>

            <div className="mb-5 grid gap-3 rounded-xl border border-slate-700 bg-slate-950/40 p-4 md:grid-cols-4">
              <input className={inputBase} placeholder="ชื่อ" value={personForm.fname} onChange={(event) => setPersonForm({ ...personForm, fname: event.target.value })} />
              <input className={inputBase} placeholder="นามสกุล" value={personForm.lname} onChange={(event) => setPersonForm({ ...personForm, lname: event.target.value })} />
              <input className={inputBase} placeholder="หน่วยงาน/สังกัด" value={personForm.department} onChange={(event) => setPersonForm({ ...personForm, department: event.target.value })} />
              <input className={inputBase} placeholder="ตำแหน่ง" value={personForm.position} onChange={(event) => setPersonForm({ ...personForm, position: event.target.value })} />
              <button className={`${buttonTone("save")} md:col-span-4`} onClick={savePerson} type="button">
                <Save className="h-4 w-4" /> {editingPersonId ? "บันทึกการแก้ไขบุคลากร" : "เพิ่มบุคลากร"}
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-950 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Position</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((person) => (
                    <tr key={person.intPid} className="border-t border-slate-800">
                      <td className="px-4 py-3 font-semibold text-amber-300">{person.intPid}</td>
                      <td className="px-4 py-3">{person.fname} {person.lname}</td>
                      <td className="px-4 py-3">{person.department}</td>
                      <td className="px-4 py-3">{person.position}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button aria-label={`แก้ไข ${person.fname}`} className={iconButtonTone("edit")} onClick={() => startEditPerson(person)} title="แก้ไข" type="button">
                            <Edit3 className="h-5 w-5" />
                          </button>
                          <button aria-label={`ลบ ${person.fname}`} className={iconButtonTone("delete")} onClick={() => deletePerson(person)} title="ลบ" type="button">
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {people.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400" colSpan={5}>
                        ยังไม่มีข้อมูลบุคลากรภายใน
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </AccordionSection>

        <footer className="py-4 text-center text-sm text-slate-400">© 2026 TPT Team • Version 1.0</footer>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-200">
      {label}
      {children}
    </label>
  );
}

function AccordionSection({
  children,
  icon,
  id,
  isOpen,
  subtitle,
  title,
  onToggle,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  id?: string;
  isOpen: boolean;
  subtitle?: string;
  title: string;
  onToggle: () => void;
}) {
  return (
    <section id={id} className="rounded-2xl border border-slate-700 bg-slate-900/75 shadow-xl">
      <button
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        onClick={onToggle}
        type="button"
      >
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
          </div>
        </div>
        <ChevronDown className={`h-6 w-6 text-slate-300 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <div className="border-t border-slate-700 p-5">{children}</div>}
    </section>
  );
}

function SortableTh({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <th className="px-4 py-3">
      <button className="inline-flex items-center gap-2 text-left font-semibold text-slate-300 hover:text-white" onClick={onClick} type="button">
        {label}
        <ArrowUpDown className="h-4 w-4 text-amber-300" />
      </button>
    </th>
  );
}

function MeetingFormFields({
  editingId,
  form,
  onCancel,
  onChange,
  onDeletePhoto,
  onSave,
  onUploadPhotos,
  photos,
  registrationClosed,
}: {
  editingId: string | null;
  form: MeetingForm;
  onCancel: () => void;
  onChange: (form: MeetingForm) => void;
  onDeletePhoto: (meetingId: string, photo: MeetingPhoto) => void;
  onSave: () => void;
  onUploadPhotos: (meetingId: string, files: FileList | null) => void;
  photos: MeetingPhoto[];
  registrationClosed: boolean;
}) {
  const photoTotal = photos.reduce((sum, photo) => sum + photo.size, 0);

  return (
    <div className="grid gap-4">
      <Field label="Project Name">
        <input
          className={inputBase}
          required
          value={form.meetingProjectName}
          onChange={(event) => onChange({ ...form, meetingProjectName: event.target.value })}
        />
      </Field>
      <Field label="Meeting Name">
        <input
          className={inputBase}
          required
          value={form.meetingName}
          onChange={(event) => onChange({ ...form, meetingName: event.target.value })}
        />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Meeting Date">
          <DatePickerInput value={form.meetingDate} onChange={(meetingDate) => onChange({ ...form, meetingDate })} />
        </Field>
        <Field label="Start Time">
          <select
            className={inputBase}
            required
            value={form.startTime}
            onChange={(event) => onChange({ ...form, startTime: event.target.value })}
          >
            {timeOptions.map((time) => {
              const disabled = form.meetingDate === getBangkokDateInput() && isPastMeetingTime({ meetingDate: form.meetingDate, startTime: time });
              return (
                <option disabled={disabled} key={time} value={time}>
                  {time}
                </option>
              );
            })}
          </select>
        </Field>
      </div>
      <Field label="Location">
        <input
          className={inputBase}
          required
          value={form.meetingLocation}
          onChange={(event) => onChange({ ...form, meetingLocation: event.target.value })}
        />
      </Field>
      <Field label="Meeting Type">
        <div className="grid gap-2 md:grid-cols-2">
          {(["INTERNAL", "EXTERNAL"] as MeetingType[]).map((type) => (
            <label
              key={type}
              className={`flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm ${
                editingId ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              }`}
            >
              <input
                checked={form.meetingType === type}
                disabled={Boolean(editingId)}
                name="meetingTypeModal"
                onChange={() => onChange({ ...form, meetingType: type })}
                type="radio"
              />
              {type === "INTERNAL" ? "Internal meeting" : "External meeting"}
            </label>
          ))}
        </div>
        {editingId && (
          <p className="mt-2 text-xs text-slate-400">
            ไม่สามารถเปลี่ยนประเภทการประชุมหลังสร้างแล้ว เพราะ QR และรายชื่อผู้ลงทะเบียนผูกกับประเภทนี้
          </p>
        )}
      </Field>
      {editingId && (
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <div>
            <div className="text-sm font-semibold text-slate-100">Allow late registration</div>
            <p className="text-xs text-slate-400">
              {registrationClosed ? "ขณะนี้เลยเวลาลงทะเบียนแล้ว สามารถเปิด manual ได้หากจำเป็น" : "เปิดไว้เมื่อต้องการให้ลงทะเบียนได้หลังเกิน Register Time Limit"}
            </p>
          </div>
          <button
            aria-pressed={form.allowLateRegister}
            className={`relative h-7 w-14 rounded-full transition ${
              form.allowLateRegister ? "bg-emerald-400" : "bg-slate-600"
            }`}
            onClick={() => onChange({ ...form, allowLateRegister: !form.allowLateRegister })}
            type="button"
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                form.allowLateRegister ? "left-8" : "left-1"
              }`}
            />
          </button>
        </label>
      )}
      {editingId && (
        <section className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-bold text-amber-200">รูปผู้เข้าร่วมประชุม</h3>
              <p className="text-xs text-slate-400">รวมได้ไม่เกิน 20 MB ต่อการประชุม • ใช้รูปภาพเท่านั้น</p>
            </div>
            <label className={`${buttonTone("create")} cursor-pointer`}>
              <Plus className="h-4 w-4" /> แนบรูป
              <input
                accept="image/*"
                className="hidden"
                multiple
                type="file"
                onChange={(event) => {
                  onUploadPhotos(editingId, event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          <p className="mb-3 text-sm text-slate-300">ใช้ไป {(photoTotal / 1024 / 1024).toFixed(2)} MB / 20 MB</p>
          <div className="grid gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 p-3">
                {editingId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={photo.filename}
                    className="h-16 w-16 rounded-lg object-cover"
                    src={`/api/meetings/${editingId}/photos/${photo.id}`}
                  />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-lg bg-slate-800 text-amber-300">
                    <FileText className="h-7 w-7" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{photo.filename}</div>
                  <div className="text-xs text-slate-400">{photo.mimeType} • {(photo.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <button className={iconButtonTone("delete")} onClick={() => onDeletePhoto(editingId, photo)} title="ลบรูป" type="button">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
            {photos.length === 0 && <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-slate-400">ยังไม่มีรูปแนบ</div>}
          </div>
        </section>
      )}
      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-700 pt-4">
        <button className={buttonTone("muted")} onClick={onCancel} type="button">
          <X className="h-4 w-4" /> ยกเลิก
        </button>
        <button className={buttonTone("save")} onClick={onSave} type="button">
          <Save className="h-4 w-4" /> {editingId ? "บันทึกการแก้ไข" : "บันทึก"}
        </button>
      </div>
    </div>
  );
}

function DatePickerInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const picker = inputRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === "function") {
      picker.showPicker();
      return;
    }
    picker.click();
  }

  return (
    <div className="relative flex gap-2">
      <div className={`${inputBase} flex items-center`}>{formatThaiDate(value)}</div>
      <button className={iconButtonTone("preview")} onClick={openPicker} title="เลือกวันที่" type="button">
        <CalendarDays className="h-5 w-5" />
      </button>
      <input
        ref={inputRef}
        aria-label="Meeting Date"
        className="pointer-events-none absolute h-px w-px opacity-0"
        min={getBangkokDateInput()}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "cyan" | "emerald" | "amber";
}) {
  const colors = {
    cyan: "from-cyan-500/25 to-blue-500/10 text-cyan-200",
    emerald: "from-emerald-500/25 to-teal-500/10 text-emerald-200",
    amber: "from-amber-500/25 to-orange-500/10 text-amber-200",
  };
  return (
    <div className={`rounded-2xl border border-slate-700 bg-gradient-to-br ${colors[tone]} p-5 shadow-xl`}>
      <div className="mb-4 h-9 w-9">{icon}</div>
      <div className="text-3xl font-extrabold">{value}</div>
      <div className="text-sm text-slate-300">{label}</div>
    </div>
  );
}

function AttendanceTable({ rows }: { rows: Attendance[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<{ key: AttendanceSortKey; direction: SortDirection }>({
    key: "personNo",
    direction: "asc",
  });

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((row) =>
      includesQuery([row.personNo, row.fname, row.lname, row.department, row.position, row.channel, row.timestamp], search),
    );
    return [...filtered].sort((a, b) => {
      const value = (row: Attendance) => {
        if (sort.key === "name") return `${row.fname} ${row.lname}`;
        return row[sort.key];
      };
      return compareValues(value(a), value(b), sort.direction);
    });
  }, [rows, search, sort]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleRows.slice(start, start + pageSize);
  }, [page, pageSize, visibleRows]);

  function toggleSort(key: AttendanceSortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  return (
    <div className="rounded-xl border border-slate-700">
      {rows.length > 0 && (
        <div className="border-b border-slate-700 p-4">
          <label className="relative block max-w-xl">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputBase} pl-10`}
              placeholder="Live Search..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
      )}
      <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-950 text-slate-300">
          <tr>
            <SortableTh label="No." onClick={() => toggleSort("personNo")} />
            <SortableTh label="Name" onClick={() => toggleSort("name")} />
            <SortableTh label="Department" onClick={() => toggleSort("department")} />
            <SortableTh label="Position" onClick={() => toggleSort("position")} />
            <SortableTh label="Channel" onClick={() => toggleSort("channel")} />
            <SortableTh label="Timestamp" onClick={() => toggleSort("timestamp")} />
          </tr>
        </thead>
        <tbody>
          {pagedRows.map((row) => (
            <tr key={row.id} className="border-t border-slate-800">
              <td className="px-4 py-3 font-semibold text-amber-300"><Highlight query={search} text={row.personNo} /></td>
              <td className="px-4 py-3"><Highlight query={search} text={`${row.fname} ${row.lname}`} /></td>
              <td className="px-4 py-3"><Highlight query={search} text={row.department} /></td>
              <td className="px-4 py-3"><Highlight query={search} text={row.position} /></td>
              <td className="px-4 py-3"><Highlight query={search} text={row.channel} /></td>
              <td className="px-4 py-3">{formatThaiDateTime(row.timestamp)}</td>
            </tr>
          ))}
          {visibleRows.length === 0 && (
            <tr>
              <td className="px-4 py-8 text-center text-slate-400" colSpan={6}>
                ยังไม่มีผู้ลงทะเบียน
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      <PaginationControls page={page} pageSize={pageSize} total={visibleRows.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  );
}

