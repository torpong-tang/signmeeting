"use client";

import { useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import type { Attendance } from "./types";
import {
  compareValues,
  formatThaiDateTime,
  Highlight,
  iconButtonTone,
  includesQuery,
  inputBase,
  PaginationControls,
  SortableTh,
  type SortDirection,
} from "./ui";

type AttendanceSortKey = "personNo" | "name" | "department" | "position" | "channel" | "timestamp";

export function AttendanceTable({
  rows,
  internalGroupName,
  externalGroupName,
  onDelete,
}: {
  rows: Attendance[];
  internalGroupName: string;
  externalGroupName: string;
  onDelete: (attendance: Attendance) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<{ key: AttendanceSortKey; direction: SortDirection }>({
    key: "personNo",
    direction: "asc",
  });

  const visibleRows = useMemo(() => {
    const departmentForRow = (row: Attendance) =>
      row.department ||
      (row.channel === "INTERNAL"
        ? internalGroupName || "ผู้ปฏิบัติงาน"
        : externalGroupName || "ผู้ร่วมประชุม");
    const filtered = rows.filter((row) =>
      includesQuery(
        [row.personNo, row.fname, row.lname, departmentForRow(row), row.position, row.channel, row.timestamp],
        search,
      ),
    );
    return [...filtered].sort((a, b) => {
      const value = (row: Attendance) => {
        if (sort.key === "name") return `${row.fname} ${row.lname}`;
        if (sort.key === "department") return departmentForRow(row);
        return row[sort.key];
      };
      return compareValues(value(a), value(b), sort.direction);
    });
  }, [externalGroupName, internalGroupName, rows, search, sort]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleRows.slice(start, start + pageSize);
  }, [page, pageSize, visibleRows]);

  function toggleSort(key: AttendanceSortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  return (
    <div className="rounded-xl border border-slate-700">
      {rows.length > 0 && (
        <div className="border-b border-slate-700 p-4">
          <label className="relative block max-w-xl">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputBase} pl-10`}
              placeholder="Live Search..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-950 text-slate-300">
            <tr>
              <SortableTh label="No." onClick={() => toggleSort("personNo")} />
              <SortableTh label="Name" onClick={() => toggleSort("name")} />
              <SortableTh label="Position" onClick={() => toggleSort("position")} />
              <SortableTh label="หน่วยงาน/สังกัด" onClick={() => toggleSort("department")} />
              <SortableTh label="Timestamp" onClick={() => toggleSort("timestamp")} />
              <th className="px-4 py-3 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.id} className="border-t border-slate-800">
                <td className="px-4 py-3 font-semibold text-amber-300"><Highlight query={search} text={row.personNo} /></td>
                <td className="px-4 py-3"><Highlight query={search} text={`${row.fname} ${row.lname}`} /></td>
                <td className="px-4 py-3"><Highlight query={search} text={row.position} /></td>
                <td className="px-4 py-3">
                  <Highlight
                    query={search}
                    text={row.department || (row.channel === "INTERNAL" ? internalGroupName || "ผู้ปฏิบัติงาน" : externalGroupName || "ผู้ร่วมประชุม")}
                  />
                </td>
                <td className="px-4 py-3">{formatThaiDateTime(row.timestamp)}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    aria-label={`ลบ Attendance ${row.personNo}`}
                    className={iconButtonTone("delete")}
                    onClick={() => onDelete(row)}
                    title="ลบ Attendance"
                    type="button"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={6}>ยังไม่มีผู้ลงทะเบียน</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls
        page={page}
        pageSize={pageSize}
        total={visibleRows.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
