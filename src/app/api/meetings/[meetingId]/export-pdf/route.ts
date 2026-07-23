import { NextResponse } from "next/server";
import path from "path";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { readMeetingPhotoFile } from "@/lib/photo-storage";

type Params = { params: Promise<{ meetingId: string }> };

const FONT_DIR = path.join(process.cwd(), "fonts");
const FONT_REGULAR = path.join(FONT_DIR, "TH-Sarabun-New-Regular.ttf");
const FONT_BOLD = path.join(FONT_DIR, "TH-Sarabun-New-Bold.ttf");

const THAI_WEEKDAYS = [
  "วันอาทิตย์",
  "วันจันทร์",
  "วันอังคาร",
  "วันพุธ",
  "วันพฤหัสบดี",
  "วันศุกร์",
  "วันเสาร์",
];
const THAI_MONTHS = [
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

function formatThaiDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  const weekday = THAI_WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday} ที่ ${day} เดือน ${THAI_MONTHS[month - 1]} พ.ศ. ${year + 543}`;
}

type Column = { label: string; width: number; align: "left" | "center"; value: (row: Row) => string };
type Row = {
  displayNo: number;
  fname: string;
  lname: string;
  department: string;
  position: string;
  email: string | null;
  phone: string | null;
  timestamp: Date;
};

function formatTimeRange(startTime: string, endTime?: string | null) {
  const start = startTime.slice(0, 5);
  const end = String(endTime ?? "").slice(0, 5);
  return end ? `${start}-${end}` : start;
}

function formatAttendanceDateTime(value: Date) {
  const formatter = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return formatter.format(value).replace(",", "");
}

export async function GET(request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId } = await params;
  const isPortrait = new URL(request.url).searchParams.get("layout") === "portrait";

  const meeting = await prisma.meeting.findUnique({
    where: { meetingId },
    include: { attendances: { orderBy: { personNo: "asc" } } },
  });
  if (!meeting) {
    return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
  }

  const doc = new PDFDocument({
    size: "A4",
    layout: isPortrait ? "portrait" : "landscape",
    margin: 32,
    bufferPages: true,
  });
  doc.registerFont("th", FONT_REGULAR);
  doc.registerFont("th-bold", FONT_BOLD);

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const bottom = doc.page.height - doc.page.margins.bottom;

  // --- Header (centered) — repeated on every page ---
  // Alias the (now non-null) meeting so the narrowing survives inside this closure.
  const m = meeting;
  function drawHeader() {
    doc.x = left;
    doc.font("th-bold").fontSize(18).fillColor("#0f172a").text(m.meetingProjectName, { align: "center" });
    doc.moveDown(0.2);
    doc.font("th-bold").fontSize(14).text(m.meetingName, { align: "center" });
    doc.moveDown(0.2);
    doc
      .font("th")
      .fontSize(11)
      .text(`${formatThaiDate(m.meetingDate)} เวลา ${formatTimeRange(m.startTime, m.endTime)} น.`, { align: "center" });
    doc.text(`ณ ${m.meetingLocation}`, { align: "center" });
    doc
      .font("th-bold")
      .fontSize(11)
      .fillColor("#0e7490")
      .text(`จำนวนผู้เข้าประชุมทั้งหมด ${m.attendances.length} คน`, { align: "center" });
    doc.moveDown(0.7);
  }

  drawHeader();

  // --- Table ---
  const portraitWidths = {
    no: 34,
    name: 125,
    organization: 179,
    contact: 78,
  };
  const columns: Column[] = isPortrait
    ? [
        { label: "ลำดับ", width: portraitWidths.no, align: "center", value: (row) => String(row.displayNo) },
        {
          label: "ชื่อ-นามสกุล",
          width: portraitWidths.name,
          align: "left",
          value: (row) => `${row.fname} ${row.lname}`,
        },
        {
          label: "ตำแหน่ง หน่วยงาน/สังกัด",
          width: portraitWidths.organization,
          align: "left",
          value: (row) => `${row.position || "-"}\n${row.department || "-"}`,
        },
        {
          label: "โทรศัพท์ (E-mail)",
          width: portraitWidths.contact,
          align: "left",
          value: (row) => `${row.phone || "-"}\n(${row.email || "-"})`,
        },
        {
          label: "ลายเซ็นต์",
          width: contentWidth - Object.values(portraitWidths).reduce((sum, width) => sum + width, 0),
          align: "center",
          value: () => "",
        },
      ]
    : [
        { label: "ลำดับ", width: 36, align: "center", value: (row) => String(row.displayNo) },
        { label: "ชื่อ-นามสกุล", width: 120, align: "left", value: (row) => `${row.fname} ${row.lname}` },
        { label: "ตำแหน่ง", width: 92, align: "left", value: (row) => row.position },
        { label: "หน่วยงาน/สังกัด", width: 110, align: "left", value: (row) => row.department },
        { label: "โทรศัพท์", width: 78, align: "left", value: (row) => row.phone || "-" },
        { label: "E-mail", width: 128, align: "left", value: (row) => row.email || "-" },
        { label: "วัน เวลา", width: 90, align: "center", value: (row) => formatAttendanceDateTime(row.timestamp) },
        { label: "ลายเซ็นต์", width: contentWidth - 654, align: "center", value: () => "" },
      ];
  const padding = isPortrait ? 3 : 5;

  function drawRow(cells: string[], options: { header?: boolean; signature?: Buffer | null }) {
    const fontName = options.header ? "th-bold" : "th";
    const fontSize = options.header ? 9 : 8;
    doc.font(fontName).fontSize(fontSize);

    const rowHeight = options.header ? (isPortrait ? 26 : 24) : isPortrait ? 30 : 36;

    // Page break: start a new page, repeat the meeting header + table header row.
    if (doc.y + rowHeight > bottom) {
      doc.addPage();
      drawHeader();
      drawRow(columns.map((column) => column.label), { header: true });
    }

    const y = doc.y;
    let x = left;
    cells.forEach((text, index) => {
      const column = columns[index];
      if (options.header) {
        doc.save();
        doc.rect(x, y, column.width, rowHeight).fill("#0e7490");
        doc.restore();
      }
      doc.rect(x, y, column.width, rowHeight).strokeColor("#94a3b8").lineWidth(0.5).stroke();
      if (!options.header && index === columns.length - 1 && options.signature) {
        const signaturePaddingX = isPortrait ? 8 : 10;
        const signaturePaddingY = isPortrait ? 3 : 7;
        doc.image(options.signature, x + signaturePaddingX, y + signaturePaddingY, {
          fit: [column.width - signaturePaddingX * 2, rowHeight - signaturePaddingY * 2],
          align: "center",
          valign: "center",
        });
      } else {
        const displayText = text || (index === columns.length - 1 && !options.header ? "-" : "");
        const cellFontSize = isPortrait && !options.header && index === 3 ? 7 : fontSize;
        doc.font(fontName).fontSize(cellFontSize);
        const availableHeight = rowHeight - padding * 2;
        const textHeight = Math.min(
          doc.heightOfString(displayText || " ", { width: column.width - padding * 2 }),
          availableHeight,
        );
        const textY = y + (rowHeight - textHeight) / 2;
        doc
          .font(fontName)
          .fontSize(cellFontSize)
          .fillColor(options.header ? "#ffffff" : "#0f172a")
          .text(displayText, x + padding, textY, {
            width: column.width - padding * 2,
            height: availableHeight,
            align: column.align,
            ellipsis: true,
          });
      }
      x += column.width;
    });
    doc.y = y + rowHeight;
    doc.x = left;
  }

  if (meeting.attendances.length === 0) {
    drawRow(columns.map((column) => column.label), { header: true });
    doc.font("th").fontSize(10).fillColor("#94a3b8").text("ยังไม่มีผู้ลงทะเบียน", left, doc.y + 8, {
      width: contentWidth,
      align: "center",
    });
  } else {
    const byTimestamp = (a: (typeof meeting.attendances)[number], b: (typeof meeting.attendances)[number]) => {
      const timeDifference = a.timestamp.getTime() - b.timestamp.getTime();
      return timeDifference || a.personNo - b.personNo;
    };
    const orderedAttendances = [
      ...meeting.attendances.filter((row) => row.channel === "EXTERNAL").sort(byTimestamp),
      ...meeting.attendances.filter((row) => row.channel === "INTERNAL").sort(byTimestamp),
    ];
    const internalIds = orderedAttendances
      .map((row) => row.intPid)
      .filter((intPid): intPid is number => intPid != null);
    const internalPeople = internalIds.length
      ? await prisma.internalPerson.findMany({ where: { intPid: { in: internalIds } } })
      : [];
    const internalPeopleById = new Map(internalPeople.map((person) => [person.intPid, person]));
    const signatures = new Map<string, Buffer>();
    await Promise.all(
      orderedAttendances.map(async (attendance) => {
        if (!attendance.signaturePath) return;
        try {
          signatures.set(attendance.id, await readMeetingPhotoFile(attendance.signaturePath));
        } catch {
          // Keep the report usable when an old signature file is unavailable.
        }
      }),
    );

    drawRow(columns.map((column) => column.label), { header: true });
    orderedAttendances.forEach((attendance, index) => {
      const internalPerson = attendance.intPid == null ? null : internalPeopleById.get(attendance.intPid);
      const row = {
        ...attendance,
        displayNo: index + 1,
        department:
          attendance.department ||
          (attendance.channel === "INTERNAL"
            ? meeting.internalMeetingName.trim() || "ผู้ปฏิบัติงาน"
            : meeting.externalMeetingName?.trim() || "ผู้ร่วมประชุม"),
        email: attendance.email || internalPerson?.email || null,
        phone: attendance.phone || internalPerson?.phone || null,
      };
      drawRow(columns.map((column) => column.value(row)), { signature: signatures.get(attendance.id) });
    });
  }

  // --- Footer: page number "หน้า X/Y" at bottom-right of every page ---
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0; // prevent auto page-break while writing in the footer area
    doc
      .font("th")
      .fontSize(11)
      .fillColor("#334155")
      .text(`หน้า ${i - range.start + 1} / ${range.count}`, left, doc.page.height - 28, {
        width: contentWidth,
        align: "right",
      });
  }

  doc.end();
  const buffer = await done;
  const filename = `${meeting.meetingId}-attendance${isPortrait ? "-portrait" : ""}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
