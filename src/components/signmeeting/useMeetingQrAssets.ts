"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { QrItem } from "@/components/signmeeting/types";

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useMeetingQrAssets(items: QrItem[]) {
  const [images, setImages] = useState<Record<string, string>>({});
  const [groupImages, setGroupImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    Promise.all([
      Promise.all(
        items.map(async (item) => [
          item.url,
          await QRCode.toDataURL(item.url, { width: 260, margin: 2 }),
        ] as const),
      ),
      Promise.all(
        items.map(async (item) => {
          if (!item.groupImageUrl) return [item.url, ""] as const;
          try {
            const response = await fetch(item.groupImageUrl, {
              credentials: "include",
            });
            if (!response.ok) return [item.url, ""] as const;
            return [
              item.url,
              await blobToDataUrl(await response.blob()),
            ] as const;
          } catch {
            return [item.url, ""] as const;
          }
        }),
      ),
    ]).then(([qrEntries, groupEntries]) => {
      if (!active) return;
      setImages(Object.fromEntries(qrEntries));
      setGroupImages(Object.fromEntries(groupEntries));
    });

    return () => {
      active = false;
    };
  }, [items]);

  return {
    groupImages,
    images,
    ready: Object.keys(images).length >= items.length,
  };
}
