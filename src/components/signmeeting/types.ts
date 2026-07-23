export type MeetingType = "INTERNAL" | "EXTERNAL";
export type AttendanceType = "INTERNAL" | "EXTERNAL";
export type GroupImageChannel = "internal" | "external";

export type Attendance = {
  id: string;
  personNo: number;
  meetingId: string;
  channel: AttendanceType;
  intPid: number | null;
  participantId: number | null;
  fname: string;
  lname: string;
  department: string;
  position: string;
  email: string | null;
  phone: string | null;
  signaturePath: string | null;
  timestamp: string;
};

export type InternalPerson = {
  intPid: number;
  fname: string;
  lname: string;
  department: string;
  position: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
};

export type ParticipantPerson = {
  participantId: number;
  groupId: number;
  fname: string;
  lname: string;
  position: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
};

export type ParticipantGroup = {
  groupId: number;
  name: string;
  isActive: boolean;
  people: ParticipantPerson[];
};

export type MeetingPhoto = {
  id: string;
  meetingId: string;
  filename: string;
  mimeType: string;
  size: number;
  data?: string;
  createdAt: string;
};

export type MeetingDocument = {
  id: string;
  meetingId: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type MeetingFieldChange = {
  field: string;
  label: string;
  before: string;
  after: string;
};

export type MeetingChangeLog = {
  id: string;
  meetingId: string;
  changedBy: string;
  createdAt: string;
  changes: MeetingFieldChange[];
};

export type Meeting = {
  id: string;
  meetingId: string;
  meetingProjectName: string;
  meetingName: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  meetingLocation: string;
  meetingType: MeetingType;
  internalMeetingName: string;
  externalMeetingName: string | null;
  externalParticipantGroupId: number | null;
  internalGroupImageFilename: string | null;
  internalGroupImageMime: string | null;
  internalGroupImageSize: number | null;
  externalGroupImageFilename: string | null;
  externalGroupImageMime: string | null;
  externalGroupImageSize: number | null;
  allowLateRegister: boolean;
  qrTokenInt: string | null;
  qrTokenExt: string | null;
  qrUrlInt: string | null;
  qrUrlExt: string | null;
  createdAt: string;
  updatedAt: string;
  attendances: Attendance[];
  photos: MeetingPhoto[];
  documents: MeetingDocument[];
};

export type ConfigValues = {
  meeting_running?: string;
  close_time?: string;
};

export type MeetingForm = {
  meetingProjectName: string;
  meetingName: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  meetingLocation: string;
  meetingType: MeetingType;
  internalMeetingName: string;
  externalMeetingName: string;
  externalParticipantGroupId: number | null;
  externalGroupMode: "NAMED" | "OPEN";
  allowLateRegister: boolean;
};
