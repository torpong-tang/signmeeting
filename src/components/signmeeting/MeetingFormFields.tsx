"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { CalendarDays, FileText, History, ImagePlus, LockKeyhole, Plus, Save, Trash2, X } from "lucide-react";
import { appPath } from "@/lib/paths";
import type { GroupImageChannel, Meeting, MeetingChangeLog, MeetingForm, MeetingPhoto, MeetingType } from "./types";
import {
  buttonTone,
  Field,
  formatThaiDate,
  getBangkokDateInput,
  iconButtonTone,
  inputBase,
  isPastMeetingTime,
} from "./ui";

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0");
  const minute = index % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});
const endTimeOptions = [...timeOptions, "23:59"];

type Props = {
  editingId: string | null;
  form: MeetingForm;
  groupImageFiles: Partial<Record<GroupImageChannel, File>>;
  meeting?: Meeting;
  changeLogs: MeetingChangeLog[];
  onCancel: () => void;
  onChange: (form: MeetingForm) => void;
  onDeleteGroupImage: (channel: GroupImageChannel) => void;
  onDeletePhoto: (meetingId: string, photo: MeetingPhoto) => void;
  onGroupImageFileChange: (channel: GroupImageChannel, file: File | null) => void;
  onSave: () => void;
  onUploadPhotos: (meetingId: string, files: FileList | null) => void;
  photos: MeetingPhoto[];
  registrationClosed: boolean;
};

export function MeetingFormFields({
  editingId,
  form,
  groupImageFiles,
  meeting,
  changeLogs,
  onCancel,
  onChange,
  onDeleteGroupImage,
  onDeletePhoto,
  onGroupImageFileChange,
  onSave,
  onUploadPhotos,
  photos,
  registrationClosed,
}: Props) {
  const photoTotal = photos.reduce((sum, photo) => sum + photo.size, 0);
  const attendanceCount = meeting?.attendances.length ?? 0;
  const internalAttendanceCount = meeting?.attendances.filter((row) => row.channel === "INTERNAL").length ?? 0;
  const externalAttendanceCount = meeting?.attendances.filter((row) => row.channel === "EXTERNAL").length ?? 0;
  const scheduleLocked = Boolean(editingId && attendanceCount > 0);
  const internalGroupLocked = Boolean(editingId && internalAttendanceCount > 0);
  const externalGroupLocked = Boolean(editingId && externalAttendanceCount > 0);

  return (
    <div className="grid gap-4">
      <Field label="Project Name">
        <input className={inputBase} required value={form.meetingProjectName} onChange={(event) => onChange({ ...form, meetingProjectName: event.target.value })} />
      </Field>
      <Field label="Meeting Name">
        <input className={inputBase} required value={form.meetingName} onChange={(event) => onChange({ ...form, meetingName: event.target.value })} />
      </Field>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Meeting Date">
          <DatePickerInput disabled={scheduleLocked} value={form.meetingDate} onChange={(meetingDate) => onChange({ ...form, meetingDate })} />
        </Field>
        <Field label="Start Time">
          <select
            aria-label="Start Time"
            className={inputBase}
            disabled={scheduleLocked}
            required
            value={form.startTime}
            onChange={(event) => {
              const startTime = event.target.value;
              const nextEndTime = form.endTime > startTime
                ? form.endTime
                : (endTimeOptions.find((time) => time > startTime) ?? "23:59");
              onChange({ ...form, startTime, endTime: nextEndTime });
            }}
          >
            {timeOptions.map((time) => (
              <option
                disabled={form.meetingDate === getBangkokDateInput() && isPastMeetingTime({ meetingDate: form.meetingDate, startTime: time })}
                key={time}
                value={time}
              >
                {time}
              </option>
            ))}
          </select>
        </Field>
        <Field label="End Time">
          <select aria-label="End Time" className={inputBase} disabled={scheduleLocked} required value={form.endTime} onChange={(event) => onChange({ ...form, endTime: event.target.value })}>
            {endTimeOptions.map((time) => <option disabled={time <= form.startTime} key={time} value={time}>{time}</option>)}
          </select>
        </Field>
      </div>
      {scheduleLocked && (
        <PolicyNotice>
          วันและเวลาถูกล็อก เนื่องจากมี Attendance แล้ว {attendanceCount} รายการ หากต้องเปลี่ยนกำหนดการควรสร้างการประชุมใหม่ด้วยปุ่มประชุมอีกครั้ง
        </PolicyNotice>
      )}
      <Field label="Location">
        <input className={inputBase} required value={form.meetingLocation} onChange={(event) => onChange({ ...form, meetingLocation: event.target.value })} />
      </Field>
      <Field label="Meeting Type">
        <div className="grid gap-2 md:grid-cols-2">
          {(["INTERNAL", "EXTERNAL"] as MeetingType[]).map((type) => (
            <label
              key={type}
              className={`flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm ${editingId ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
              <input
                checked={form.meetingType === type}
                disabled={Boolean(editingId)}
                name="meetingTypeModal"
                onChange={() => onChange({ ...form, meetingType: type })}
                type="radio"
              />
              {type === "INTERNAL" ? "สำหรับบริษัทฯ" : "สำหรับผู้ร่วมประชุม"}
            </label>
          ))}
        </div>
        {editingId && <p className="mt-2 text-xs text-slate-400">ไม่สามารถเปลี่ยนประเภทการประชุมหลังสร้างแล้ว เพราะ QR และรายชื่อผู้ลงทะเบียนผูกกับประเภทนี้</p>}
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="ชื่อกลุ่มผู้ปฏิบัติงาน">
          <input className={inputBase} disabled={internalGroupLocked} required value={form.internalMeetingName} onChange={(event) => onChange({ ...form, internalMeetingName: event.target.value })} />
          {internalGroupLocked && <p className="mt-2 text-xs text-amber-200">ล็อกแล้ว: มีผู้ปฏิบัติงานลงทะเบียน {internalAttendanceCount} รายการ</p>}
        </Field>
        {form.meetingType === "EXTERNAL" && (
          <div className="grid gap-3 rounded-xl border border-slate-700 bg-slate-950/40 p-4">
            <div className="text-sm font-semibold text-slate-200">การระบุชื่อกลุ่มผู้ร่วมประชุม</div>
            <div className="grid gap-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100">
                <input checked={form.externalGroupMode === "NAMED"} disabled={externalGroupLocked} name="externalGroupMode" onChange={() => onChange({ ...form, externalGroupMode: "NAMED" })} type="radio" />
                ระบุชื่อกลุ่มผู้ร่วมประชุม
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100">
                <input checked={form.externalGroupMode === "OPEN"} disabled={externalGroupLocked} name="externalGroupMode" onChange={() => onChange({ ...form, externalGroupMode: "OPEN", externalMeetingName: "" })} type="radio" />
                ไม่ระบุชื่อกลุ่มผู้ร่วมประชุม
              </label>
            </div>
            {form.externalGroupMode === "NAMED" && (
              <Field label="ชื่อกลุ่มผู้ร่วมประชุม">
                <input
                  className={inputBase}
                  data-testid="external-group-name-input"
                  disabled={externalGroupLocked}
                  placeholder="ชื่อกลุ่มผู้ร่วมประชุม"
                  required
                  value={form.externalMeetingName}
                  onChange={(event) => onChange({ ...form, externalMeetingName: event.target.value })}
                />
              </Field>
            )}
            <p className="text-xs text-slate-400">เมื่อระบุชื่อกลุ่ม ระบบจะใช้ชื่อนี้เป็นหน่วยงาน/สังกัดของผู้ร่วมประชุมโดยอัตโนมัติ</p>
            {externalGroupLocked && <p className="text-xs font-semibold text-amber-200">ล็อกแล้ว: มีผู้ร่วมประชุมลงทะเบียน {externalAttendanceCount} รายการ</p>}
          </div>
        )}
      </div>
      <section className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
        <div className="mb-3">
          <h3 className="font-bold text-cyan-100">รูปประกอบ QR Code ตามกลุ่ม</h3>
          <p className="text-xs text-slate-400">เลือกรูปภาพไม่เกิน 2 MB ต่อกลุ่ม ระบบจะแสดงในหน้า QR Code และรูปที่ Copy ออกไป</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <GroupImagePicker
            channel="internal"
            existingFilename={meeting?.internalGroupImageFilename}
            existingImageUrl={editingId && meeting?.internalGroupImageFilename ? appPath(`/api/meetings/${editingId}/group-images/internal`) : ""}
            file={groupImageFiles.internal}
            label="รูปกลุ่มผู้ปฏิบัติงาน"
            onDeleteExisting={() => onDeleteGroupImage("internal")}
            onFileChange={(file) => onGroupImageFileChange("internal", file)}
          />
          {form.meetingType === "EXTERNAL" && (
            <GroupImagePicker
              channel="external"
              existingFilename={meeting?.externalGroupImageFilename}
              existingImageUrl={editingId && meeting?.externalGroupImageFilename ? appPath(`/api/meetings/${editingId}/group-images/external`) : ""}
              file={groupImageFiles.external}
              label="รูปกลุ่มผู้ร่วมประชุม"
              onDeleteExisting={() => onDeleteGroupImage("external")}
              onFileChange={(file) => onGroupImageFileChange("external", file)}
            />
          )}
        </div>
      </section>
      {editingId && (
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <div>
            <div className="text-sm font-semibold text-slate-100">Allow late registration</div>
            <p className="text-xs text-slate-400">{registrationClosed ? "ขณะนี้เลยเวลาลงทะเบียนแล้ว สามารถเปิด manual ได้หากจำเป็น" : "เปิดไว้เมื่อต้องการให้ลงทะเบียนได้หลังเกิน Register Time Limit"}</p>
          </div>
          <button
            aria-pressed={form.allowLateRegister}
            className={`relative h-7 w-14 rounded-full transition ${form.allowLateRegister ? "bg-emerald-400" : "bg-slate-600"}`}
            onClick={() => onChange({ ...form, allowLateRegister: !form.allowLateRegister })}
            type="button"
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${form.allowLateRegister ? "left-8" : "left-1"}`} />
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
                  <img alt={photo.filename} className="h-16 w-16 rounded-lg object-cover" src={appPath(`/api/meetings/${editingId}/photos/${photo.id}`)} />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-lg bg-slate-800 text-amber-300"><FileText className="h-7 w-7" /></div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{photo.filename}</div>
                  <div className="text-xs text-slate-400">{photo.mimeType} • {(photo.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <button className={iconButtonTone("delete")} onClick={() => onDeletePhoto(editingId, photo)} title="ลบรูป" type="button"><Trash2 className="h-5 w-5" /></button>
              </div>
            ))}
            {photos.length === 0 && <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-slate-400">ยังไม่มีรูปแนบ</div>}
          </div>
        </section>
      )}
      {editingId && (
        <section className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
          <div className="mb-3 flex items-center gap-2 font-bold text-cyan-100">
            <History className="h-5 w-5 text-cyan-300" /> ประวัติการแก้ไข
          </div>
          <div className="grid max-h-64 gap-3 overflow-y-auto">
            {changeLogs.map((log) => (
              <article className="rounded-lg border border-slate-700 bg-slate-900/70 p-3" key={log.id}>
                <div className="mb-2 text-xs text-slate-400">
                  {new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(log.createdAt))}
                  {" • "}{log.changedBy}
                </div>
                <ul className="grid gap-1 text-sm text-slate-200">
                  {log.changes.map((change) => (
                    <li key={`${log.id}-${change.field}`}><span className="font-semibold text-amber-200">{change.label}:</span> {change.before} → {change.after}</li>
                  ))}
                </ul>
              </article>
            ))}
            {changeLogs.length === 0 && <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-sm text-slate-400">ยังไม่มีประวัติการแก้ไข</div>}
          </div>
        </section>
      )}
      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-700 pt-4">
        <button className={buttonTone("muted")} onClick={onCancel} type="button"><X className="h-4 w-4" /> ยกเลิก</button>
        <button className={buttonTone("save")} onClick={onSave} type="button"><Save className="h-4 w-4" /> {editingId ? "บันทึกการแก้ไข" : "บันทึก"}</button>
      </div>
    </div>
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

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const shownUrl = previewUrl || existingImageUrl;
  const shownName = file?.name || existingFilename || "";

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-100">{label}</div>
          <div className="text-xs text-slate-400">รองรับ JPG, PNG, WEBP และไฟล์รูปภาพอื่น ๆ • สูงสุด 2 MB</div>
        </div>
        <ImagePlus className="h-5 w-5 shrink-0 text-cyan-300" />
      </div>
      <div className="mx-auto mb-3 grid h-28 w-full max-w-56 place-items-center overflow-hidden rounded-lg border border-slate-700 bg-slate-950 p-2">
        {shownUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={label} className="h-24 w-full rounded-md object-contain" src={shownUrl} />
        ) : (
          <div className="grid h-full w-full place-items-center rounded-md bg-gradient-to-br from-slate-800 to-slate-950 text-center text-sm text-slate-400">ยังไม่มีรูปประกอบ</div>
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
        {file && <button className={`${buttonTone("muted")} min-h-10 px-3 py-2 text-xs`} onClick={() => onFileChange(null)} type="button"><X className="h-4 w-4" /> ยกเลิกรูปที่เลือก</button>}
        {!file && existingFilename && <button className={`${buttonTone("delete")} min-h-10 px-3 py-2 text-xs`} onClick={onDeleteExisting} type="button"><Trash2 className="h-4 w-4" /> ลบรูปเดิม</button>}
      </div>
    </div>
  );
}

function PolicyNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
      <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" /> {children}
    </div>
  );
}

function DatePickerInput({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const picker = inputRef.current;
    if (!picker || disabled) return;
    if (typeof picker.showPicker === "function") picker.showPicker();
    else picker.click();
  }

  return (
    <div className="relative flex gap-2">
      <div className={`${inputBase} flex items-center ${disabled ? "cursor-not-allowed opacity-60" : ""}`}>{formatThaiDate(value)}</div>
      <button className={iconButtonTone("preview")} disabled={disabled} onClick={openPicker} title={disabled ? "วันที่ถูกล็อกเพราะมี Attendance แล้ว" : "เลือกวันที่"} type="button"><CalendarDays className="h-5 w-5" /></button>
      <input
        ref={inputRef}
        aria-label="Meeting Date"
        className="pointer-events-none absolute h-px w-px opacity-0"
        min={getBangkokDateInput()}
        disabled={disabled}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
