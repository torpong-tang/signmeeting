import type {
  ConfigValues,
  GroupImageChannel,
  InternalPerson,
  Meeting,
  MeetingChangeLog,
  MeetingForm,
} from "@/components/signmeeting/types";
import {
  requestJson,
  requestOk,
} from "@/components/signmeeting/api-client";

export function getAdminSession() {
  return requestJson<{ authenticated?: boolean }>(
    "/api/auth/session",
    undefined,
    "ไม่สามารถตรวจสอบ Session ได้",
  );
}

export function loginAdmin(username: string, password: string) {
  return requestJson<{ ok?: boolean }>(
    "/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    },
    "เข้าสู่ระบบไม่สำเร็จ",
  );
}

export function logoutAdmin() {
  return requestOk(
    "/api/auth/logout",
    { method: "POST" },
    "ออกจากระบบไม่สำเร็จ",
  );
}

export function getMeetingChanges(meetingId: string) {
  return requestJson<MeetingChangeLog[]>(
    `/api/meetings/${meetingId}/changes`,
    undefined,
    "โหลดประวัติการแก้ไขไม่สำเร็จ",
  );
}

type SaveMeetingOptions = {
  editingId: string | null;
  expectedUpdatedAt?: string;
  externalMeetingName: string;
  externalParticipantGroupId: number | null;
  form: MeetingForm;
};

export function saveMeetingRecord({
  editingId,
  expectedUpdatedAt,
  externalMeetingName,
  externalParticipantGroupId,
  form,
}: SaveMeetingOptions) {
  return requestJson<Meeting>(
    editingId ? `/api/meetings/${editingId}` : "/api/meetings",
    {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        externalMeetingName,
        externalParticipantGroupId,
        expectedUpdatedAt,
      }),
    },
    "บันทึกการประชุมไม่สำเร็จ",
  );
}

export function uploadMeetingFiles(
  meetingId: string,
  kind: "photos" | "documents",
  files: FileList,
) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("files", file));
  return requestOk(
    `/api/meetings/${meetingId}/${kind}`,
    { method: "POST", body: formData },
    kind === "photos" ? "Upload รูปไม่สำเร็จ" : "Upload เอกสารไม่สำเร็จ",
  );
}

export function uploadMeetingGroupImageRecord(
  meetingId: string,
  channel: GroupImageChannel,
  file: File,
) {
  const formData = new FormData();
  formData.append("file", file);
  return requestOk(
    `/api/meetings/${meetingId}/group-images/${channel}`,
    { method: "POST", body: formData },
    "Upload รูปประจำกลุ่มไม่สำเร็จ",
  );
}

export function deleteMeetingGroupImageRecord(
  meetingId: string,
  channel: GroupImageChannel,
) {
  return requestOk(
    `/api/meetings/${meetingId}/group-images/${channel}`,
    { method: "DELETE" },
    "ลบรูปประจำกลุ่มไม่สำเร็จ",
  );
}

export function deleteMeetingPhotoRecord(meetingId: string, photoId: string) {
  return requestOk(
    `/api/meetings/${meetingId}/photos/${photoId}`,
    { method: "DELETE" },
    "ลบรูปไม่สำเร็จ",
  );
}

export function deleteMeetingDocumentRecord(meetingId: string, documentId: string) {
  return requestOk(
    `/api/meetings/${meetingId}/documents/${documentId}`,
    { method: "DELETE" },
    "ลบเอกสารไม่สำเร็จ",
  );
}

export function saveConfigRecord(config: ConfigValues) {
  return requestJson<ConfigValues>(
    "/api/config",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    },
    "บันทึกค่าระบบไม่สำเร็จ",
  );
}

export function saveInternalPersonRecord(
  editingPersonId: number | null,
  person: Omit<InternalPerson, "intPid" | "isActive">,
) {
  return requestOk(
    editingPersonId
      ? `/api/internal-people/${editingPersonId}`
      : "/api/internal-people",
    {
      method: editingPersonId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    },
    "บันทึกผู้ปฏิบัติงานไม่สำเร็จ",
  );
}

export function deleteInternalPersonRecord(personId: number) {
  return requestOk(
    `/api/internal-people/${personId}`,
    { method: "DELETE" },
    "ลบผู้ปฏิบัติงานไม่สำเร็จ",
  );
}

export function deleteAttendanceRecord(meetingId: string, attendanceId: string) {
  return requestOk(
    `/api/meetings/${meetingId}/attendance/${attendanceId}`,
    { method: "DELETE" },
    "ไม่สามารถลบ Attendance ได้",
  );
}

export function deleteMeetingRecord(meetingId: string) {
  return requestOk(
    `/api/meetings/${meetingId}`,
    { method: "DELETE" },
    "ลบการประชุมไม่สำเร็จ",
  );
}
