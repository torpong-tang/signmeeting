"use client";

import type { ReactNode } from "react";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { MeetingForm } from "./types";

export type SortDirection = "asc" | "desc";

const pageSizeOptions = [10, 30, 50, 100];
const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
const iconButtonBase =
  "inline-flex h-11 w-11 items-center justify-center rounded-lg text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
const iconButtonBaseSm =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

export const inputBase =
  "min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20";

export function buttonTone(tone: "create" | "save" | "edit" | "delete" | "preview" | "excel" | "pdf" | "muted") {
  const tones = {
    create: "bg-cyan-500 text-slate-950 hover:bg-cyan-300",
    save: "bg-emerald-500 text-slate-950 hover:bg-emerald-300",
    edit: "bg-amber-400 text-slate-950 hover:bg-amber-300",
    delete: "bg-rose-500 text-white hover:bg-rose-400",
    preview: "bg-sky-500 text-white hover:bg-sky-400",
    excel: "bg-lime-500 text-slate-950 hover:bg-lime-300",
    pdf: "bg-amber-400 text-slate-950 hover:bg-amber-300",
    muted: "bg-slate-700 text-white hover:bg-slate-600",
  };
  return `${buttonBase} ${tones[tone]}`;
}

export function iconButtonTone(
  tone: "edit" | "delete" | "preview" | "repeat" | "excel" | "pdf" | "muted",
  size: "md" | "sm" = "md",
) {
  const tones = {
    edit: "bg-amber-400 text-slate-950 hover:bg-amber-300",
    delete: "bg-rose-500 text-white hover:bg-rose-400",
    preview: "bg-sky-500 text-white hover:bg-sky-400",
    repeat: "bg-violet-500 text-white hover:bg-violet-400",
    excel: "bg-lime-500 text-slate-950 hover:bg-lime-300",
    pdf: "bg-amber-400 text-slate-950 hover:bg-amber-300",
    muted: "bg-slate-700 text-white hover:bg-slate-600",
  };
  return `${size === "sm" ? iconButtonBaseSm : iconButtonBase} ${tones[tone]}`;
}

export function getBangkokDateInput() {
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

export function formatThaiDate(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year + 543}`;
}

export function formatThaiDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear() + 543;
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

export function isPastMeetingTime(form: Pick<MeetingForm, "meetingDate" | "startTime">) {
  return new Date(`${form.meetingDate}T${form.startTime || "00:00"}:00+07:00`).getTime() < Date.now();
}

export function compareValues(a: unknown, b: unknown, direction: SortDirection) {
  const modifier = direction === "asc" ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * modifier;
  return String(a ?? "").localeCompare(String(b ?? ""), "th", { numeric: true }) * modifier;
}

export function includesQuery(values: unknown[], query: string) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return true;
  return values.some((value) => String(value ?? "").toLowerCase().includes(keyword));
}

export function Highlight({ text, query }: { text: ReactNode; query: string }) {
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

function getPageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3) return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}

export function PaginationControls({
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
          {pageSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <span>rows</span>
      </div>
      <div className="text-sm font-semibold text-amber-300 md:flex-1 md:text-center">พบจำนวนรายการทั้งสิ้น {total} รายการ</div>
      <div className="flex items-center gap-1">
        <button aria-label="หน้าแรก" className={navBtn} disabled={page <= 1} onClick={() => onPageChange(1)} type="button"><ChevronsLeft className="h-5 w-5" /></button>
        <button aria-label="ก่อนหน้า" className={navBtn} disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button"><ChevronLeft className="h-5 w-5" /></button>
        {getPageList(page, pages).map((item, index) => item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-1 text-slate-500">…</span>
        ) : (
          <button
            key={item}
            aria-current={item === page ? "page" : undefined}
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold transition ${item === page ? "bg-amber-400 text-slate-950" : "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"}`}
            onClick={() => onPageChange(item)}
            type="button"
          >{item}</button>
        ))}
        <button aria-label="ถัดไป" className={navBtn} disabled={page >= pages} onClick={() => onPageChange(page + 1)} type="button"><ChevronRight className="h-5 w-5" /></button>
        <button aria-label="หน้าสุดท้าย" className={navBtn} disabled={page >= pages} onClick={() => onPageChange(pages)} type="button"><ChevronsRight className="h-5 w-5" /></button>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-200">{label}{children}</label>;
}

export function SortableTh({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <th className="px-4 py-3">
      <button className="inline-flex items-center gap-2 text-left font-semibold text-slate-300 hover:text-white" onClick={onClick} type="button">
        {label}<ArrowUpDown className="h-4 w-4 text-amber-300" />
      </button>
    </th>
  );
}
