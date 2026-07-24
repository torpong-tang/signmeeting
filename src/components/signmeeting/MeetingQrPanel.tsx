"use client";

import { ExternalLink, QrCode } from "lucide-react";
import type { Meeting, QrItem } from "@/components/signmeeting/types";
import { iconButtonTone } from "@/components/signmeeting/ui";
import { MeetingQrCard } from "@/components/signmeeting/MeetingQrCard";
import { openMeetingQrDocument } from "@/components/signmeeting/MeetingQrDocument";
import { useMeetingQrAssets } from "@/components/signmeeting/useMeetingQrAssets";

export function MeetingQrPanel({
  items,
  meeting,
}: {
  items: QrItem[];
  meeting: Meeting;
}) {
  const { groupImages, images, ready } = useMeetingQrAssets(items);

  return (
    <div
      className="rounded-xl border border-slate-700 bg-slate-950/50 p-4"
      id="meetingQrPanel"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-semibold text-cyan-100">
          <QrCode className="h-5 w-5 text-cyan-300" />
          QR Code สำหรับลงทะเบียน
        </div>
        <div className="flex gap-2">
          <button
            aria-label="Open QR codes in new tab"
            className={iconButtonTone("edit")}
            disabled={!ready}
            onClick={() =>
              openMeetingQrDocument({
                groupImages,
                images,
                items,
                meeting,
              })
            }
            title="เปิด QR code ใน New tab"
            type="button"
          >
            <ExternalLink className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <MeetingQrCard item={item} key={item.url} image={images[item.url]} />
        ))}
      </div>
    </div>
  );
}
