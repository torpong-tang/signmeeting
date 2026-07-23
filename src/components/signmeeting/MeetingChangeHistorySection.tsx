import { History } from "lucide-react";
import type { MeetingChangeLog } from "./types";

export function MeetingChangeHistorySection({
  changeLogs,
}: {
  changeLogs: MeetingChangeLog[];
}) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
      <div className="mb-3 flex items-center gap-2 font-bold text-cyan-100">
        <History className="h-5 w-5 text-cyan-300" /> ประวัติการแก้ไข
      </div>
      <div className="grid max-h-64 gap-3 overflow-y-auto">
        {changeLogs.map((log) => (
          <article
            className="rounded-lg border border-slate-700 bg-slate-900/70 p-3"
            key={log.id}
          >
            <div className="mb-2 text-xs text-slate-400">
              {new Intl.DateTimeFormat("th-TH", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Bangkok",
              }).format(new Date(log.createdAt))}
              {" • "}
              {log.changedBy}
            </div>
            <ul className="grid gap-1 text-sm text-slate-200">
              {log.changes.map((change) => (
                <li key={`${log.id}-${change.field}`}>
                  <span className="font-semibold text-amber-200">{change.label}:</span>{" "}
                  {change.before} → {change.after}
                </li>
              ))}
            </ul>
          </article>
        ))}
        {changeLogs.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-sm text-slate-400">
            ยังไม่มีประวัติการแก้ไข
          </div>
        )}
      </div>
    </section>
  );
}
