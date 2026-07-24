import { QrCode } from "lucide-react";
import type { QrItem } from "@/components/signmeeting/types";

export function MeetingQrCard({
  image,
  item,
}: {
  image?: string;
  item: QrItem;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <div className="mx-auto mb-4 grid h-24 w-full max-w-48 place-items-center overflow-hidden rounded-xl border border-slate-700 bg-gradient-to-br from-cyan-950/80 to-slate-950 p-2">
        {item.groupImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={`${item.title} image`}
            className="h-20 w-full rounded-lg object-contain"
            src={item.groupImageUrl}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-center text-sm font-semibold text-cyan-100">
            {item.label}
          </div>
        )}
      </div>
      <div className="mb-3 flex items-start justify-center gap-2 text-center font-semibold text-cyan-100">
        <QrCode className="mt-1 h-5 w-5 shrink-0 text-cyan-300" />
        <div className="leading-tight">
          <div>{item.label}</div>
          {item.groupName && (
            <div className="mt-1 text-cyan-50">({item.groupName})</div>
          )}
        </div>
      </div>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={item.title} className="mx-auto rounded-lg bg-white p-2" src={image} />
      ) : (
        <div className="grid h-56 place-items-center text-slate-400">
          Generating QR...
        </div>
      )}
      <a
        className="mt-3 block break-all rounded-lg bg-slate-950 p-3 text-xs text-cyan-300 underline decoration-cyan-500/40 underline-offset-2 transition hover:text-cyan-200 hover:decoration-cyan-300"
        href={item.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        {item.url}
      </a>
    </div>
  );
}
