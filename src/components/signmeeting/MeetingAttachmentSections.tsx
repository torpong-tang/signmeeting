"use client";

import { Download, FileText, Paperclip, Plus, Trash2 } from "lucide-react";
import { appPath } from "@/lib/paths";
import type { MeetingDocument, MeetingPhoto } from "./types";
import { buttonTone, iconButtonTone } from "./ui";

export function MeetingPhotosSection({
  meetingId,
  photos,
  onDelete,
  onUpload,
}: {
  meetingId: string;
  photos: MeetingPhoto[];
  onDelete: (meetingId: string, photo: MeetingPhoto) => void;
  onUpload: (meetingId: string, files: FileList | null) => void;
}) {
  const total = photos.reduce((sum, photo) => sum + photo.size, 0);

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-bold text-amber-200">รูปผู้เข้าร่วมประชุม</h3>
          <p className="text-xs text-slate-400">
            รวมได้ไม่เกิน 20 MB ต่อการประชุม • ใช้รูปภาพเท่านั้น
          </p>
        </div>
        <label className={`${buttonTone("create")} cursor-pointer`}>
          <Plus className="h-4 w-4" /> แนบรูป
          <input
            accept="image/*"
            className="hidden"
            multiple
            type="file"
            onChange={(event) => {
              onUpload(meetingId, event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      <p className="mb-3 text-sm text-slate-300">
        ใช้ไป {(total / 1024 / 1024).toFixed(2)} MB / 20 MB
      </p>
      <div className="grid gap-3">
        {photos.map((photo) => (
          <div
            className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 p-3"
            key={photo.id}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={photo.filename}
              className="h-16 w-16 rounded-lg object-cover"
              src={appPath(`/api/meetings/${meetingId}/photos/${photo.id}`)}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{photo.filename}</div>
              <div className="text-xs text-slate-400">
                {photo.mimeType} • {(photo.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
            <button
              className={iconButtonTone("delete")}
              onClick={() => onDelete(meetingId, photo)}
              title="ลบรูป"
              type="button"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        ))}
        {photos.length === 0 && (
          <EmptyState>ยังไม่มีรูปแนบ</EmptyState>
        )}
      </div>
    </section>
  );
}

export function MeetingDocumentsSection({
  documents,
  meetingId,
  onDelete,
  onUpload,
}: {
  documents: MeetingDocument[];
  meetingId: string;
  onDelete: (meetingId: string, document: MeetingDocument) => void;
  onUpload: (meetingId: string, files: FileList | null) => void;
}) {
  const total = documents.reduce((sum, document) => sum + document.size, 0);

  return (
    <section className="rounded-xl border border-amber-400/30 bg-slate-950/40 p-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-amber-200">
            <Paperclip className="h-5 w-5" /> เอกสารประกอบการประชุม
          </h3>
          <p className="text-xs text-slate-400">
            รองรับ PDF, Word, Excel, PowerPoint, TXT, JPG, PNG และ WEBP รวมไม่เกิน 20 MB
          </p>
        </div>
        <label className={`${buttonTone("create")} cursor-pointer`}>
          <Plus className="h-4 w-4" /> แนบเอกสาร
          <input
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp"
            className="hidden"
            multiple
            type="file"
            onChange={(event) => {
              onUpload(meetingId, event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-300">
          ใช้ไป {(total / 1024 / 1024).toFixed(2)} MB / 20 MB
        </span>
        <span className="rounded-full bg-amber-400/10 px-3 py-1 font-semibold text-amber-200">
          {documents.length} ไฟล์
        </span>
      </div>
      <div className="grid gap-3">
        {documents.map((document) => (
          <div
            className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 p-3"
            key={document.id}
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-amber-400/10 text-amber-300">
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold" title={document.filename}>
                {document.filename}
              </div>
              <div className="text-xs text-slate-400">
                {(document.size / 1024 / 1024).toFixed(2)} MB •{" "}
                {new Intl.DateTimeFormat("th-TH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Bangkok",
                }).format(new Date(document.createdAt))}
              </div>
            </div>
            <a
              aria-label={`ดาวน์โหลด ${document.filename}`}
              className={iconButtonTone("preview")}
              href={appPath(`/api/meetings/${meetingId}/documents/${document.id}`)}
              title="ดาวน์โหลดเอกสาร"
            >
              <Download className="h-5 w-5" />
            </a>
            <button
              aria-label={`ลบ ${document.filename}`}
              className={iconButtonTone("delete")}
              onClick={() => onDelete(meetingId, document)}
              title="ลบเอกสาร"
              type="button"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        ))}
        {documents.length === 0 && (
          <EmptyState>ยังไม่มีเอกสารประกอบการประชุม</EmptyState>
        )}
      </div>
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-slate-400">
      {children}
    </div>
  );
}
