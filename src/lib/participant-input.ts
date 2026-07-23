const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeParticipantGroupName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function validateParticipantGroupName(name: string) {
  if (!name) return "กรุณากรอกชื่อกลุ่มผู้ร่วมประชุม";
  if (name.length > 120) return "ชื่อกลุ่มผู้ร่วมประชุมต้องไม่เกิน 120 ตัวอักษร";
  return null;
}

export function normalizeParticipantPersonInput(body: Record<string, unknown>) {
  return {
    fname: String(body.fname ?? "").trim(),
    lname: String(body.lname ?? "").trim(),
    position: String(body.position ?? "").trim(),
    email: String(body.email ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
  };
}

export function validateParticipantPersonInput(
  person: ReturnType<typeof normalizeParticipantPersonInput>,
) {
  if (!person.fname || !person.lname || !person.position) {
    return "กรุณากรอกชื่อ นามสกุล และตำแหน่งให้ครบถ้วน";
  }
  if (person.email && !EMAIL_PATTERN.test(person.email)) {
    return "กรุณากรอก E-mail ให้ถูกต้อง";
  }
  return null;
}
