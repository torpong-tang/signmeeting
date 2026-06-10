import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ meetingId: string }> };

const FONT = "Tahoma";
const LAST_COL = "E";

function formatThaiDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year + 543}`;
}

function formatThaiDateTime(iso: string | Date) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${Number(get("year")) + 543} ${get("hour")}:${get("minute")}`;
}

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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SignMeeting";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Attendance", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });

  // Column widths sum to roughly an A4 page; fitToWidth scales them to one page.
  sheet.columns = [
    { width: 8 },
    { width: 30 },
    { width: 28 },
    { width: 24 },
    { width: 20 },
  ];

  const typeLabel = meeting.meetingType === "INTERNAL" ? "ประชุมภายใน" : "ประชุมภายนอก";
  const dateLine = `วันที่ ${formatThaiDate(meeting.meetingDate)} เวลา ${meeting.startTime.slice(0, 5)} น.`;

  // --- Header block (merged across all columns) ---
  type HeaderLine = { text: string; size: number; bold?: boolean; color?: string };
  const headerLines: HeaderLine[] = [
    { text: meeting.meetingProjectName, size: 16, bold: true },
    { text: meeting.meetingName, size: 13, bold: true },
    { text: dateLine, size: 11 },
    { text: `ณ ${meeting.meetingLocation}`, size: 11 },
    {
      text: `รหัสการประชุม: ${meeting.meetingId}  •  ${typeLabel}  •  จำนวนผู้เข้าร่วม ${meeting.attendances.length} คน`,
      size: 10,
      color: "FF64748B",
    },
  ];

  headerLines.forEach((line, index) => {
    const rowNumber = index + 1;
    sheet.mergeCells(`A${rowNumber}:${LAST_COL}${rowNumber}`);
    const cell = sheet.getCell(`A${rowNumber}`);
    cell.value = line.text;
    cell.font = { name: FONT, size: line.size, bold: line.bold, color: line.color ? { argb: line.color } : undefined };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    sheet.getRow(rowNumber).height = line.size + 8;
  });

  // Spacer row
  const headerRowNumber = headerLines.length + 2;

  // --- Table header ---
  const tableHeader = sheet.getRow(headerRowNumber);
  tableHeader.values = ["ลำดับ", "ชื่อ-นามสกุล", "หน่วยงาน/สังกัด", "ตำแหน่ง", "เวลาลงทะเบียน"];
  tableHeader.height = 22;
  tableHeader.eachCell((cell) => {
    cell.font = { name: FONT, size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E7490" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF94A3B8" } },
      left: { style: "thin", color: { argb: "FF94A3B8" } },
      bottom: { style: "thin", color: { argb: "FF94A3B8" } },
      right: { style: "thin", color: { argb: "FF94A3B8" } },
    };
  });

  // --- Data rows ---
  meeting.attendances.forEach((row, index) => {
    const dataRow = sheet.getRow(headerRowNumber + 1 + index);
    dataRow.values = [
      row.personNo,
      `${row.fname} ${row.lname}`,
      row.department,
      row.position,
      formatThaiDateTime(row.timestamp),
    ];
    const zebra = index % 2 === 1;
    dataRow.eachCell((cell, colNumber) => {
      cell.font = { name: FONT, size: 10 };
      cell.alignment = {
        horizontal: colNumber === 1 ? "center" : "left",
        vertical: "middle",
        wrapText: true,
      };
      if (zebra) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      }
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });
  });

  if (meeting.attendances.length === 0) {
    const emptyRowNumber = headerRowNumber + 1;
    sheet.mergeCells(`A${emptyRowNumber}:${LAST_COL}${emptyRowNumber}`);
    const cell = sheet.getCell(`A${emptyRowNumber}`);
    cell.value = "ยังไม่มีผู้ลงทะเบียน";
    cell.font = { name: FONT, size: 10, italic: true, color: { argb: "FF94A3B8" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  }

  // Repeat the table header on every printed page.
  sheet.pageSetup.printTitlesRow = `${headerRowNumber}:${headerRowNumber}`;

  // Freeze rows above the table so scrolling keeps the header visible.
  sheet.views = [{ state: "frozen", ySplit: headerRowNumber }];

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${meeting.meetingId}-attendance.xlsx`;
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
