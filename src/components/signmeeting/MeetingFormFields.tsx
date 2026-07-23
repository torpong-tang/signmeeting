"use client";

import { useRef, type ReactNode } from "react";
import { CalendarDays, LockKeyhole, Save, X } from "lucide-react";
import type {
  GroupImageChannel,
  Meeting,
  MeetingChangeLog,
  MeetingDocument,
  MeetingForm,
  MeetingPhoto,
  MeetingType,
  ParticipantGroup,
} from "./types";
import {
  MeetingDocumentsSection,
  MeetingPhotosSection,
} from "./MeetingAttachmentSections";
import { MeetingChangeHistorySection } from "./MeetingChangeHistorySection";
import { MeetingGroupImagesSection } from "./MeetingGroupImagesSection";
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
  participantGroups: ParticipantGroup[];
  changeLogs: MeetingChangeLog[];
  onCancel: () => void;
  onChange: (form: MeetingForm) => void;
  onDeleteGroupImage: (channel: GroupImageChannel) => void;
  onDeleteDocument: (meetingId: string, document: MeetingDocument) => void;
  onDeletePhoto: (meetingId: string, photo: MeetingPhoto) => void;
  onGroupImageFileChange: (channel: GroupImageChannel, file: File | null) => void;
  onSave: () => void;
  onUploadDocuments: (meetingId: string, files: FileList | null) => void;
  onUploadPhotos: (meetingId: string, files: FileList | null) => void;
  documents: MeetingDocument[];
  photos: MeetingPhoto[];
  registrationClosed: boolean;
};

export function MeetingFormFields({
  editingId,
  form,
  groupImageFiles,
  meeting,
  participantGroups,
  changeLogs,
  onCancel,
  onChange,
  onDeleteGroupImage,
  onDeleteDocument,
  onDeletePhoto,
  onGroupImageFileChange,
  onSave,
  onUploadDocuments,
  onUploadPhotos,
  documents,
  photos,
  registrationClosed,
}: Props) {
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
                <input
                  checked={form.externalGroupMode === "OPEN"}
                  disabled={externalGroupLocked}
                  name="externalGroupMode"
                  onChange={() => onChange({
                    ...form,
                    externalGroupMode: "OPEN",
                    externalMeetingName: "",
                    externalParticipantGroupId: null,
                  })}
                  type="radio"
                />
                ไม่ระบุชื่อกลุ่มผู้ร่วมประชุม
              </label>
            </div>
            {form.externalGroupMode === "NAMED" && (
              <Field label="ชื่อกลุ่มผู้ร่วมประชุม">
                <select
                  aria-label="ชื่อกลุ่มผู้ร่วมประชุม"
                  className={inputBase}
                  data-testid="external-group-name-select"
                  disabled={externalGroupLocked}
                  required
                  value={form.externalParticipantGroupId ?? ""}
                  onChange={(event) => {
                    const groupId = Number(event.target.value);
                    const group = participantGroups.find((item) => item.groupId === groupId);
                    onChange({
                      ...form,
                      externalParticipantGroupId: group?.groupId ?? null,
                      externalMeetingName: group?.name ?? "",
                    });
                  }}
                >
                  <option value="">
                    {externalGroupLocked && form.externalMeetingName
                      ? `ข้อมูลเดิม: ${form.externalMeetingName}`
                      : "เลือกกลุ่มผู้ร่วมประชุม"}
                  </option>
                  {participantGroups.map((group) => (
                    <option key={group.groupId} value={group.groupId}>
                      {group.name}
                    </option>
                  ))}
                </select>
                {participantGroups.length === 0 && (
                  <p className="mt-2 text-xs font-semibold text-amber-200">
                    ยังไม่มี Master กลุ่มผู้ร่วมประชุม กรุณาเพิ่มจากปุ่มกลุ่มผู้ร่วมประชุมก่อน
                  </p>
                )}
              </Field>
            )}
            <p className="text-xs text-slate-400">เมื่อระบุชื่อกลุ่ม ระบบจะใช้ชื่อนี้เป็นหน่วยงาน/สังกัดของผู้ร่วมประชุมโดยอัตโนมัติ</p>
            {externalGroupLocked && <p className="text-xs font-semibold text-amber-200">ล็อกแล้ว: มีผู้ร่วมประชุมลงทะเบียน {externalAttendanceCount} รายการ</p>}
          </div>
        )}
      </div>
      <MeetingGroupImagesSection
        editingId={editingId}
        files={groupImageFiles}
        meeting={meeting}
        meetingType={form.meetingType}
        onDelete={onDeleteGroupImage}
        onFileChange={onGroupImageFileChange}
      />
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
        <>
          <MeetingPhotosSection
            meetingId={editingId}
            onDelete={onDeletePhoto}
            onUpload={onUploadPhotos}
            photos={photos}
          />
          <MeetingDocumentsSection
            documents={documents}
            meetingId={editingId}
            onDelete={onDeleteDocument}
            onUpload={onUploadDocuments}
          />
          <MeetingChangeHistorySection changeLogs={changeLogs} />
        </>
      )}
      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-700 pt-4">
        <button className={buttonTone("muted")} onClick={onCancel} type="button"><X className="h-4 w-4" /> ยกเลิก</button>
        <button className={buttonTone("save")} onClick={onSave} type="button"><Save className="h-4 w-4" /> {editingId ? "บันทึกการแก้ไข" : "บันทึก"}</button>
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
