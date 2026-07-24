import type { DriveStep } from "driver.js";

const previousIcon = `
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
`;

const nextIcon = `
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
`;

const doneIcon = `
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
`;

function targetedStep(
  element: string,
  popoverClass: string,
  title: string,
  description: string,
  side: "top" | "right" | "bottom" | "left" = "bottom",
): DriveStep {
  return {
    element,
    popover: {
      align: "center",
      description,
      popoverClass: `sm-tour ${popoverClass}`,
      side,
      title,
    },
  };
}

function getAvailableSteps(): DriveStep[] {
  const featureSteps: DriveStep[] = [
    targetedStep(
      "#adminToolbar",
      "sm-tour-cyan",
      "เครื่องมือผู้ดูแลระบบ",
      `
        <p>แถบคำสั่งหลักรวมเครื่องมือที่ใช้ดูแล SignMeeting ไว้ในจุดเดียว</p>
        <ul class="sm-list">
          <li><b>Guided Tour</b> เปิดคำแนะนำชุดนี้ได้ทุกเวลา</li>
          <li><b>Settings</b> ตั้งค่าเลขรันและช่วงเวลาลงทะเบียน</li>
          <li><b>ผู้ปฏิบัติงาน / กลุ่มผู้ร่วมประชุม</b> จัดการ Master Data</li>
          <li><b>Logout</b> ออกจากระบบผู้ดูแลอย่างปลอดภัย</li>
        </ul>
      `,
    ),
    targetedStep(
      "#summaryCards",
      "sm-tour-emerald",
      "ภาพรวมการใช้งาน",
      `
        <p>การ์ดสรุปช่วยตรวจสถานะได้ทันทีโดยไม่ต้องเปิดรายงาน</p>
        <ul class="sm-list">
          <li><span class="sm-chip sm-chip-cyan">Meetings</span> จำนวนการประชุมทั้งหมด</li>
          <li><span class="sm-chip sm-chip-emerald">Attendance</span> จำนวนผู้ลงทะเบียนรวม</li>
        </ul>
        <p class="sm-tip">ตัวเลขจะเปลี่ยนหลังโหลดข้อมูลล่าสุดหรือมีการลงทะเบียนใหม่</p>
      `,
    ),
    targetedStep(
      "#createMeetingButton",
      "sm-tour-amber",
      "สร้างการประชุมใหม่",
      `
        <p>กรอกข้อมูลที่จำเป็น แล้วระบบจะออก Meeting ID และ QR Code หลังบันทึกสำเร็จ</p>
        <ul class="sm-list">
          <li>กำหนดโครงการ ชื่อประชุม วันที่ เวลาเริ่ม-สิ้นสุด และสถานที่</li>
          <li><b>Internal</b> ใช้ QR ผู้ปฏิบัติงาน ส่วน <b>External</b> มีทั้งสองกลุ่ม</li>
          <li>เลือกรายชื่อกลุ่มที่เตรียมไว้ หรือเปิดให้ผู้ร่วมประชุมกรอกหน่วยงานเอง</li>
          <li>แนบรูปประจำกลุ่มได้ไม่เกิน 2 MB ต่อรูป</li>
        </ul>
      `,
    ),
    targetedStep(
      "#meetingsTable",
      "sm-tour-violet",
      "ค้นหาและจัดการการประชุม",
      `
        <p>ตารางนี้เป็นศูนย์กลางของทุกการประชุม พร้อม Live Search, Sorting และ Pagination</p>
        <ul class="sm-list">
          <li><b>รูปตา</b> เลือกการประชุมเพื่อแสดง QR และ Attendance ด้านล่าง</li>
          <li><b>เรียกซ้ำ</b> สร้างรายการใหม่โดยใช้ข้อมูลเดิมเป็นต้นแบบ</li>
          <li><b>ดินสอ</b> แก้ไขข้อมูล เอกสาร รูป และดูประวัติการเปลี่ยนแปลง</li>
          <li><b>ถังขยะ</b> ลบการประชุมพร้อมข้อมูลที่เกี่ยวข้องหลังยืนยัน</li>
        </ul>
        <p class="sm-tip">หลังมีผู้ลงทะเบียน ระบบจะล็อกข้อมูลสำคัญบางรายการเพื่อรักษาความถูกต้อง</p>
      `,
    ),
    targetedStep(
      "#settingsButton",
      "sm-tour-rose",
      "ตั้งค่าระบบ",
      `
        <p>เปิด modal เพื่อควบคุมค่ากลางที่มีผลต่อทุกการประชุม</p>
        <ul class="sm-list">
          <li>กำหนดเลขรันสำหรับ Meeting ID ถัดไป</li>
          <li>กำหนดจำนวนนาทีที่เปิดรับลงทะเบียนหลังเวลาเริ่ม</li>
          <li>การประชุมแต่ละรายการสามารถเปิดรับล่าช้าเป็นกรณีพิเศษได้</li>
        </ul>
      `,
      "left",
    ),
    targetedStep(
      "#internalPeopleButton",
      "sm-tour-indigo",
      "ทะเบียนผู้ปฏิบัติงาน",
      `
        <p>เตรียมรายชื่อผู้ปฏิบัติงานไว้ล่วงหน้า เพื่อลดเวลาพิมพ์ข้อมูลหน้า QR</p>
        <ul class="sm-list">
          <li>เพิ่ม แก้ไข หรือลบชื่อ นามสกุล ตำแหน่ง E-mail และโทรศัพท์</li>
          <li>ผู้ลงทะเบียนค้นหาและเลือกชื่อจากรายการได้ทันที</li>
          <li>ชื่อกลุ่มผู้ปฏิบัติงานของการประชุมจะถูกใช้เป็นหน่วยงาน/สังกัด</li>
        </ul>
      `,
      "left",
    ),
    targetedStep(
      "#participantGroupsButton",
      "sm-tour-amber",
      "กลุ่มและรายชื่อผู้ร่วมประชุม",
      `
        <p>จัด Master Data ขององค์กรภายนอกและรายชื่อในแต่ละกลุ่ม</p>
        <ul class="sm-list">
          <li>ชื่อกลุ่มที่เลือกจะเป็นหน่วยงาน/สังกัดของผู้ร่วมประชุมโดยอัตโนมัติ</li>
          <li>เตรียมรายชื่อให้เลือกจาก dropdown หรือให้ผู้ลงทะเบียนเพิ่มข้อมูลตนเองได้</li>
          <li>หากเลือกไม่ระบุกลุ่ม หน้า QR จะเปิดช่องหน่วยงาน/สังกัดให้กรอกเอง</li>
        </ul>
      `,
      "left",
    ),
    targetedStep(
      "#meetingQrPanel",
      "sm-tour-cyan",
      "QR Code สำหรับลงทะเบียน",
      `
        <p>QR Code แยกตามช่องทางและใช้ลิงก์ที่คาดเดาไม่ได้สำหรับแต่ละการประชุม</p>
        <ul class="sm-list">
          <li>แสดงรูปกลุ่ม ชื่อกลุ่ม และ QR ให้ผู้ใช้เลือกสแกนได้ชัดเจน</li>
          <li>เปิดหน้า QR แบบเต็มใน New Tab สำหรับนำเสนอหน้าห้องประชุม</li>
          <li>จากหน้า New Tab สามารถคัดลอกรูปพร้อมรายละเอียดการประชุมได้</li>
        </ul>
      `,
    ),
    targetedStep(
      "#attendancePanel",
      "sm-tour-emerald",
      "Attendance และการส่งออก",
      `
        <p>ตรวจรายชื่อของ Meeting ID ที่เลือก และจัดเตรียมเอกสารหลังประชุม</p>
        <ul class="sm-list">
          <li>ค้นหา จัดเรียง เปลี่ยนจำนวนแถว และเปลี่ยนการประชุมจาก dropdown</li>
          <li>ลบรายการที่ไม่ถูกต้องได้หลังยืนยันรายชื่อที่ต้องการลบ</li>
          <li>ส่งออก Excel, PDF แนวนอน และ PDF แนวตั้งพร้อมลายเซ็น</li>
        </ul>
        <p class="sm-tip">ตรวจจำนวนผู้เข้าร่วมและข้อมูลติดต่อก่อนส่งออกรายงานทุกครั้ง</p>
      `,
      "top",
    ),
  ];

  return featureSteps.filter((step) => {
    if (typeof step.element !== "string") return true;
    return document.querySelector(step.element) !== null;
  });
}

export async function startSignMeetingAdminTour() {
  const { driver } = await import("driver.js");
  const featureSteps = getAvailableSteps();
  const totalSteps = featureSteps.length + 1;
  const steps: DriveStep[] = [
    {
      popover: {
        align: "center",
        description: `
          <p class="sm-lead">เรียนรู้ workflow ตั้งแต่สร้างการประชุมจนถึงส่งออกรายงาน</p>
          <p>ทัวร์นี้มี <b>${totalSteps} ขั้นตอน</b> และอ้างอิงหน้าจอที่พร้อมใช้งานอยู่ในขณะนี้</p>
          <ul class="sm-list">
            <li>สร้างและควบคุมข้อมูลการประชุม</li>
            <li>จัด Master Data ของผู้ปฏิบัติงานและผู้ร่วมประชุม</li>
            <li>เผยแพร่ QR ติดตาม Attendance และส่งออกรายงาน</li>
          </ul>
          <p class="sm-tip">ใช้ปุ่มลูกศรหรือแป้น Left/Right เพื่อเลื่อนขั้นตอน และกด Esc เพื่อออก</p>
        `,
        popoverClass: "sm-tour sm-tour-welcome",
        title: "ยินดีต้อนรับสู่ SignMeeting",
      },
    },
    ...featureSteps,
  ];

  const tour = driver({
    allowClose: true,
    allowKeyboardControl: true,
    animate: true,
    doneBtnText: doneIcon,
    nextBtnText: nextIcon,
    onPopoverRender: (popover, { driver: activeDriver }) => {
      popover.previousButton.setAttribute("aria-label", "ขั้นตอนก่อนหน้า");
      popover.previousButton.setAttribute("title", "ขั้นตอนก่อนหน้า");
      const isLastStep = activeDriver.isLastStep();
      popover.nextButton.setAttribute(
        "aria-label",
        isLastStep ? "จบ Guided Tour" : "ขั้นตอนถัดไป",
      );
      popover.nextButton.setAttribute(
        "title",
        isLastStep ? "จบ Guided Tour" : "ขั้นตอนถัดไป",
      );
      popover.nextButton.classList.toggle("sm-tour-done", isLastStep);
      popover.closeButton.setAttribute("aria-label", "ปิด Guided Tour");
      popover.closeButton.setAttribute("title", "ปิด Guided Tour");
    },
    overlayColor: "#020617",
    overlayOpacity: 0.76,
    popoverClass: "sm-tour",
    popoverOffset: 14,
    prevBtnText: previousIcon,
    progressText: "ขั้นที่ {{current}} / {{total}}",
    showProgress: true,
    smoothScroll: true,
    stagePadding: 8,
    stageRadius: 14,
    steps,
  });

  tour.drive();
}
