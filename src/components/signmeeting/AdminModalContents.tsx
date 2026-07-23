import { Edit3, RefreshCw, Save, Trash2, X } from "lucide-react";
import type {
  ConfigValues,
  InternalPerson,
} from "@/components/signmeeting/types";
import {
  buttonTone,
  Field,
  iconButtonTone,
  inputBase,
} from "@/components/signmeeting/ui";

export type InternalPersonForm = {
  fname: string;
  lname: string;
  department: string;
  position: string;
  email: string;
  phone: string;
};

type SettingsAdminContentProps = {
  config: ConfigValues;
  onChange: (config: ConfigValues) => void;
  onClose: () => void;
  onSave: () => void;
};

export function SettingsAdminContent({
  config,
  onChange,
  onClose,
  onSave,
}: SettingsAdminContentProps) {
  return (
    <div className="grid gap-4">
      <p className="text-sm text-slate-400">กำหนดค่า Config ของระบบ</p>
      <Field label="Meeting Running">
        <input
          className={inputBase}
          inputMode="numeric"
          value={config.meeting_running ?? ""}
          onChange={(event) =>
            onChange({ ...config, meeting_running: event.target.value })
          }
        />
      </Field>
      <Field label="Register Time Limit (minutes)">
        <input
          className={inputBase}
          inputMode="numeric"
          value={config.close_time ?? ""}
          onChange={(event) =>
            onChange({ ...config, close_time: event.target.value })
          }
        />
      </Field>
      <div className="flex justify-end gap-3 border-t border-slate-700 pt-4">
        <button className={buttonTone("muted")} onClick={onClose} type="button">
          <X className="h-4 w-4" /> ปิด
        </button>
        <button className={buttonTone("save")} onClick={onSave} type="button">
          <Save className="h-4 w-4" /> บันทึก Settings
        </button>
      </div>
    </div>
  );
}

type InternalPeopleAdminContentProps = {
  editingPersonId: number | null;
  form: InternalPersonForm;
  onChange: (form: InternalPersonForm) => void;
  onDelete: (person: InternalPerson) => void;
  onEdit: (person: InternalPerson) => void;
  onReset: () => void;
  onSave: () => void;
  people: InternalPerson[];
};

export function InternalPeopleAdminContent({
  editingPersonId,
  form,
  onChange,
  onDelete,
  onEdit,
  onReset,
  onSave,
  people,
}: InternalPeopleAdminContentProps) {
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-400">
          ใช้เป็น dropdown สำหรับ QR ผู้ปฏิบัติงาน
        </p>
        <button className={buttonTone("muted")} onClick={onReset} type="button">
          <RefreshCw className="h-4 w-4" /> ล้างฟอร์ม
        </button>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-700 bg-slate-950/40 p-4 md:grid-cols-2 xl:grid-cols-5">
        <input
          className={inputBase}
          placeholder="ชื่อ"
          value={form.fname}
          onChange={(event) => onChange({ ...form, fname: event.target.value })}
        />
        <input
          className={inputBase}
          placeholder="นามสกุล"
          value={form.lname}
          onChange={(event) => onChange({ ...form, lname: event.target.value })}
        />
        <input
          className={inputBase}
          placeholder="ตำแหน่ง"
          value={form.position}
          onChange={(event) =>
            onChange({ ...form, position: event.target.value })
          }
        />
        <input
          className={inputBase}
          placeholder="E-mail"
          type="email"
          value={form.email}
          onChange={(event) => onChange({ ...form, email: event.target.value })}
        />
        <input
          className={inputBase}
          inputMode="tel"
          placeholder="โทรศัพท์"
          type="tel"
          value={form.phone}
          onChange={(event) => onChange({ ...form, phone: event.target.value })}
        />
        <button
          className={`${buttonTone("save")} md:col-span-2 xl:col-span-5`}
          onClick={onSave}
          type="button"
        >
          <Save className="h-4 w-4" />{" "}
          {editingPersonId
            ? "บันทึกการแก้ไขผู้ปฏิบัติงาน"
            : "เพิ่มผู้ปฏิบัติงาน"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-slate-950 text-slate-300">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">โทรศัพท์</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.intPid} className="border-t border-slate-800">
                <td className="px-4 py-3 font-semibold text-amber-300">
                  {person.intPid}
                </td>
                <td className="px-4 py-3">
                  {person.fname} {person.lname}
                </td>
                <td className="px-4 py-3">{person.position}</td>
                <td className="px-4 py-3">{person.email || "-"}</td>
                <td className="px-4 py-3">{person.phone || "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      aria-label={`แก้ไข ${person.fname}`}
                      className={iconButtonTone("edit")}
                      onClick={() => onEdit(person)}
                      title="แก้ไข"
                      type="button"
                    >
                      <Edit3 className="h-5 w-5" />
                    </button>
                    <button
                      aria-label={`ลบ ${person.fname}`}
                      className={iconButtonTone("delete")}
                      onClick={() => onDelete(person)}
                      title="ลบ"
                      type="button"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {people.length === 0 && (
              <tr>
                <td
                  className="px-4 py-8 text-center text-slate-400"
                  colSpan={6}
                >
                  ยังไม่มีข้อมูลผู้ปฏิบัติงาน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
