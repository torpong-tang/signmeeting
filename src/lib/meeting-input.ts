type NormalizeOptions = {
  rejectPast?: boolean;
};

export type NormalizedMeetingInput = {
  meetingProjectName: string;
  meetingName: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  meetingLocation: string;
  meetingType: string;
  internalMeetingName: string;
  externalMeetingName: string;
};

function defaultEndTime(startTime: string) {
  const [hourText, minuteText] = startTime.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";

  const date = new Date(Date.UTC(2000, 0, 1, hour, minute));
  date.setUTCHours(date.getUTCHours() + 1);
  if (date.getUTCDate() !== 1) return "23:59";
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function isValidMeetingDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function normalizeMeetingInput(
  body: Record<string, unknown>,
  options: NormalizeOptions = {},
): NormalizedMeetingInput | { error: string } {
  const meetingProjectName = String(body.meetingProjectName ?? "").trim();
  const meetingName = String(body.meetingName ?? "").trim();
  const meetingDate = String(body.meetingDate ?? "").trim();
  const startTime = String(body.startTime ?? "").trim();
  const endTime = String(body.endTime ?? "").trim() || defaultEndTime(startTime);
  const meetingLocation = String(body.meetingLocation ?? "").trim();
  const meetingType = String(body.meetingType ?? "EXTERNAL");
  const internalMeetingName = String(body.internalMeetingName ?? "Smarterware").trim() || "Smarterware";
  const externalMeetingName = String(body.externalMeetingName ?? "").trim();

  if (!meetingProjectName || !meetingName || !meetingDate || !startTime || !endTime || !meetingLocation) {
    return { error: "All meeting fields are required." };
  }
  if (!isValidMeetingDate(meetingDate)) {
    return { error: "Meeting Date is invalid." };
  }
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
    return { error: "Meeting time is invalid." };
  }
  if (meetingType !== "INTERNAL" && meetingType !== "EXTERNAL") {
    return { error: "Meeting Type is invalid." };
  }
  if (endTime <= startTime) {
    return { error: "End Time must be later than Start Time." };
  }
  if (options.rejectPast && new Date(`${meetingDate}T${startTime}:00+07:00`).getTime() < Date.now()) {
    return { error: "Meeting date and time cannot be in the past." };
  }

  return {
    meetingProjectName,
    meetingName,
    meetingDate,
    startTime,
    endTime,
    meetingLocation,
    meetingType,
    internalMeetingName,
    externalMeetingName,
  };
}
