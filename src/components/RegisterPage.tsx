"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Save,
  Search,
  Users,
  X,
} from "lucide-react";

type Channel = "internal" | "external";

type Meeting = {
  meetingId: string;
  meetingProjectName: string;
  meetingName: string;
  meetingDate: string;
  startTime: string;
  meetingLocation: string;
  meetingType: "INTERNAL" | "EXTERNAL";
  attendances?: { intPid: number | null }[];
};

type RegisterPayload = {
  meeting: Meeting;
  channel: "INTERNAL" | "EXTERNAL";
  limitMinutes: number;
  deadline: string;
  isClosed: boolean;
};

type Person = {
  intPid: number;
  fname: string;
  lname: string;
  department: string;
  position: string;
};

const inputBase =
  "min-h-12 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:text-slate-400";
const buttonBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 py-2 font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

function formatThaiDate(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year + 543}`;
}

function formatTime24(value: string) {
  if (!value) return "-";
  return value.slice(0, 5);
}

// Searchable single-control dropdown for picking internal personnel: type to
// filter the list live, click to select (replaces the separate search box +
// native <select>).
function PersonCombobox({
  people,
  selectedId,
  onSelect,
}: {
  people: Person[];
  selectedId: string;
  onSelect: (person: Person | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const keyword = query.trim().toLowerCase();
  const filtered = keyword
    ? people.filter((person) =>
        `${person.fname} ${person.lname} ${person.department} ${person.position}`.toLowerCase().includes(keyword),
      )
    : people;

  return (
    <div ref={containerRef} className="relative">
      <label className="relative block">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          className={`${inputBase} pl-10`}
          placeholder="พิมพ์เพื่อค้นหาและเลือกบุคลากร..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (selectedId) onSelect(null);
          }}
          onFocus={() => setOpen(true)}
        />
      </label>
      {open && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-sm font-normal text-slate-400">ไม่พบรายชื่อ</li>
          ) : (
            filtered.map((person) => (
              <li key={person.intPid}>
                <button
                  type="button"
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition hover:bg-slate-800 ${
                    String(person.intPid) === selectedId ? "bg-emerald-500/15" : ""
                  }`}
                  onClick={() => {
                    onSelect(person);
                    setQuery(`${person.fname} ${person.lname}`);
                    setOpen(false);
                  }}
                >
                  <span className="font-semibold text-white">
                    {person.fname} {person.lname}
                  </span>
                  <span className="text-xs font-normal text-slate-400">
                    {person.department} • {person.position}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function RegisterPage({ meetingId, channel }: { meetingId: string; channel: Channel }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [registeredIntPids, setRegisteredIntPids] = useState<number[]>([]);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [comboboxKey, setComboboxKey] = useState(0);
  const [form, setForm] = useState({
    fname: "",
    lname: "",
    department: "",
    position: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<{ message: string; mode: "close" | "continue" } | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [closedMessage, setClosedMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [meetingResponse, peopleResponse] = await Promise.all([
          fetch(`/api/register/${meetingId}/${channel}`),
          fetch("/api/internal-people"),
        ]);
        if (!meetingResponse.ok) throw new Error("Meeting not found");
        const registerData = (await meetingResponse.json()) as RegisterPayload;
        setMeeting(registerData.meeting);
        setRegisteredIntPids(
          (registerData.meeting.attendances ?? [])
            .map((attendance) => attendance.intPid)
            .filter((intPid): intPid is number => intPid != null),
        );
        setIsClosed(registerData.isClosed);
        setClosedMessage(`หมดเวลาลงทะเบียนแล้ว (กำหนด ${registerData.limitMinutes} นาทีหลังเวลาเริ่มประชุม)`);
        setPeople((await peopleResponse.json()) as Person[]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load registration page");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [channel, meetingId]);

  function selectInternalPerson(value: string) {
    setSelectedPerson(value);
    const person = people.find((item) => String(item.intPid) === value);
    if (!person) {
      setForm({ fname: "", lname: "", department: "", position: "" });
      return;
    }
    setForm({
      fname: person.fname,
      lname: person.lname,
      department: person.department,
      position: person.position,
    });
  }

  async function submit(mode: "close" | "continue") {
    if (!form.fname || !form.lname || !form.department || !form.position) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    if (!meeting) return;

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/meetings/${meeting.meetingId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          channel: channel === "internal" ? "INTERNAL" : "EXTERNAL",
          intPid: channel === "internal" ? Number(selectedPerson) || null : null,
        }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(result.message ?? "บันทึกไม่สำเร็จ");
      }
      const result = (await response.json()) as { personNo: number };
      setSuccess({ message: `ลงทะเบียนสำเร็จ ลำดับที่ ${result.personNo}`, mode });
      if (channel === "internal") {
        const registeredId = Number(selectedPerson);
        if (Number.isInteger(registeredId)) {
          setRegisteredIntPids((current) => [...current, registeredId]);
        }
      }
      if (mode === "continue") {
        setForm({ fname: "", lname: "", department: "", position: "" });
        setSelectedPerson("");
        setComboboxKey((key) => key + 1); // clear the combobox input for the next person
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function closePage() {
    window.close();
    window.location.href = "about:blank";
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-slate-900 px-5 py-4">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-300" />
          กำลังโหลดข้อมูลการประชุม...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#14532d_0,#07111f_30%,#020617_100%)] px-4 py-6 text-white">
      {saving && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-slate-900 px-5 py-4">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-300" />
            กำลังบันทึก...
          </div>
        </div>
      )}
      {success && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-emerald-400/40 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-start gap-3 text-emerald-100">
              <CheckCircle2 className="mt-1 h-6 w-6 text-emerald-300" />
              <div>
                <h2 className="text-xl font-bold">บันทึกสำเร็จ</h2>
                <p>{success.message}</p>
              </div>
            </div>
            <button
              className={`${buttonBase} w-full bg-emerald-500 text-slate-950 hover:bg-emerald-300`}
              onClick={() => {
                const mode = success.mode;
                setSuccess(null);
                if (mode === "close") closePage();
              }}
              type="button"
            >
              <CheckCircle2 className="h-5 w-5" /> ยืนยัน
            </button>
          </div>
        </div>
      )}
      {confirmClose && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-amber-400/40 bg-slate-900 p-5 shadow-2xl">
            <h2 className="mb-3 text-xl font-bold">ต้องการออกจากหน้าลงทะเบียน?</h2>
            <p className="mb-5 text-slate-300">ข้อมูลที่ยังไม่ได้บันทึกจะไม่ถูกเก็บไว้</p>
            <div className="flex gap-3">
              <button className={`${buttonBase} flex-1 bg-slate-700 text-white hover:bg-slate-600`} onClick={() => setConfirmClose(false)} type="button">
                <X className="h-5 w-5" /> ยกเลิก
              </button>
              <button className={`${buttonBase} flex-1 bg-rose-500 text-white hover:bg-rose-400`} onClick={closePage} type="button">
                <X className="h-5 w-5" /> ปิดหน้า
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-3xl flex-col">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30">
            <ClipboardCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold">SignMeeting</h1>
            <p className="text-slate-300">{channel === "internal" ? "Internal registration" : "External registration"}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-2xl">
          {meeting && isClosed ? (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-5 text-rose-100">
              <h2 className="mb-2 text-2xl font-bold">หมดเวลาลงทะเบียน</h2>
              <p>{closedMessage}</p>
              <p className="mt-3 text-slate-300">{meeting.meetingName} • {formatThaiDate(meeting.meetingDate)} เวลา {formatTime24(meeting.startTime)}</p>
              <button className={`${buttonBase} mt-5 w-full bg-slate-700 text-white hover:bg-slate-600`} onClick={closePage} type="button">
                <X className="h-5 w-5" /> ปิด
              </button>
            </div>
          ) : meeting ? (
            <>
              <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                <p className="text-sm font-semibold text-emerald-200">{meeting.meetingId}</p>
                <h2 className="mt-1 text-2xl font-bold">{meeting.meetingName}</h2>
                <p className="mt-1 text-slate-300">{meeting.meetingProjectName}</p>
                <p className="mt-2 text-sm text-slate-300">
                  {formatThaiDate(meeting.meetingDate)} เวลา {formatTime24(meeting.startTime)} • {meeting.meetingLocation}
                </p>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">
                  <X className="mt-1 h-5 w-5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="grid gap-4">
                {channel === "internal" && (
                  <div className="grid gap-2 font-semibold text-slate-200">
                    <span>เลือกชื่อ - นามสกุล</span>
                    <PersonCombobox
                      key={comboboxKey}
                      people={people.filter((person) => !registeredIntPids.includes(person.intPid))}
                      selectedId={selectedPerson}
                      onSelect={(person) => selectInternalPerson(person ? String(person.intPid) : "")}
                    />
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="ชื่อ">
                    <input className={inputBase} disabled={channel === "internal"} required value={form.fname} onChange={(event) => setForm({ ...form, fname: event.target.value })} />
                  </Field>
                  <Field label="นามสกุล">
                    <input className={inputBase} disabled={channel === "internal"} required value={form.lname} onChange={(event) => setForm({ ...form, lname: event.target.value })} />
                  </Field>
                </div>
                <Field label="หน่วยงาน/สังกัด">
                  <input className={inputBase} disabled={channel === "internal"} required value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
                </Field>
                <Field label="ตำแหน่ง">
                  <input className={inputBase} disabled={channel === "internal"} required value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} />
                </Field>

                <div className="grid gap-3 md:grid-cols-3">
                <button className={`${buttonBase} bg-emerald-500 text-slate-950 hover:bg-emerald-300`} disabled={saving} onClick={() => submit("close")} type="button">
                  <Save className="h-5 w-5" /> บันทึก
                </button>
                <button className={`${buttonBase} bg-cyan-500 text-slate-950 hover:bg-cyan-300`} disabled={saving} onClick={() => submit("continue")} type="button">
                  <Save className="h-5 w-5" /> บันทึก(ต่อ)
                </button>
                <button className={`${buttonBase} bg-slate-700 text-white hover:bg-slate-600`} onClick={() => setConfirmClose(true)} type="button">
                  <X className="h-5 w-5" /> ปิด
                </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-5 text-rose-100">
              ไม่พบข้อมูลการประชุม
            </div>
          )}
        </div>

        <footer className="mt-auto py-4 text-center text-sm text-slate-400">© 2026 TPT Team • Version 1.0</footer>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 font-semibold text-slate-200">
      <span className="inline-flex items-center gap-2">
        <Users className="h-4 w-4 text-emerald-300" />
        {label}
      </span>
      {children}
    </label>
  );
}
