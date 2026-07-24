import type { Meeting, QrItem } from "@/components/signmeeting/types";
import { formatTimeRange } from "@/components/signmeeting/ui";

const thaiWeekdays = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
const thaiMonths = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function formatThaiLongDate(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  const weekday = thaiWeekdays[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday} ที่ ${day} เดือน ${thaiMonths[month - 1]} พ.ศ. ${year + 543}`;
}

export function openMeetingQrDocument({
  groupImages,
  images,
  items,
  meeting,
}: {
  groupImages: Record<string, string>;
  images: Record<string, string>;
  items: QrItem[];
  meeting: Meeting;
}) {
  function openQrTab() {
    const qrPayload = {
      meetingId: meeting.meetingId,
      project: meeting.meetingProjectName,
      name: meeting.meetingName,
      date: formatThaiLongDate(meeting.meetingDate),
      time: formatTimeRange(meeting.startTime, meeting.endTime),
      dateLine: `${formatThaiLongDate(meeting.meetingDate)} เวลา ${formatTimeRange(meeting.startTime, meeting.endTime)} น.`,
      locationLine: `ณ ${meeting.meetingLocation}`,
      location: meeting.meetingLocation,
      type: meeting.meetingType === "INTERNAL" ? "สำหรับบริษัทฯ" : "สำหรับผู้ร่วมประชุม",
      items: items.map((item) => ({ ...item, groupImage: groupImages[item.url] ?? "", image: images[item.url] ?? "" })),
    };
    const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${meeting.meetingId} QR Codes</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *{box-sizing:border-box}
    body{
      margin:0;
      min-height:100vh;
      font-family:"Prompt",Arial,sans-serif;
      background:
        radial-gradient(circle at 12% 0%, rgba(34,211,238,.28), transparent 34%),
        radial-gradient(circle at 90% 10%, rgba(16,185,129,.18), transparent 30%),
        #07111f;
      color:#f8fafc;
      padding:36px;
    }
    .shell{max-width:1280px;margin:0 auto}
    .hero{
      border:1px solid #334155;
      border-radius:24px;
      background:rgba(15,23,42,.78);
      box-shadow:0 24px 70px rgba(0,0,0,.34);
      padding:30px;
      margin-bottom:34px;
    }
    .badge{
      display:inline-flex;
      border-radius:999px;
      background:#22d3ee;
      color:#06202c;
      font-weight:700;
      font-size:18px;
      line-height:1.25;
      padding:9px 18px;
      margin-bottom:18px;
    }
    .hero-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;flex-wrap:wrap}
    .copy-button{
      border:0;
      border-radius:14px;
      background:#fbbf24;
      color:#111827;
      cursor:pointer;
      font-family:"Prompt",Arial,sans-serif;
      font-size:18px;
      font-weight:800;
      padding:13px 18px;
      box-shadow:0 14px 32px rgba(251,191,36,.24);
    }
    .copy-button:active{transform:scale(.98)}
    .copy-status{color:#a7f3d0;font-size:16px;font-weight:500;margin-top:12px;text-align:right}
    .report-head{margin-top:24px;text-align:center}
    .report-project{margin:0;color:#f8fafc;font-size:40px;font-weight:800;line-height:1.22}
    .report-meeting{margin:18px 0 0;color:#f8fafc;font-size:30px;font-weight:700;line-height:1.3}
    .report-date{margin:28px 0 0;color:#e2e8f0;font-size:24px;font-weight:400;line-height:1.45}
    .report-location{margin:12px 0 0;color:#e2e8f0;font-size:24px;font-weight:400;line-height:1.45}
    .grid{display:flex;gap:96px;justify-content:center;align-items:stretch;flex-wrap:wrap}
    .card{
      width:420px;
      min-height:640px;
      border:1px solid #334155;
      border-radius:24px;
      background:linear-gradient(180deg,#162235,#0f172a);
      padding:28px;
      text-align:center;
      box-shadow:0 20px 55px rgba(0,0,0,.26);
    }
    .title{font-size:26px;font-weight:700;margin-bottom:22px;color:#e0f2fe;line-height:1.25}
    .title-label{display:block}
    .title-group{display:block;margin-top:8px;font-weight:800;color:#f8fafc}
    .group-photo{display:grid;width:180px;height:104px;margin:0 auto 18px;place-items:center;overflow:hidden;border-radius:16px;border:1px solid #334155;background:linear-gradient(135deg,#0f172a,#083344);padding:9px}
    .group-photo img{width:100%;height:86px;object-fit:contain;display:block;border-radius:12px}
    .group-photo-empty{display:grid;height:100%;place-items:center;color:#bae6fd;font-weight:700}
    .qr-img{width:300px;height:300px;border-radius:20px;background:white;padding:14px}
    .url{display:block;margin-top:20px;color:#67e8f9;font-size:14px;word-break:break-all;line-height:1.45;text-decoration:underline;cursor:pointer}
    .url:hover{color:#a5f3fc}
    .hint{margin-top:14px;color:#67e8f9;font-size:17px;font-weight:600}
    @media (max-width: 900px){
      body{padding:18px}
      .hero-head{justify-content:center;text-align:center}
      .report-project{font-size:28px}
      .report-meeting,.report-date,.report-location{font-size:20px}
      .grid{gap:24px}
      .card{width:100%}
      .qr-img{width:min(300px,100%);height:auto}
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div class="hero-head">
        <div>
          <div class="badge">SignMeeting • ${meeting.meetingId}</div>
        </div>
        <div>
          <button class="copy-button" id="copyQrImage" type="button">Copy QR Code ทั้งหมด</button>
          <div class="copy-status" id="copyStatus"></div>
        </div>
      </div>
      <div class="report-head">
        <h1 class="report-project">${meeting.meetingProjectName}</h1>
        <div class="report-meeting">${meeting.meetingName}</div>
        <div class="report-date">${formatThaiLongDate(meeting.meetingDate)} เวลา ${formatTimeRange(meeting.startTime, meeting.endTime)} น.</div>
        <div class="report-location">ณ ${meeting.meetingLocation}</div>
      </div>
    </section>
    <div class="grid">
    ${items
      .map(
        (item) => `<section class="card">
      <div class="group-photo">${
        groupImages[item.url]
          ? `<img src="${groupImages[item.url]}" alt="${item.title} image" />`
          : `<div class="group-photo-empty">${item.label}</div>`
      }</div>
      <div class="title"><span class="title-label">${item.label}</span>${item.groupName ? `<span class="title-group">(${item.groupName})</span>` : ""}</div>
      <img class="qr-img" src="${images[item.url] ?? ""}" alt="${item.title}" />
      <div class="hint">สแกน QR Code เพื่อลงทะเบียน</div>
      <a class="url" href="${item.url}" target="_blank" rel="noopener noreferrer">${item.url}</a>
    </section>`,
      )
      .join("")}
    </div>
  </main>
  <script>
    const qrPayload = ${JSON.stringify(qrPayload)};

    function roundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
      const words = String(text).split(" ");
      let line = "";
      let currentY = y;
      for (const word of words) {
        const testLine = line ? line + " " + word : word;
        if (ctx.measureText(testLine).width > maxWidth && line) {
          ctx.fillText(line, x, currentY);
          line = word;
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, currentY);
      return currentY + lineHeight;
    }

    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }

    async function createMeetingQrBlob() {
      if (document.fonts?.ready) {
        await document.fonts.ready;
        await document.fonts.load("800 44px Prompt");
        await document.fonts.load("700 32px Prompt");
      }
      const qrImages = await Promise.all(qrPayload.items.map((item) => loadImage(item.image)));
      const groupImages = await Promise.all(
        qrPayload.items.map((item) => (item.groupImage ? loadImage(item.groupImage).catch(() => null) : Promise.resolve(null))),
      );
      const width = 1400;
      const cardWidth = 430;
      const cardHeight = 680;
      const gap = qrPayload.items.length > 1 ? 140 : 0;
      const cardsWidth = qrPayload.items.length * cardWidth + Math.max(0, qrPayload.items.length - 1) * gap;
      const startX = (width - cardsWidth) / 2;
      const height = 1040;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#07111f";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#0f172a";
      roundRect(ctx, 60, 46, width - 120, 300, 28);
      ctx.fill();
      ctx.textAlign = "center";
      ctx.font = "700 22px Prompt, Arial";
      const badgeText = "SignMeeting • " + qrPayload.meetingId;
      const badgeWidth = Math.min(width - 180, Math.max(312, Math.ceil(ctx.measureText(badgeText).width) + 56));
      ctx.fillStyle = "#22d3ee";
      roundRect(ctx, width / 2 - badgeWidth / 2, 76, badgeWidth, 44, 22);
      ctx.fill();
      ctx.fillStyle = "#06202c";
      ctx.fillText(badgeText, width / 2, 105);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "800 44px Prompt, Arial";
      ctx.fillText(qrPayload.project, width / 2, 168, width - 180);
      ctx.font = "700 32px Prompt, Arial";
      ctx.fillText(qrPayload.name, width / 2, 225, width - 180);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "400 26px Prompt, Arial";
      ctx.fillText(qrPayload.dateLine, width / 2, 282, width - 180);
      ctx.font = "400 25px Prompt, Arial";
      ctx.fillText(qrPayload.locationLine, width / 2, 326, width - 180);

      qrPayload.items.forEach((item, index) => {
        const x = startX + index * (cardWidth + gap);
        ctx.fillStyle = "#162235";
        roundRect(ctx, x, 360, cardWidth, cardHeight - 40, 26);
        ctx.fill();
        const thumbWidth = 190;
        const thumbHeight = 108;
        const thumbX = x + (cardWidth - thumbWidth) / 2;
        const thumbY = 392;
        roundRect(ctx, thumbX, thumbY, thumbWidth, thumbHeight, 20);
        ctx.fillStyle = "#082f49";
        ctx.fill();
        const groupImage = groupImages[index];
        if (groupImage) {
          ctx.save();
          roundRect(ctx, thumbX, thumbY, thumbWidth, thumbHeight, 20);
          ctx.clip();
          const imageRatio = groupImage.width / groupImage.height;
          const targetRatio = thumbWidth / thumbHeight;
          let drawWidth = thumbWidth - 20;
          let drawHeight = thumbHeight - 20;
          if (imageRatio > targetRatio) {
            drawHeight = drawWidth / imageRatio;
          } else {
            drawWidth = drawHeight * imageRatio;
          }
          const drawX = thumbX + (thumbWidth - drawWidth) / 2;
          const drawY = thumbY + (thumbHeight - drawHeight) / 2;
          ctx.drawImage(groupImage, drawX, drawY, drawWidth, drawHeight);
          ctx.restore();
        } else {
          ctx.fillStyle = "#bae6fd";
          ctx.font = "700 24px Prompt, Arial";
          ctx.textAlign = "center";
          ctx.fillText(item.label, x + cardWidth / 2, thumbY + thumbHeight / 2 + 8);
        }
        ctx.fillStyle = "#e0f2fe";
        ctx.font = "700 29px Prompt, Arial";
        ctx.textAlign = "center";
        ctx.fillText(item.label, x + cardWidth / 2, 570);
        if (item.groupName) {
          ctx.font = "800 29px Prompt, Arial";
          ctx.fillText("(" + item.groupName + ")", x + cardWidth / 2, 606);
        }
        ctx.fillStyle = "#ffffff";
        roundRect(ctx, x + 65, 638, 300, 300, 22);
        ctx.fill();
        ctx.drawImage(qrImages[index], x + 73, 646, 284, 284);
        ctx.fillStyle = "#67e8f9";
        ctx.font = "600 18px Prompt, Arial";
        ctx.fillText("สแกน QR Code เพื่อลงทะเบียน", x + cardWidth / 2, 976);
        ctx.textAlign = "left";
      });

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to create image")), "image/png");
      });
    }

    document.getElementById("copyQrImage").addEventListener("click", async () => {
      const status = document.getElementById("copyStatus");
      status.textContent = "กำลังสร้างรูปภาพ...";
      try {
        const blob = await createMeetingQrBlob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        status.textContent = "Copy รูปพร้อมรายละเอียดการประชุมแล้ว";
      } catch (error) {
        const blob = await createMeetingQrBlob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = qrPayload.meetingId + "-qr-meeting.png";
        link.click();
        URL.revokeObjectURL(link.href);
        status.textContent = "Browser ไม่รองรับ copy image จึงดาวน์โหลดรูปแทน";
      }
    });
  </script>
</body>
</html>`;
    const pageUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(pageUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(pageUrl), 60_000);
  }

  openQrTab();
}
