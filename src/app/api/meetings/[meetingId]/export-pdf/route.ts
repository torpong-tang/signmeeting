import { NextResponse } from "next/server";
import path from "path";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

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
type Row = { personNo: number; fname: string; lname: string; department: string; position: string };

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId } = await params;

  const meeting = await prisma.meeting.findUnique({
    where: { meetingId },
    include: { attendances: { orderBy: { personNo: "asc" } } },
  });
  if (!meeting) {
    return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
  }

  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
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
  function drawHeader() {
    doc.x = left;
    doc.font("th-bold").fontSize(18).fillColor("#0f172a").text(meeting.meetingProjectName, { align: "center" });
    doc.moveDown(0.2);
    doc.font("th-bold").fontSize(14).text(meeting.meetingName, { align: "center" });
    doc.moveDown(0.2);
    doc
      .font("th")
      .fontSize(11)
      .text(`${formatThaiDate(meeting.meetingDate)} เวลา ${meeting.startTime.slice(0, 5)} น.`, { align: "center" });
    doc.text(`ณ ${meeting.meetingLocation}`, { align: "center" });
    doc.moveDown(1);
  }

  drawHeader();

  // --- Table ---
  const columns: Column[] = [
    { label: "ลำดับ", width: 50, align: "center", value: (row) => String(row.personNo) },
    { label: "ชื่อ-นามสกุล", width: 175, align: "left", value: (row) => `${row.fname} ${row.lname}` },
    { label: "หน่วยงาน/สังกัด", width: 160, align: "left", value: (row) => row.department },
    { label: "ตำแหน่ง", width: contentWidth - 385, align: "left", value: (row) => row.position },
  ];
  const padding = 5;

  function drawRow(cells: string[], options: { header?: boolean }) {
    const fontName = options.header ? "th-bold" : "th";
    const fontSize = options.header ? 11 : 10;
    doc.font(fontName).fontSize(fontSize);

    const heights = cells.map((text, index) =>
      doc.heightOfString(text || " ", { width: columns[index].width - padding * 2 }),
    );
    const rowHeight = Math.max(...heights) + padding * 2;

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
      doc
        .font(fontName)
        .fontSize(fontSize)
        .fillColor(options.header ? "#ffffff" : "#0f172a")
        .text(text || "", x + padding, y + padding, { width: column.width - padding * 2, align: column.align });
      x += column.width;
    });
    doc.y = y + rowHeight;
    doc.x = left;
  }

  drawRow(columns.map((column) => column.label), { header: true });
  if (meeting.attendances.length === 0) {
    doc.font("th").fontSize(10).fillColor("#94a3b8").text("ยังไม่มีผู้ลงทะเบียน", left, doc.y + 8, {
      width: contentWidth,
      align: "center",
    });
  } else {
    meeting.attendances.forEach((row) => {
      drawRow(columns.map((column) => column.value(row)), {});
    });
  }

  // --- Footer: page number "หน้า X/Y" at bottom-right of every page ---
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0; // prevent auto page-break while writing in the footer area
    doc
      .font("th")
      .fontSize(10)
      .fillColor("#64748b")
      .text(`หน้า ${i - range.start + 1}/${range.count}`, left, doc.page.height - 28, {
        width: contentWidth,
        align: "right",
      });
  }

  doc.end();
  const buffer = await done;
  const filename = `${meeting.meetingId}-attendance.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
