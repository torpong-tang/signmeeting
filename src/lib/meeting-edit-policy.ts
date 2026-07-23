import type { AttendanceType, Meeting, MeetingType } from "@prisma/client";
import type { NormalizedMeetingInput } from "@/lib/meeting-input";

export type MeetingFieldChange = {
  field: string;
  label: string;
  before: string;
  after: string;
};

type MeetingForEdit = Pick<
  Meeting,
  | "meetingProjectName"
  | "meetingName"
  | "meetingDate"
  | "startTime"
  | "endTime"
  | "meetingLocation"
  | "meetingType"
  | "internalMeetingName"
  | "externalMeetingName"
  | "allowLateRegister"
> & {
  attendances: Array<{ channel: AttendanceType }>;
};

const fieldLabels: Record<string, string> = {
  meetingProjectName: "Project Name",
  meetingName: "Meeting Name",
  meetingDate: "Meeting Date",
  startTime: "Start Time",
  endTime: "End Time",
  meetingLocation: "Location",
  internalMeetingName: "ชื่อกลุ่มผู้ปฏิบัติงาน",
  externalMeetingName: "ชื่อกลุ่มผู้ร่วมประชุม",
  allowLateRegister: "Allow late registration",
};

function displayValue(value: unknown) {
  if (typeof value === "boolean") return value ? "เปิด" : "ปิด";
  const text = String(value ?? "").trim();
  return text || "-";
}

export function buildMeetingFieldChanges(
  existing: MeetingForEdit,
  next: NormalizedMeetingInput,
  allowLateRegister: boolean,
): MeetingFieldChange[] {
  const values: Record<string, unknown> = {
    meetingProjectName: next.meetingProjectName,
    meetingName: next.meetingName,
    meetingDate: next.meetingDate,
    startTime: next.startTime,
    endTime: next.endTime,
    meetingLocation: next.meetingLocation,
    internalMeetingName: next.internalMeetingName,
    externalMeetingName: existing.meetingType === "EXTERNAL" ? next.externalMeetingName : null,
    allowLateRegister,
  };

  return Object.entries(values).flatMap(([field, after]) => {
    const before = existing[field as keyof MeetingForEdit];
    if (displayValue(before) === displayValue(after)) return [];
    return [{ field, label: fieldLabels[field], before: displayValue(before), after: displayValue(after) }];
  });
}

export function validateMeetingEditPolicy({
  existing,
  next,
  requestedMeetingType,
  changes,
}: {
  existing: MeetingForEdit;
  next: NormalizedMeetingInput;
  requestedMeetingType: MeetingType;
  changes: MeetingFieldChange[];
}): { message: string; lockedFields: string[] } | null {
  if (requestedMeetingType !== existing.meetingType) {
    return {
      message: "ไม่สามารถเปลี่ยน Meeting Type หลังสร้างการประชุมได้ เพราะ QR และ Attendance ผูกกับประเภทเดิม",
      lockedFields: ["meetingType"],
    };
  }

  const changedFields = new Set(changes.map((change) => change.field));
  const attendanceCount = existing.attendances.length;
  const internalCount = existing.attendances.filter((row) => row.channel === "INTERNAL").length;
  const externalCount = existing.attendances.filter((row) => row.channel === "EXTERNAL").length;
  const changedSchedule = ["meetingDate", "startTime", "endTime"].filter((field) => changedFields.has(field));

  if (attendanceCount > 0 && changedSchedule.length > 0) {
    return {
      message: `ไม่สามารถแก้ไขวันหรือเวลาได้ เนื่องจากมี Attendance แล้ว ${attendanceCount} รายการ`,
      lockedFields: changedSchedule,
    };
  }
  if (internalCount > 0 && changedFields.has("internalMeetingName")) {
    return {
      message: `ไม่สามารถแก้ชื่อกลุ่มผู้ปฏิบัติงานได้ เนื่องจากมีผู้ปฏิบัติงานลงทะเบียนแล้ว ${internalCount} รายการ`,
      lockedFields: ["internalMeetingName"],
    };
  }
  if (externalCount > 0 && changedFields.has("externalMeetingName")) {
    return {
      message: `ไม่สามารถแก้รูปแบบหรือชื่อกลุ่มผู้ร่วมประชุมได้ เนื่องจากมีผู้ร่วมประชุมลงทะเบียนแล้ว ${externalCount} รายการ`,
      lockedFields: ["externalMeetingName", "externalGroupMode"],
    };
  }

  if (changedSchedule.length > 0) {
    const nextStart = new Date(`${next.meetingDate}T${next.startTime}:00+07:00`).getTime();
    if (!Number.isFinite(nextStart) || nextStart < Date.now()) {
      return {
        message: "ไม่สามารถเปลี่ยนวันและเวลาเริ่มประชุมเป็นเวลาย้อนหลังได้",
        lockedFields: changedSchedule,
      };
    }
  }
  return null;
}
