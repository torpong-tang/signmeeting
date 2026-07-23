"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  QrCode,
  Settings,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import "driver.js/dist/driver.css";
import { appOriginPath, appPath } from "@/lib/paths";
import type {
  Attendance,
  ConfigValues,
  GroupImageChannel,
  InternalPerson,
  Meeting,
  MeetingChangeLog,
  MeetingDocument,
  MeetingForm,
  MeetingPhoto,
  ParticipantGroup,
} from "@/components/signmeeting/types";
import { MeetingAttendancePanel } from "@/components/signmeeting/MeetingAttendancePanel";
import {
  InternalPeopleAdminContent,
  SettingsAdminContent,
} from "@/components/signmeeting/AdminModalContents";
import { MeetingFormFields } from "@/components/signmeeting/MeetingFormFields";
import {
  MeetingQrPanel,
  type QrItem,
} from "@/components/signmeeting/MeetingQrPanel";
import {
  MeetingTable,
  type MeetingSortKey,
} from "@/components/signmeeting/MeetingTable";
import { ParticipantDirectory } from "@/components/signmeeting/ParticipantDirectory";
import {
  buttonTone,
  compareValues,
  Field,
  formatThaiDate,
  formatTimeRange,
  getBangkokDateInput,
  iconButtonTone,
  includesQuery,
  inputBase,
  isPastMeetingTime,
  type SortDirection,
} from "@/components/signmeeting/ui";

const emptyForm: MeetingForm = {
  meetingProjectName: "",
  meetingName: "",
  meetingDate: getBangkokDateInput(),
  startTime: "09:00",
  endTime: "10:00",
  meetingLocation: "",
  meetingType: "EXTERNAL",
  internalMeetingName: "Smarterware",
  externalMeetingName: "",
  externalParticipantGroupId: null,
  externalGroupMode: "NAMED",
  allowLateRegister: false,
};

const emptyPerson = {
  fname: "",
  lname: "",
  department: "",
  position: "",
  email: "",
  phone: "",
};



function groupNameLabel(label: string, name?: string | null) {
  const clean = String(name ?? "").trim();
  return clean ? `${label} (${clean})` : label;
}

function getMeetingStartDate(form: Pick<MeetingForm, "meetingDate" | "startTime">) {
  return new Date(`${form.meetingDate}T${form.startTime || "00:00"}:00+07:00`);
}

function isEndTimeAfterStart(form: Pick<MeetingForm, "startTime" | "endTime">) {
  return Boolean(form.startTime && form.endTime && form.endTime > form.startTime);
}

function isRegistrationWindowClosed(form: Pick<MeetingForm, "meetingDate" | "startTime" | "allowLateRegister">, limitMinutes?: string) {
  const limit = Number.parseInt(limitMinutes ?? "15", 10) || 15;
  const deadline = new Date(getMeetingStartDate(form).getTime() + limit * 60 * 1000);
  return !form.allowLateRegister && Date.now() > deadline.getTime();
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
  widthClass = "max-w-4xl",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  zClass?: string;
  widthClass?: string;
}) {
  return (
    <div className={`fixed inset-0 ${zClass} flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm`}>
      <div className={`max-h-[92vh] w-full ${widthClass} overflow-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl`}>
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
      <p className="mb-5 whitespace-pre-line text-slate-200">{message}</p>
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
        <img alt="SignMeeting logo" className="mb-6 h-24 w-full rounded-xl object-contain" src={appPath("/logosignmeeting1.png")} />
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
  const [participantGroups, setParticipantGroups] = useState<ParticipantGroup[]>([]);
  const [personForm, setPersonForm] = useState(emptyPerson);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [adminModal, setAdminModal] = useState<"settings" | "people" | "participants" | null>(null);
  const [groupImageFiles, setGroupImageFiles] = useState<Partial<Record<GroupImageChannel, File>>>({});
  const [meetingChangeLogs, setMeetingChangeLogs] = useState<MeetingChangeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState("");
  const [confirm, setConfirm] = useState<{ message: string; action: () => void } | null>(null);
  const [openSections, setOpenSections] = useState({
    qr: true,
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
      progressText: "ขั้นที่ {{current}} / {{total}}",
      nextBtnText: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
      prevBtnText: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`,
      doneBtnText: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
      popoverClass: "sm-tour",
      steps: [
        {
          popover: {
            popoverClass: "sm-tour sm-tour-welcome",
            title: "👋 ยินดีต้อนรับสู่ SignMeeting",
            description: `
              <p class="sm-lead">ระบบลงทะเบียนเข้าร่วมประชุมด้วย QR Code ครบวงจร</p>
              <p>ทัวร์สั้น ๆ นี้จะพาคุณรู้จักทุกส่วนของหน้าผู้ดูแลระบบใน <b>7 ขั้นตอน</b> ใช้เวลาไม่ถึง 1 นาที</p>
              <ul class="sm-list">
                <li>🗂️ สร้างและจัดการการประชุม</li>
                <li>📱 สร้าง QR ให้ผู้เข้าร่วมสแกนลงทะเบียน</li>
                <li>📊 ติดตามและส่งออกรายชื่อเป็น Excel / PDF</li>
              </ul>
              <p class="sm-tip">💡 กดปุ่ม <b>Guided Tour</b> เมื่อไรก็ได้เพื่อดูทัวร์นี้อีกครั้ง</p>
            `,
          },
        },
        {
          element: "#summaryCards",
          popover: {
            popoverClass: "sm-tour sm-tour-cyan",
            title: "📊 ภาพรวมแบบเร็ว",
            description: `
              <p>การ์ดสรุปบอกสถานะระบบในพริบตา</p>
              <ul class="sm-list">
                <li><span class="sm-chip sm-chip-cyan">Meetings</span> จำนวนการประชุมทั้งหมดในระบบ</li>
                <li><span class="sm-chip sm-chip-emerald">Attendance</span> ยอดผู้เข้าร่วมรวมทุกการประชุม</li>
              </ul>
              <p class="sm-tip">ตัวเลขอัปเดตอัตโนมัติทุกครั้งที่มีคนลงทะเบียนใหม่</p>
            `,
          },
        },
        {
          element: "#createMeetingButton",
          popover: {
            popoverClass: "sm-tour sm-tour-amber",
            title: "➕ สร้างการประชุมใหม่",
            description: `
              <p>เริ่มต้นที่นี่ ระบบจะออก <b>Meeting ID</b> และสร้าง <b>QR Code</b> ให้อัตโนมัติ</p>
              <ul class="sm-list">
                <li>📝 กรอกชื่อโครงการ ชื่อการประชุม วัน-เวลา และสถานที่</li>
                <li>🔀 เลือกประเภท <b>ผู้ปฏิบัติงาน</b> หรือ <b>ผู้ร่วมประชุม</b></li>
                <li>⏱️ เปิด/ปิดการลงทะเบียนล่าช้าได้</li>
              </ul>
            `,
          },
        },
        {
          element: "#meetingsTable",
          popover: {
            popoverClass: "sm-tour sm-tour-violet",
            title: "🗂️ ตารางการประชุม",
            description: `
              <p>ศูนย์รวมการจัดการการประชุมทั้งหมด</p>
              <ul class="sm-list">
                <li>🔎 <b>ค้นหาสด</b> และคลิกหัวคอลัมน์เพื่อ <b>จัดเรียง</b></li>
                <li>👆 คลิกแถวเพื่อ <b>เลือก</b> ดู QR และรายชื่อด้านล่าง</li>
                <li>✏️ <b>แก้ไข</b> · 🗑️ <b>ลบ</b> · 🔁 <b>เรียกซ้ำ</b> การประชุมเดิม</li>
              </ul>
            `,
          },
        },
        {
          element: "#qrAttendanceSection",
          popover: {
            popoverClass: "sm-tour sm-tour-emerald",
            title: "📱 QR Code & รายชื่อผู้เข้าร่วม",
            description: `
              <p>หัวใจของระบบ — ฉายให้ผู้เข้าร่วมสแกนลงทะเบียนได้ทันที</p>
              <ul class="sm-list">
                <li>🖼️ แสดง QR แยกช่องทาง <b>ผู้ปฏิบัติงาน / ผู้ร่วมประชุม</b></li>
                <li>🔄 ปุ่ม Refresh เพื่อดึงรายชื่อล่าสุด</li>
                <li>📥 ส่งออกเป็น <b>Excel</b> หรือ <b>PDF</b> (ฟอนต์ไทยราชการ)</li>
              </ul>
            `,
          },
        },
        {
          element: "#settingsSection",
          popover: {
            popoverClass: "sm-tour sm-tour-rose",
            title: "⚙️ ตั้งค่าระบบ",
            description: `
              <p>ปรับพฤติกรรมการลงทะเบียนให้เหมาะกับงานของคุณ</p>
              <ul class="sm-list">
                <li>🔢 กำหนด <b>running number</b> เริ่มต้นของ Meeting ID</li>
                <li>⏰ ตั้ง <b>เวลาปิดรับลงทะเบียน</b> หลังเริ่มประชุม</li>
              </ul>
            `,
          },
        },
        {
          element: "#personnelSection",
          popover: {
            popoverClass: "sm-tour sm-tour-indigo",
            title: "👥 ผู้ปฏิบัติงาน",
            description: `
              <p>จัดการทะเบียนรายชื่อผู้ปฏิบัติงานไว้ล่วงหน้า</p>
              <ul class="sm-list">
                <li>➕ เพิ่ม/แก้ไขชื่อ หน่วยงาน ตำแหน่ง E-mail และโทรศัพท์</li>
                <li>⚡ ผู้เข้าร่วมเลือกชื่อจาก <b>dropdown</b> ได้เลย ไม่ต้องพิมพ์เอง</li>
              </ul>
              <p class="sm-tip">🎯 จบแล้ว! พร้อมเริ่มสร้างการประชุมแรกของคุณหรือยัง?</p>
            `,
          },
        },
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
      const response = await fetch(appPath("/api/meetings"));
      const data = (await response.json()) as Meeting[];
      setMeetings(data);
      if (!selectedId && data[0]) setSelectedId(data[0].meetingId);
    } finally {
      setLoading(false);
    }
  }

  async function loadSettings() {
    const [configResponse, peopleResponse, participantGroupsResponse] = await Promise.all([
      fetch(appPath("/api/config")),
      fetch(appPath("/api/internal-people")),
      fetch(appPath("/api/participant-groups")),
    ]);
    setConfig((await configResponse.json()) as ConfigValues);
    setPeople((await peopleResponse.json()) as InternalPerson[]);
    if (participantGroupsResponse.ok) {
      setParticipantGroups((await participantGroupsResponse.json()) as ParticipantGroup[]);
    }
  }

  // Determine login state from the server session cookie (no more trusting a
  // client-side localStorage flag).
  useEffect(() => {
    fetch(appPath("/api/auth/session"))
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
    setGroupImageFiles({});
    setMeetingChangeLogs([]);
    setMeetingModalOpen(true);
  }

  function repeatMeeting(meeting: Meeting) {
    setEditingId(null);
    setForm({
      meetingProjectName: meeting.meetingProjectName,
      meetingName: meeting.meetingName,
      meetingDate: getBangkokDateInput(),
      startTime: "09:00",
      endTime: "10:00",
      meetingLocation: meeting.meetingLocation,
      meetingType: meeting.meetingType,
      internalMeetingName: meeting.internalMeetingName || "Smarterware",
      externalMeetingName: meeting.externalMeetingName || "",
      externalParticipantGroupId: meeting.externalParticipantGroupId,
      externalGroupMode: meeting.externalMeetingName?.trim() ? "NAMED" : "OPEN",
      allowLateRegister: false,
    });
    setGroupImageFiles({});
    setMeetingChangeLogs([]);
    setMeetingModalOpen(true);
  }

  async function startEdit(meeting: Meeting) {
    setEditingId(meeting.meetingId);
    setForm({
      meetingProjectName: meeting.meetingProjectName,
      meetingName: meeting.meetingName,
      meetingDate: meeting.meetingDate,
      startTime: meeting.startTime,
      endTime: meeting.endTime || "10:00",
      meetingLocation: meeting.meetingLocation,
      meetingType: meeting.meetingType,
      internalMeetingName: meeting.internalMeetingName || "Smarterware",
      externalMeetingName: meeting.externalMeetingName || "",
      externalParticipantGroupId: meeting.externalParticipantGroupId,
      externalGroupMode: meeting.externalMeetingName?.trim() ? "NAMED" : "OPEN",
      allowLateRegister: meeting.allowLateRegister,
    });
    setGroupImageFiles({});
    setMeetingChangeLogs([]);
    setMeetingModalOpen(true);
    setLoading(true);
    try {
      const response = await fetch(appPath(`/api/meetings/${meeting.meetingId}/changes`));
      if (!response.ok) throw new Error("โหลดประวัติการแก้ไขไม่สำเร็จ");
      setMeetingChangeLogs((await response.json()) as MeetingChangeLog[]);
    } catch (error) {
      setAlert(error instanceof Error ? error.message : "โหลดประวัติการแก้ไขไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  function closeMeetingModal() {
    setMeetingModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setGroupImageFiles({});
    setMeetingChangeLogs([]);
  }

  function setGroupImageFile(channel: GroupImageChannel, file: File | null) {
    if (file && !file.type.startsWith("image/")) {
      setAlert("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }
    if (file && file.size > 2 * 1024 * 1024) {
      setAlert("รูปประจำกลุ่มต้องมีขนาดไม่เกิน 2 MB");
      return;
    }
    setGroupImageFiles((current) => {
      const next = { ...current };
      if (file) next[channel] = file;
      else delete next[channel];
      return next;
    });
  }

  async function saveMeeting() {
    const editingMeeting = editingId
      ? meetings.find((meeting) => meeting.meetingId === editingId)
      : undefined;
    if (!form.meetingProjectName || !form.meetingName || !form.meetingDate || !form.startTime || !form.endTime || !form.meetingLocation || !form.meetingType || !form.internalMeetingName) {
      setAlert("กรุณากรอกข้อมูลการประชุมให้ครบทุก Field");
      return;
    }
    if (form.meetingType === "EXTERNAL" && form.externalGroupMode === "NAMED" && !form.externalMeetingName.trim()) {
      setAlert("กรุณาเลือกชื่อกลุ่มผู้ร่วมประชุม หรือเลือกไม่ระบุชื่อกลุ่มผู้ร่วมประชุม");
      return;
    }
    const isUnchangedLegacyNamedGroup =
      Boolean(editingMeeting) &&
      editingMeeting?.externalParticipantGroupId == null &&
      Boolean(editingMeeting?.externalMeetingName?.trim()) &&
      editingMeeting?.externalMeetingName?.trim() === form.externalMeetingName.trim();
    if (
      form.meetingType === "EXTERNAL" &&
      form.externalGroupMode === "NAMED" &&
      !form.externalParticipantGroupId &&
      !isUnchangedLegacyNamedGroup
    ) {
      setAlert("กรุณาเลือกชื่อกลุ่มผู้ร่วมประชุมจาก Master Data");
      return;
    }
    if (!isEndTimeAfterStart(form)) {
      setAlert("End Time ต้องมากกว่า Start Time");
      return;
    }
    if (!editingId && isPastMeetingTime(form)) {
      setAlert("ไม่สามารถเลือกวันและเวลาย้อนหลังได้");
      return;
    }

    const normalizedExternalName =
      form.meetingType === "EXTERNAL" && form.externalGroupMode === "NAMED"
        ? form.externalMeetingName.trim()
        : "";
    const changedLabels = editingMeeting
      ? [
          ["Project Name", editingMeeting.meetingProjectName, form.meetingProjectName.trim()],
          ["Meeting Name", editingMeeting.meetingName, form.meetingName.trim()],
          ["Meeting Date", editingMeeting.meetingDate, form.meetingDate],
          ["Start Time", editingMeeting.startTime, form.startTime],
          ["End Time", editingMeeting.endTime, form.endTime],
          ["Location", editingMeeting.meetingLocation, form.meetingLocation.trim()],
          ["ชื่อกลุ่มผู้ปฏิบัติงาน", editingMeeting.internalMeetingName, form.internalMeetingName.trim()],
          ["ชื่อกลุ่มผู้ร่วมประชุม", editingMeeting.externalMeetingName ?? "", normalizedExternalName],
          ["Allow late registration", editingMeeting.allowLateRegister, form.allowLateRegister],
        ].filter(([, before, after]) => String(before) !== String(after)).map(([label]) => String(label))
      : [];
    if (groupImageFiles.internal) changedLabels.push("รูปกลุ่มผู้ปฏิบัติงาน");
    if (groupImageFiles.external) changedLabels.push("รูปกลุ่มผู้ร่วมประชุม");
    if (editingId && changedLabels.length === 0) {
      setAlert(`ไม่มีข้อมูลที่เปลี่ยนแปลงใน ${editingId}`);
      return;
    }
    const confirmationMessage = editingId
      ? `ยืนยันการแก้ไข ${editingId}?\nรายการที่เปลี่ยน: ${changedLabels.join(", ")}\nระบบจะบันทึกผู้แก้ไข วันเวลา และค่าเดิม/ค่าใหม่ใน Change Log`
      : "ยืนยันการสร้างการประชุมใหม่?";

    setConfirm({
      message: confirmationMessage,
      action: async () => {
        setConfirm(null);
        setLoading(true);
        try {
          const response = await fetch(appPath(editingId ? `/api/meetings/${editingId}` : "/api/meetings"), {
            method: editingId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...form,
              externalMeetingName: normalizedExternalName,
              externalParticipantGroupId:
                form.meetingType === "EXTERNAL" && form.externalGroupMode === "NAMED"
                  ? form.externalParticipantGroupId
                  : null,
              expectedUpdatedAt: editingMeeting?.updatedAt,
            }),
          });
          if (!response.ok) {
            const result = (await response.json().catch(() => ({}))) as { message?: string };
            throw new Error(result.message ?? "บันทึกการประชุมไม่สำเร็จ");
          }
          const saved = (await response.json()) as Meeting;
          const uploadTasks: Array<{ label: string; channel: "internal" | "external"; file: File }> = [];
          if (groupImageFiles.internal) {
            uploadTasks.push({
              label: "รูปกลุ่มผู้ปฏิบัติงาน",
              channel: "internal",
              file: groupImageFiles.internal,
            });
          }
          if (saved.meetingType === "EXTERNAL" && groupImageFiles.external) {
            uploadTasks.push({
              label: "รูปกลุ่มผู้ร่วมประชุม",
              channel: "external",
              file: groupImageFiles.external,
            });
          }
          const failedUploads: string[] = [];
          for (const upload of uploadTasks) {
            try {
              await uploadMeetingGroupImage(saved.meetingId, upload.channel, upload.file);
            } catch {
              failedUploads.push(upload.label);
            }
          }
          closeMeetingModal();
          await loadMeetings();
          setSelectedId(saved.meetingId);
          setAlert(
            failedUploads.length > 0
              ? `บันทึกข้อมูล ${saved.meetingId} สำเร็จ แต่ Upload ${failedUploads.join(", ")} ไม่สำเร็จ กรุณาเปิดแก้ไขแล้วลองใหม่`
              : editingId
                ? `บันทึกการแก้ไข ${saved.meetingId} แล้ว${uploadTasks.length ? " พร้อมรูปประจำกลุ่ม" : ""}`
                : `สร้าง ${saved.meetingId} สำเร็จ${uploadTasks.length ? " พร้อมรูปประจำกลุ่ม" : ""}`,
          );
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
      const response = await fetch(appPath(`/api/meetings/${meetingId}/photos`), {
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

  async function uploadMeetingDocuments(meetingId: string, files: FileList | null) {
    if (!files?.length) return;
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));
    setLoading(true);
    try {
      const response = await fetch(appPath(`/api/meetings/${meetingId}/documents`), {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(result.message ?? "Upload เอกสารไม่สำเร็จ");
      }
      await loadMeetings();
      setAlert("แนบเอกสารประกอบการประชุมเรียบร้อยแล้ว");
    } catch (error) {
      setAlert(error instanceof Error ? error.message : "Upload เอกสารไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function uploadMeetingGroupImage(meetingId: string, channel: GroupImageChannel, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(appPath(`/api/meetings/${meetingId}/group-images/${channel}`), {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(result.message ?? "Upload รูปประจำกลุ่มไม่สำเร็จ");
    }
  }

  function deleteMeetingGroupImage(meeting: Meeting | undefined, channel: GroupImageChannel) {
    if (!meeting) return;
    const label = channel === "internal" ? "ผู้ปฏิบัติงาน" : "ผู้ร่วมประชุม";
    setConfirm({
      message: `ยืนยันการลบรูปประจำกลุ่ม${label} ของ ${meeting.meetingId}?`,
      action: async () => {
        setConfirm(null);
        setLoading(true);
        try {
          const response = await fetch(appPath(`/api/meetings/${meeting.meetingId}/group-images/${channel}`), { method: "DELETE" });
          if (!response.ok) {
            const result = (await response.json().catch(() => ({}))) as { message?: string };
            throw new Error(result.message ?? "ลบรูปประจำกลุ่มไม่สำเร็จ");
          }
          await loadMeetings();
          setAlert("ลบรูปประจำกลุ่มเรียบร้อยแล้ว");
        } catch (error) {
          setAlert(error instanceof Error ? error.message : "ลบรูปประจำกลุ่มไม่สำเร็จ");
        } finally {
          setLoading(false);
        }
      },
    });
  }

  function deleteMeetingPhoto(meetingId: string, photo: MeetingPhoto) {
    setConfirm({
      message: `ยืนยันการลบรูป ${photo.filename}?`,
      action: async () => {
        setConfirm(null);
        setLoading(true);
        try {
          await fetch(appPath(`/api/meetings/${meetingId}/photos/${photo.id}`), { method: "DELETE" });
          await loadMeetings();
          setAlert("ลบรูปเรียบร้อยแล้ว");
        } finally {
          setLoading(false);
        }
      },
    });
  }

  function deleteMeetingDocument(meetingId: string, document: MeetingDocument) {
    setConfirm({
      message: `ยืนยันการลบเอกสาร ${document.filename} ออกจากการประชุม ${meetingId}?`,
      action: async () => {
        setConfirm(null);
        setLoading(true);
        try {
          const response = await fetch(
            appPath(`/api/meetings/${meetingId}/documents/${document.id}`),
            { method: "DELETE" },
          );
          if (!response.ok) {
            const result = (await response.json().catch(() => ({}))) as { message?: string };
            throw new Error(result.message ?? "ลบเอกสารไม่สำเร็จ");
          }
          await loadMeetings();
          setAlert("ลบเอกสารประกอบการประชุมเรียบร้อยแล้ว");
        } catch (error) {
          setAlert(error instanceof Error ? error.message : "ลบเอกสารไม่สำเร็จ");
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
          const response = await fetch(appPath("/api/config"), {
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
      email: person.email ?? "",
      phone: person.phone ?? "",
    });
  }

  async function savePerson() {
    if (!personForm.fname || !personForm.lname || !personForm.position) {
      setAlert("กรุณากรอกข้อมูลผู้ปฏิบัติงานให้ครบถ้วน");
      return;
    }
    if (personForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personForm.email.trim())) {
      setAlert("กรุณากรอก E-mail ให้ถูกต้อง");
      return;
    }

    setConfirm({
      message: editingPersonId ? `ยืนยันการแก้ไขผู้ปฏิบัติงาน #${editingPersonId}?` : "ยืนยันการเพิ่มผู้ปฏิบัติงาน?",
      action: async () => {
        setConfirm(null);
        setLoading(true);
        try {
          await fetch(appPath(editingPersonId ? `/api/internal-people/${editingPersonId}` : "/api/internal-people"), {
            method: editingPersonId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(personForm),
          });
          setPersonForm(emptyPerson);
          setEditingPersonId(null);
          await loadSettings();
          setAlert(editingPersonId ? "แก้ไขผู้ปฏิบัติงานเรียบร้อยแล้ว" : "เพิ่มผู้ปฏิบัติงานเรียบร้อยแล้ว");
        } finally {
          setLoading(false);
        }
      },
    });
  }

  function deletePerson(person: InternalPerson) {
    setConfirm({
      message: `ยืนยันการลบผู้ปฏิบัติงาน ${person.fname} ${person.lname}?`,
      action: async () => {
        setConfirm(null);
        setLoading(true);
        try {
          await fetch(appPath(`/api/internal-people/${person.intPid}`), { method: "DELETE" });
          if (editingPersonId === person.intPid) {
            setEditingPersonId(null);
            setPersonForm(emptyPerson);
          }
          await loadSettings();
          setAlert("ลบผู้ปฏิบัติงานเรียบร้อยแล้ว");
        } finally {
          setLoading(false);
        }
      },
    });
  }

  function deleteAttendance(attendance: Attendance) {
    setConfirm({
      message: `ยืนยันการลบ Attendance ลำดับ ${attendance.personNo} - ${attendance.fname} ${attendance.lname}?`,
      action: async () => {
        setConfirm(null);
        setLoading(true);
        try {
          const response = await fetch(
            appPath(`/api/meetings/${attendance.meetingId}/attendance/${attendance.id}`),
            { method: "DELETE" },
          );
          if (!response.ok) {
            const result = (await response.json().catch(() => ({}))) as { message?: string };
            throw new Error(result.message ?? "ไม่สามารถลบ Attendance ได้");
          }
          await loadMeetings();
          setAlert(`ลบ Attendance ลำดับ ${attendance.personNo} เรียบร้อยแล้ว`);
        } catch (error) {
          setAlert(error instanceof Error ? error.message : "ไม่สามารถลบ Attendance ได้");
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
          await fetch(appPath(`/api/meetings/${meeting.meetingId}`), { method: "DELETE" });
          setAlert(`ลบ ${meeting.meetingId} แล้ว`);
          setSelectedId("");
          await loadMeetings();
        } finally {
          setLoading(false);
        }
      },
    });
  }

  function downloadExport(meeting: Meeting, kind: "excel" | "pdf" | "pdfPortrait") {
    // Both the styled A4 workbook and the A4 PDF are generated server-side and
    // streamed back as a direct download.
    const extension = kind === "excel" ? "xlsx" : "pdf";
    const endpoint = kind === "excel" ? "export" : `export-pdf${kind === "pdfPortrait" ? "?layout=portrait" : ""}`;
    const filenameSuffix = kind === "pdfPortrait" ? "-portrait" : "";
    const link = document.createElement("a");
    link.href = appPath(`/api/meetings/${meeting.meetingId}/${endpoint}`);
    link.download = `${meeting.meetingId}-attendance${filenameSuffix}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    const exportLabel = kind === "excel" ? "Excel" : kind === "pdfPortrait" ? "PDF แนวตั้ง" : "PDF แนวนอน";
    setAlert(`Export ${exportLabel} ของ ${meeting.meetingId} แล้ว`);
  }

  const totalAttendance = meetings.reduce((sum, meeting) => sum + meeting.attendances.length, 0);
  const selectedQrItems = useMemo(() => {
    if (!selected) return [];
    const registerUrl = (token: string | null, channel: "internal" | "external", fallback: string | null) =>
      token && origin ? appOriginPath(origin, `/register/${token}/${channel}`) : fallback;
    const items: QrItem[] = [];
    const intUrl = registerUrl(selected.qrTokenInt, "internal", selected.qrUrlInt);
    if (intUrl) {
      const groupName = String(selected.internalMeetingName ?? "").trim();
      const groupImageUrl =
        selected.internalGroupImageFilename && origin
          ? appOriginPath(origin, `/api/meetings/${selected.meetingId}/group-images/internal`)
          : undefined;
      items.push({
        title: groupNameLabel("สำหรับบริษัทฯ", groupName),
        label: "สำหรับบริษัทฯ",
        groupName,
        groupImageUrl,
        url: intUrl,
      });
    }
    const extUrl = registerUrl(selected.qrTokenExt, "external", selected.qrUrlExt);
    if (selected.meetingType === "EXTERNAL" && extUrl) {
      const groupName = String(selected.externalMeetingName ?? "").trim();
      const groupImageUrl =
        selected.externalGroupImageFilename && origin
          ? appOriginPath(origin, `/api/meetings/${selected.meetingId}/group-images/external`)
          : undefined;
      items.push({
        title: groupNameLabel("สำหรับผู้ร่วมประชุม", groupName),
        label: "สำหรับผู้ร่วมประชุม",
        groupName,
        groupImageUrl,
        url: extUrl,
      });
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
          meeting.endTime,
          meeting.meetingLocation,
          meeting.meetingType,
          meeting.internalMeetingName,
          meeting.externalMeetingName,
        ],
        meetingSearch,
      ),
    );
    const sorted = [...filtered].sort((a, b) => {
      const value = (meeting: Meeting) => {
        if (meetingSort.key === "attendances") return meeting.attendances.length;
        if (meetingSort.key === "meetingDate") return `${meeting.meetingDate} ${meeting.startTime} ${meeting.endTime ?? ""}`;
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
            const response = await fetch(appPath("/api/auth/login"), {
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
            changeLogs={meetingChangeLogs}
            onCancel={closeMeetingModal}
            onChange={setForm}
            onDeleteGroupImage={(channel) => deleteMeetingGroupImage(meetings.find((meeting) => meeting.meetingId === editingId), channel)}
            onDeleteDocument={deleteMeetingDocument}
            onDeletePhoto={deleteMeetingPhoto}
            onGroupImageFileChange={setGroupImageFile}
            onSave={saveMeeting}
            onUploadDocuments={uploadMeetingDocuments}
            onUploadPhotos={uploadMeetingPhotos}
            documents={meetings.find((meeting) => meeting.meetingId === editingId)?.documents ?? []}
            groupImageFiles={groupImageFiles}
            meeting={meetings.find((meeting) => meeting.meetingId === editingId)}
            participantGroups={participantGroups}
            photos={meetings.find((meeting) => meeting.meetingId === editingId)?.photos ?? []}
            registrationClosed={isRegistrationWindowClosed(form, config.close_time)}
          />
        </Modal>
      )}
      {adminModal === "settings" && (
        <Modal title="Settings" onClose={() => setAdminModal(null)}>
          <SettingsAdminContent
            config={config}
            onChange={setConfig}
            onClose={() => setAdminModal(null)}
            onSave={saveConfig}
          />
        </Modal>
      )}
      {adminModal === "people" && (
        <Modal title="ผู้ปฏิบัติงาน" widthClass="max-w-7xl" onClose={() => setAdminModal(null)}>
          <InternalPeopleAdminContent
            editingPersonId={editingPersonId}
            form={personForm}
            onChange={setPersonForm}
            onDelete={deletePerson}
            onEdit={startEditPerson}
            onReset={() => {
              setEditingPersonId(null);
              setPersonForm(emptyPerson);
            }}
            onSave={savePerson}
            people={people}
          />
        </Modal>
      )}
      {adminModal === "participants" && (
        <Modal
          title="กลุ่มผู้ร่วมประชุม"
          widthClass="max-w-7xl"
          onClose={() => {
            setAdminModal(null);
            void loadSettings();
          }}
        >
          <ParticipantDirectory
            onConfirm={(message, action) => {
              setConfirm({
                message,
                action: () => {
                  setConfirm(null);
                  void action();
                },
              });
            }}
            onLoading={setLoading}
            onNotify={setAlert}
          />
        </Modal>
      )}

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
        <header className="flex flex-col gap-4 border-b border-slate-700 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="SignMeeting" className="h-20 w-auto rounded-xl object-contain md:h-24" src={appPath("/logosignmeeting1.png")} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              id="guidedTourButton"
              aria-label="Guided Tour"
              className={iconButtonTone("preview")}
              onClick={startAdminTour}
              title="Guided Tour"
              type="button"
            >
              <ShieldCheck className="h-5 w-5" />
            </button>
            <button
              aria-label="Settings"
              className={iconButtonTone("pdf")}
              onClick={() => setAdminModal("settings")}
              title="Settings"
              type="button"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              aria-label="ผู้ปฏิบัติงาน"
              className={iconButtonTone("excel")}
              onClick={() => setAdminModal("people")}
              title="ผู้ปฏิบัติงาน"
              type="button"
            >
              <Users className="h-5 w-5" />
            </button>
            <button
              aria-label="กลุ่มผู้ร่วมประชุม"
              className={iconButtonTone("edit")}
              onClick={() => setAdminModal("participants")}
              title="กำหนดกลุ่มผู้ร่วมประชุมและรายชื่อ"
              type="button"
            >
              <UserPlus className="h-5 w-5" />
            </button>
            <button
              aria-label="Logout"
              className={iconButtonTone("muted")}
              onClick={async () => {
                await fetch(appPath("/api/auth/logout"), { method: "POST" }).catch(() => {});
                setIsAdmin(false);
              }}
              title="Logout"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <section id="summaryCards" className="grid gap-4 md:grid-cols-2">
          <SummaryCard icon={<ClipboardList />} label="Meetings" value={meetings.length} tone="cyan" />
          <SummaryCard icon={<Users />} label="Attendance" value={totalAttendance} tone="emerald" />
        </section>

        <MeetingTable
          meetings={pagedMeetings}
          onCreate={startCreate}
          onDelete={deleteMeeting}
          onEdit={startEdit}
          onPageChange={setMeetingPage}
          onPageSizeChange={setMeetingPageSize}
          onRefresh={loadMeetings}
          onRepeat={repeatMeeting}
          onSearchChange={(value) => {
            setMeetingSearch(value);
            setMeetingPage(1);
          }}
          onSelect={setSelectedId}
          onSort={toggleMeetingSort}
          page={meetingPage}
          pageSize={meetingPageSize}
          search={meetingSearch}
          selectedMeetingId={selected?.meetingId}
          total={visibleMeetings.length}
        />

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
                <p>{formatThaiDate(selected.meetingDate)} เวลา {formatTimeRange(selected.startTime, selected.endTime)}</p>
                <p>
                  {selected.meetingType === "INTERNAL"
                    ? groupNameLabel("สำหรับบริษัทฯ", selected.internalMeetingName)
                    : `${groupNameLabel("สำหรับบริษัทฯ", selected.internalMeetingName)} / ${groupNameLabel("สำหรับผู้ร่วมประชุม", selected.externalMeetingName)}`}
                </p>
              </div>
            </div>

            <MeetingQrPanel items={selectedQrItems} meeting={selected} />

            <MeetingAttendancePanel
              meeting={selected}
              meetings={meetings}
              onDelete={deleteAttendance}
              onExport={downloadExport}
              onRefresh={loadMeetings}
              onSelect={setSelectedId}
            />
          </AccordionSection>
        )}

        <footer className="py-4 text-center text-sm text-slate-400">© 2026 TPT Team • Version 1.0</footer>
      </section>
    </main>
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
