"use client";

import {
  Edit3,
  FolderPlus,
  RefreshCw,
  Save,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type {
  ParticipantGroup,
  ParticipantPerson,
} from "@/components/signmeeting/types";
import {
  buttonTone,
  iconButtonTone,
  inputBase,
} from "@/components/signmeeting/ui";

export type ParticipantPersonForm = {
  fname: string;
  lname: string;
  position: string;
  email: string;
  phone: string;
};

type GroupPanelProps = {
  editingGroupId: number | null;
  groupName: string;
  groups: ParticipantGroup[];
  selectedGroup: ParticipantGroup | null;
  onDelete: (group: ParticipantGroup) => void;
  onEdit: (group: ParticipantGroup) => void;
  onGroupNameChange: (name: string) => void;
  onReset: () => void;
  onSave: () => void;
  onSelect: (groupId: number) => void;
};

export function ParticipantGroupPanel({
  editingGroupId,
  groupName,
  groups,
  selectedGroup,
  onDelete,
  onEdit,
  onGroupNameChange,
  onReset,
  onSave,
  onSelect,
}: GroupPanelProps) {
  return (
    <aside className="border-r-0 border-slate-700 lg:border-r lg:pr-5">
      <div className="mb-4 grid gap-3">
        <label className="text-sm font-semibold text-slate-200" htmlFor="participantGroupName">
          ชื่อกลุ่มผู้ร่วมประชุม <span className="text-rose-400">*</span>
        </label>
        <input
          className={inputBase}
          id="participantGroupName"
          maxLength={120}
          placeholder="เช่น สำนักงาน ป.ป.ท."
          value={groupName}
          onChange={(event) => onGroupNameChange(event.target.value)}
        />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button className={buttonTone("save")} onClick={onSave} type="button">
            {editingGroupId ? <Save className="h-4 w-4" /> : <FolderPlus className="h-4 w-4" />}
            {editingGroupId ? "บันทึกชื่อกลุ่ม" : "เพิ่มกลุ่ม"}
          </button>
          {editingGroupId && (
            <button
              aria-label="ยกเลิกแก้ไขกลุ่ม"
              className={iconButtonTone("muted")}
              onClick={onReset}
              title="ยกเลิกแก้ไขกลุ่ม"
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid max-h-[52vh] gap-2 overflow-y-auto pr-1">
        {groups.map((group) => (
          <div
            className={`flex items-center gap-2 border px-3 py-3 ${
              selectedGroup?.groupId === group.groupId
                ? "border-amber-400 bg-amber-400/10"
                : "border-slate-700 bg-slate-950/35"
            }`}
            key={group.groupId}
          >
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => onSelect(group.groupId)}
              type="button"
            >
              <span className="block truncate font-semibold text-slate-100">{group.name}</span>
              <span className="text-xs text-slate-400">{group.people.length} รายชื่อ</span>
            </button>
            <button
              aria-label={`แก้ไขกลุ่ม ${group.name}`}
              className={iconButtonTone("edit")}
              onClick={() => onEdit(group)}
              title="แก้ไขชื่อกลุ่ม"
              type="button"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              aria-label={`ลบกลุ่ม ${group.name}`}
              className={iconButtonTone("delete")}
              onClick={() => onDelete(group)}
              title="ลบกลุ่ม"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
            <UsersRound className="mx-auto mb-2 h-8 w-8 text-amber-300" />
            ยังไม่มีกลุ่มผู้ร่วมประชุม
          </div>
        )}
      </div>
    </aside>
  );
}

type PeoplePanelProps = {
  editingPersonId: number | null;
  form: ParticipantPersonForm;
  selectedGroup: ParticipantGroup | null;
  onDelete: (person: ParticipantPerson) => void;
  onEdit: (person: ParticipantPerson) => void;
  onFormChange: (form: ParticipantPersonForm) => void;
  onReset: () => void;
  onSave: () => void;
};

export function ParticipantPeoplePanel({
  editingPersonId,
  form,
  selectedGroup,
  onDelete,
  onEdit,
  onFormChange,
  onReset,
  onSave,
}: PeoplePanelProps) {
  return (
    <section className="min-w-0">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-100">
          {selectedGroup ? `รายชื่อในกลุ่ม: ${selectedGroup.name}` : "รายชื่อผู้ร่วมประชุม"}
        </h3>
        <p className="text-sm text-slate-400">
          ชื่อกลุ่มจะใช้เป็นข้อมูลหน่วยงาน/สังกัดเมื่อนำ master data นี้ไปใช้งาน
        </p>
      </div>

      <div className="mb-5 grid gap-3 border-y border-slate-700 bg-slate-950/30 py-4 md:grid-cols-2 xl:grid-cols-5">
        <input
          className={inputBase}
          disabled={!selectedGroup}
          placeholder="ชื่อ *"
          value={form.fname}
          onChange={(event) => onFormChange({ ...form, fname: event.target.value })}
        />
        <input
          className={inputBase}
          disabled={!selectedGroup}
          placeholder="นามสกุล *"
          value={form.lname}
          onChange={(event) => onFormChange({ ...form, lname: event.target.value })}
        />
        <input
          className={inputBase}
          disabled={!selectedGroup}
          placeholder="ตำแหน่ง *"
          value={form.position}
          onChange={(event) => onFormChange({ ...form, position: event.target.value })}
        />
        <input
          className={inputBase}
          disabled={!selectedGroup}
          placeholder="E-mail"
          type="email"
          value={form.email}
          onChange={(event) => onFormChange({ ...form, email: event.target.value })}
        />
        <input
          className={inputBase}
          disabled={!selectedGroup}
          inputMode="tel"
          placeholder="โทรศัพท์"
          type="tel"
          value={form.phone}
          onChange={(event) => onFormChange({ ...form, phone: event.target.value })}
        />
        <div className="flex gap-2 md:col-span-2 xl:col-span-5">
          <button
            className={`${buttonTone("save")} flex-1`}
            disabled={!selectedGroup}
            onClick={onSave}
            type="button"
          >
            {editingPersonId ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {editingPersonId ? "บันทึกการแก้ไขรายชื่อ" : "เพิ่มรายชื่อผู้ร่วมประชุม"}
          </button>
          {editingPersonId && (
            <button className={buttonTone("muted")} onClick={onReset} type="button">
              <RefreshCw className="h-4 w-4" /> ยกเลิกแก้ไข
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-700">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-950 text-slate-300">
            <tr>
              <th className="px-4 py-3">ลำดับ</th>
              <th className="px-4 py-3">ชื่อ-นามสกุล</th>
              <th className="px-4 py-3">ตำแหน่ง</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">โทรศัพท์</th>
              <th className="px-4 py-3">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {(selectedGroup?.people ?? []).map((person, index) => (
              <tr className="border-t border-slate-800" key={person.participantId}>
                <td className="px-4 py-3 font-semibold text-amber-300">{index + 1}</td>
                <td className="px-4 py-3">{person.fname} {person.lname}</td>
                <td className="px-4 py-3">{person.position}</td>
                <td className="px-4 py-3">{person.email || "-"}</td>
                <td className="px-4 py-3">{person.phone || "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      aria-label={`แก้ไข ${person.fname}`}
                      className={iconButtonTone("edit")}
                      onClick={() => onEdit(person)}
                      title="แก้ไขรายชื่อ"
                      type="button"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      aria-label={`ลบ ${person.fname}`}
                      className={iconButtonTone("delete")}
                      onClick={() => onDelete(person)}
                      title="ลบรายชื่อ"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {selectedGroup && selectedGroup.people.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={6}>
                  ยังไม่มีรายชื่อในกลุ่มนี้
                </td>
              </tr>
            )}
            {!selectedGroup && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={6}>
                  กรุณาสร้างกลุ่มผู้ร่วมประชุมก่อน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
