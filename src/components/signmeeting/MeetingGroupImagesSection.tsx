"use client";

import { useEffect, useMemo } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { appPath } from "@/lib/paths";
import type { GroupImageChannel, Meeting, MeetingType } from "./types";
import { buttonTone } from "./ui";

type Props = {
  editingId: string | null;
  files: Partial<Record<GroupImageChannel, File>>;
  meeting?: Meeting;
  meetingType: MeetingType;
  onDelete: (channel: GroupImageChannel) => void;
  onFileChange: (channel: GroupImageChannel, file: File | null) => void;
};

export function MeetingGroupImagesSection({
  editingId,
  files,
  meeting,
  meetingType,
  onDelete,
  onFileChange,
}: Props) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
      <div className="mb-3">
        <h3 className="font-bold text-cyan-100">รูปประกอบ QR Code ตามกลุ่ม</h3>
        <p className="text-xs text-slate-400">
          เลือกรูปภาพไม่เกิน 2 MB ต่อกลุ่ม ระบบจะแสดงในหน้า QR Code และรูปที่ Copy ออกไป
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <GroupImagePicker
          channel="internal"
          existingFilename={meeting?.internalGroupImageFilename}
          existingImageUrl={
            editingId && meeting?.internalGroupImageFilename
              ? appPath(`/api/meetings/${editingId}/group-images/internal`)
              : ""
          }
          file={files.internal}
          label="รูปกลุ่มผู้ปฏิบัติงาน"
          onDeleteExisting={() => onDelete("internal")}
          onFileChange={(file) => onFileChange("internal", file)}
        />
        {meetingType === "EXTERNAL" && (
          <GroupImagePicker
            channel="external"
            existingFilename={meeting?.externalGroupImageFilename}
            existingImageUrl={
              editingId && meeting?.externalGroupImageFilename
                ? appPath(`/api/meetings/${editingId}/group-images/external`)
                : ""
            }
            file={files.external}
            label="รูปกลุ่มผู้ร่วมประชุม"
            onDeleteExisting={() => onDelete("external")}
            onFileChange={(file) => onFileChange("external", file)}
          />
        )}
      </div>
    </section>
  );
}

function GroupImagePicker({
  channel,
  existingFilename,
  existingImageUrl,
  file,
  label,
  onDeleteExisting,
  onFileChange,
}: {
  channel: GroupImageChannel;
  existingFilename?: string | null;
  existingImageUrl: string;
  file?: File;
  label: string;
  onDeleteExisting: () => void;
  onFileChange: (file: File | null) => void;
}) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const shownUrl = previewUrl || existingImageUrl;
  const shownName = file?.name || existingFilename || "";

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-100">{label}</div>
          <div className="text-xs text-slate-400">
            รองรับ JPG, PNG, WEBP และไฟล์รูปภาพอื่น ๆ • สูงสุด 2 MB
          </div>
        </div>
        <ImagePlus className="h-5 w-5 shrink-0 text-cyan-300" />
      </div>
      <div className="mx-auto mb-3 grid h-28 w-full max-w-56 place-items-center overflow-hidden rounded-lg border border-slate-700 bg-slate-950 p-2">
        {shownUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={label} className="h-24 w-full rounded-md object-contain" src={shownUrl} />
        ) : (
          <div className="grid h-full w-full place-items-center rounded-md bg-gradient-to-br from-slate-800 to-slate-950 text-center text-sm text-slate-400">
            ยังไม่มีรูปประกอบ
          </div>
        )}
      </div>
      {shownName && <div className="mb-3 truncate text-xs text-slate-300">{shownName}</div>}
      <div className="flex flex-wrap gap-2">
        <label className={`${buttonTone("create")} min-h-10 cursor-pointer px-3 py-2 text-xs`}>
          <ImagePlus className="h-4 w-4" /> {shownName ? "เปลี่ยนรูป" : "เลือกรูป"}
          <input
            accept="image/*"
            aria-label={`Upload ${channel} group image`}
            className="hidden"
            type="file"
            onChange={(event) => {
              onFileChange(event.target.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
          />
        </label>
        {file && (
          <button
            className={`${buttonTone("muted")} min-h-10 px-3 py-2 text-xs`}
            onClick={() => onFileChange(null)}
            type="button"
          >
            <X className="h-4 w-4" /> ยกเลิกรูปที่เลือก
          </button>
        )}
        {!file && existingFilename && (
          <button
            className={`${buttonTone("delete")} min-h-10 px-3 py-2 text-xs`}
            onClick={onDeleteExisting}
            type="button"
          >
            <Trash2 className="h-4 w-4" /> ลบรูปเดิม
          </button>
        )}
      </div>
    </div>
  );
}
