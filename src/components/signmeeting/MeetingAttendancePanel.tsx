"use client";

import { Download, FileDown, FileSpreadsheet, RefreshCw } from "lucide-react";
import { AttendanceTable } from "./AttendanceTable";
import type { Attendance, Meeting } from "./types";
import { iconButtonTone, inputBase } from "./ui";

export type AttendanceExportKind = "excel" | "pdf" | "pdfPortrait";

export function MeetingAttendancePanel({
  meeting,
  meetings,
  onDelete,
  onExport,
  onRefresh,
  onSelect,
}: {
  meeting: Meeting;
  meetings: Meeting[];
  onDelete: (attendance: Attendance) => void;
  onExport: (meeting: Meeting, kind: AttendanceExportKind) => void;
  onRefresh: () => void;
  onSelect: (meetingId: string) => void;
}) {
  return (
    <div
      className="mt-5 rounded-xl border border-slate-700 bg-slate-950/40 p-4"
      id="attendancePanel"
    >
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Attendance</h2>
          <p className="text-sm text-slate-400">รายงานตาม Meeting ID: {meeting.meetingId}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="min-w-64">
            <span className="sr-only">เลือกการประชุม</span>
            <select
              className={inputBase}
              onChange={(event) => onSelect(event.target.value)}
              title="เลือกการประชุมเพื่อแสดง Attendance"
              value={meeting.meetingId}
            >
              {meetings.map((item) => (
                <option key={item.meetingId} value={item.meetingId}>
                  {item.meetingId} - {item.meetingName}
                </option>
              ))}
            </select>
          </label>
          <button
            aria-label="Refresh Attendance"
            className={iconButtonTone("muted")}
            onClick={onRefresh}
            title="Refresh ข้อมูล Attendance"
            type="button"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          {meeting.attendances.length > 0 && (
            <>
              <button
                aria-label="Export Excel"
                className={iconButtonTone("excel")}
                onClick={() => onExport(meeting, "excel")}
                title="Export Excel"
                type="button"
              >
                <FileSpreadsheet className="h-5 w-5" />
              </button>
              <button
                aria-label="Export PDF แนวนอน"
                className={iconButtonTone("pdf")}
                onClick={() => onExport(meeting, "pdf")}
                title="Export PDF แนวนอน"
                type="button"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                aria-label="Export PDF แนวตั้ง"
                className={iconButtonTone("pdf")}
                onClick={() => onExport(meeting, "pdfPortrait")}
                title="Export PDF แนวตั้ง"
                type="button"
              >
                <FileDown className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>
      <AttendanceTable
        externalGroupName={meeting.externalMeetingName || ""}
        internalGroupName={meeting.internalMeetingName}
        onDelete={onDelete}
        rows={meeting.attendances}
      />
    </div>
  );
}
