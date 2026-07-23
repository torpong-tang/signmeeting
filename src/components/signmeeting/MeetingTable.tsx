"use client";

import { Edit3, Eye, Plus, RefreshCw, Repeat2, Search, Trash2 } from "lucide-react";
import type { Meeting } from "./types";
import {
  buttonTone,
  formatThaiDate,
  formatTimeRange,
  Highlight,
  iconButtonTone,
  inputBase,
  PaginationControls,
  SortableTh,
} from "./ui";

export type MeetingSortKey =
  | "meetingId"
  | "meetingProjectName"
  | "meetingName"
  | "meetingDate"
  | "meetingType"
  | "attendances";

type Props = {
  meetings: Meeting[];
  page: number;
  pageSize: number;
  search: string;
  selectedMeetingId?: string;
  total: number;
  onCreate: () => void;
  onDelete: (meeting: Meeting) => void;
  onEdit: (meeting: Meeting) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRefresh: () => void;
  onRepeat: (meeting: Meeting) => void;
  onSearchChange: (value: string) => void;
  onSelect: (meetingId: string) => void;
  onSort: (key: MeetingSortKey) => void;
};

export function MeetingTable({
  meetings,
  page,
  pageSize,
  search,
  selectedMeetingId,
  total,
  onCreate,
  onDelete,
  onEdit,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  onRepeat,
  onSearchChange,
  onSelect,
  onSort,
}: Props) {
  return (
    <section>
      <div
        className="rounded-2xl border border-slate-700 bg-slate-900/75 p-5 shadow-xl"
        id="meetingsTable"
      >
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-bold">Meetings</h2>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="relative min-w-72">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputBase} pl-10`}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Live Search..."
                value={search}
              />
            </label>
            <button className={buttonTone("muted")} onClick={onRefresh} type="button">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button
              className={buttonTone("create")}
              id="createMeetingButton"
              onClick={onCreate}
              type="button"
            >
              <Plus className="h-5 w-5" /> สร้างการประชุมใหม่
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-950 text-slate-300">
              <tr>
                <th className="px-4 py-3">Actions</th>
                <SortableTh label="Meeting ID" onClick={() => onSort("meetingId")} />
                <SortableTh label="Project" onClick={() => onSort("meetingProjectName")} />
                <SortableTh label="Meeting" onClick={() => onSort("meetingName")} />
                <SortableTh label="Date" onClick={() => onSort("meetingDate")} />
                <SortableTh label="Count" onClick={() => onSort("attendances")} />
              </tr>
            </thead>
            <tbody>
              {meetings.map((meeting) => (
                <tr
                  className={`border-t border-slate-800 hover:bg-slate-800/60 ${
                    selectedMeetingId === meeting.meetingId ? "bg-cyan-500/10" : ""
                  }`}
                  key={meeting.meetingId}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-nowrap items-center gap-1">
                      <button
                        aria-label={`แสดง QR และรายชื่อของ ${meeting.meetingId}`}
                        className={iconButtonTone("repeat", "sm")}
                        onClick={() => onSelect(meeting.meetingId)}
                        title="แสดง QR และ Attendance"
                        type="button"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`เรียกซ้ำ ${meeting.meetingId}`}
                        className={iconButtonTone("preview", "sm")}
                        onClick={() => onRepeat(meeting)}
                        title="ประชุมอีกครั้ง"
                        type="button"
                      >
                        <Repeat2 className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`แก้ไข ${meeting.meetingId}`}
                        className={iconButtonTone("edit", "sm")}
                        onClick={() => onEdit(meeting)}
                        title="แก้ไข"
                        type="button"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`ลบ ${meeting.meetingId}`}
                        className={iconButtonTone("delete", "sm")}
                        onClick={() => onDelete(meeting)}
                        title="ลบ"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-cyan-200">
                    <Highlight query={search} text={meeting.meetingId} />
                  </td>
                  <td className="px-4 py-3">
                    <Highlight query={search} text={meeting.meetingProjectName} />
                  </td>
                  <td className="px-4 py-3">
                    <Highlight query={search} text={meeting.meetingName} />
                  </td>
                  <td className="px-4 py-3">
                    {formatThaiDate(meeting.meetingDate)}{" "}
                    {formatTimeRange(meeting.startTime, meeting.endTime)}
                  </td>
                  <td className="px-4 py-3">{meeting.attendances.length}</td>
                </tr>
              ))}
              {total === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={6}>
                    ยังไม่มีรายการประชุม
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <PaginationControls
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            page={page}
            pageSize={pageSize}
            total={total}
          />
        </div>
      </div>
    </section>
  );
}
