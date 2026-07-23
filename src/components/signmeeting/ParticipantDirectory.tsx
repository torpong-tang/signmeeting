"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Edit3,
  FolderPlus,
  RefreshCw,
  Save,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { appPath } from "@/lib/paths";
import type {
  ParticipantGroup,
  ParticipantPerson,
} from "@/components/signmeeting/types";
import {
  buttonTone,
  iconButtonTone,
  inputBase,
} from "@/components/signmeeting/ui";

const emptyPerson = {
  fname: "",
  lname: "",
  position: "",
  email: "",
  phone: "",
};

type ParticipantPersonForm = typeof emptyPerson;

type Props = {
  onConfirm: (message: string, action: () => Promise<void>) => void;
  onLoading: (loading: boolean) => void;
  onNotify: (message: string) => void;
};

async function getResponseError(response: Response, fallback: string) {
  const result = (await response.json().catch(() => ({}))) as { error?: string };
  return result.error || fallback;
}

export function ParticipantDirectory({
  onConfirm,
  onLoading,
  onNotify,
}: Props) {
  const [groups, setGroups] = useState<ParticipantGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupName, setGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [personForm, setPersonForm] = useState<ParticipantPersonForm>(emptyPerson);
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.groupId === selectedGroupId) ?? groups[0] ?? null,
    [groups, selectedGroupId],
  );

  const loadGroups = useCallback(
    async (preferredGroupId?: number | null) => {
      onLoading(true);
      try {
        const response = await fetch(appPath("/api/participant-groups"));
        if (!response.ok) {
          throw new Error(await getResponseError(response, "ไม่สามารถโหลดกลุ่มผู้ร่วมประชุมได้"));
        }
        const data = (await response.json()) as ParticipantGroup[];
        setGroups(data);
        const nextId =
          data.find((group) => group.groupId === preferredGroupId)?.groupId ??
          data.find((group) => group.groupId === selectedGroupId)?.groupId ??
          data[0]?.groupId ??
          null;
        setSelectedGroupId(nextId);
      } catch (error) {
        onNotify(error instanceof Error ? error.message : "ไม่สามารถโหลดกลุ่มผู้ร่วมประชุมได้");
      } finally {
        onLoading(false);
      }
    },
    [onLoading, onNotify, selectedGroupId],
  );

  useEffect(() => {
    // The modal owns this remote data and loads it once after mounting.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetGroupForm() {
    setEditingGroupId(null);
    setGroupName("");
  }

  function resetPersonForm() {
    setEditingPersonId(null);
    setPersonForm(emptyPerson);
  }

  function selectGroup(groupId: number) {
    setSelectedGroupId(groupId);
    resetPersonForm();
  }

  function startEditGroup(group: ParticipantGroup) {
    setEditingGroupId(group.groupId);
    setGroupName(group.name);
  }

  function saveGroup() {
    const name = groupName.trim();
    if (!name) {
      onNotify("กรุณากรอกชื่อกลุ่มผู้ร่วมประชุม");
      return;
    }

    onConfirm(
      editingGroupId
        ? `ยืนยันการแก้ไขชื่อกลุ่มเป็น “${name}”?`
        : `ยืนยันการเพิ่มกลุ่มผู้ร่วมประชุม “${name}”?`,
      async () => {
        onLoading(true);
        try {
          const response = await fetch(
            appPath(
              editingGroupId
                ? `/api/participant-groups/${editingGroupId}`
                : "/api/participant-groups",
            ),
            {
              method: editingGroupId ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name }),
            },
          );
          if (!response.ok) {
            throw new Error(await getResponseError(response, "ไม่สามารถบันทึกกลุ่มได้"));
          }
          const saved = (await response.json()) as ParticipantGroup;
          resetGroupForm();
          await loadGroups(saved.groupId);
          onNotify(editingGroupId ? "แก้ไขกลุ่มเรียบร้อยแล้ว" : "เพิ่มกลุ่มเรียบร้อยแล้ว");
        } catch (error) {
          onNotify(error instanceof Error ? error.message : "ไม่สามารถบันทึกกลุ่มได้");
        } finally {
          onLoading(false);
        }
      },
    );
  }

  function deleteGroup(group: ParticipantGroup) {
    onConfirm(
      `ยืนยันการลบกลุ่ม “${group.name}” และซ่อนรายชื่อ ${group.people.length} คนในกลุ่มนี้?`,
      async () => {
        onLoading(true);
        try {
          const response = await fetch(appPath(`/api/participant-groups/${group.groupId}`), {
            method: "DELETE",
          });
          if (!response.ok) {
            throw new Error(await getResponseError(response, "ไม่สามารถลบกลุ่มได้"));
          }
          if (editingGroupId === group.groupId) resetGroupForm();
          resetPersonForm();
          await loadGroups(null);
          onNotify("ลบกลุ่มผู้ร่วมประชุมเรียบร้อยแล้ว");
        } catch (error) {
          onNotify(error instanceof Error ? error.message : "ไม่สามารถลบกลุ่มได้");
        } finally {
          onLoading(false);
        }
      },
    );
  }

  function startEditPerson(person: ParticipantPerson) {
    setEditingPersonId(person.participantId);
    setPersonForm({
      fname: person.fname,
      lname: person.lname,
      position: person.position,
      email: person.email ?? "",
      phone: person.phone ?? "",
    });
  }

  function savePerson() {
    if (!selectedGroup) {
      onNotify("กรุณาสร้างและเลือกกลุ่มผู้ร่วมประชุมก่อน");
      return;
    }
    if (!personForm.fname.trim() || !personForm.lname.trim() || !personForm.position.trim()) {
      onNotify("กรุณากรอกชื่อ นามสกุล และตำแหน่งให้ครบถ้วน");
      return;
    }
    if (
      personForm.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personForm.email.trim())
    ) {
      onNotify("กรุณากรอก E-mail ให้ถูกต้อง");
      return;
    }

    const currentGroupId = selectedGroup.groupId;
    onConfirm(
      editingPersonId
        ? `ยืนยันการแก้ไข ${personForm.fname} ${personForm.lname}?`
        : `ยืนยันการเพิ่ม ${personForm.fname} ${personForm.lname} ในกลุ่ม “${selectedGroup.name}”?`,
      async () => {
        onLoading(true);
        try {
          const response = await fetch(
            appPath(
              editingPersonId
                ? `/api/participant-groups/${currentGroupId}/people/${editingPersonId}`
                : `/api/participant-groups/${currentGroupId}/people`,
            ),
            {
              method: editingPersonId ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(personForm),
            },
          );
          if (!response.ok) {
            throw new Error(
              await getResponseError(response, "ไม่สามารถบันทึกรายชื่อผู้ร่วมประชุมได้"),
            );
          }
          const wasEditing = Boolean(editingPersonId);
          resetPersonForm();
          await loadGroups(currentGroupId);
          onNotify(
            wasEditing
              ? "แก้ไขรายชื่อผู้ร่วมประชุมเรียบร้อยแล้ว"
              : "เพิ่มรายชื่อผู้ร่วมประชุมเรียบร้อยแล้ว",
          );
        } catch (error) {
          onNotify(
            error instanceof Error ? error.message : "ไม่สามารถบันทึกรายชื่อผู้ร่วมประชุมได้",
          );
        } finally {
          onLoading(false);
        }
      },
    );
  }

  function deletePerson(person: ParticipantPerson) {
    if (!selectedGroup) return;
    const currentGroupId = selectedGroup.groupId;
    onConfirm(
      `ยืนยันการลบ ${person.fname} ${person.lname} ออกจากกลุ่ม “${selectedGroup.name}”?`,
      async () => {
        onLoading(true);
        try {
          const response = await fetch(
            appPath(
              `/api/participant-groups/${currentGroupId}/people/${person.participantId}`,
            ),
            { method: "DELETE" },
          );
          if (!response.ok) {
            throw new Error(
              await getResponseError(response, "ไม่สามารถลบรายชื่อผู้ร่วมประชุมได้"),
            );
          }
          if (editingPersonId === person.participantId) resetPersonForm();
          await loadGroups(currentGroupId);
          onNotify("ลบรายชื่อผู้ร่วมประชุมเรียบร้อยแล้ว");
        } catch (error) {
          onNotify(
            error instanceof Error ? error.message : "ไม่สามารถลบรายชื่อผู้ร่วมประชุมได้",
          );
        } finally {
          onLoading(false);
        }
      },
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 border-b border-slate-700 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-amber-200">ทะเบียนกลุ่มและรายชื่อผู้ร่วมประชุม</p>
          <p className="text-sm text-slate-400">
            เตรียมไว้สำหรับเลือกกลุ่มและบุคคลในขั้นตอนลงทะเบียนรอบถัดไป
          </p>
        </div>
        <button
          className={buttonTone("muted")}
          onClick={() => void loadGroups(selectedGroup?.groupId)}
          type="button"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
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
              onChange={(event) => setGroupName(event.target.value)}
            />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button className={buttonTone("save")} onClick={saveGroup} type="button">
                {editingGroupId ? <Save className="h-4 w-4" /> : <FolderPlus className="h-4 w-4" />}
                {editingGroupId ? "บันทึกชื่อกลุ่ม" : "เพิ่มกลุ่ม"}
              </button>
              {editingGroupId && (
                <button
                  aria-label="ยกเลิกแก้ไขกลุ่ม"
                  className={iconButtonTone("muted")}
                  onClick={resetGroupForm}
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
                  onClick={() => selectGroup(group.groupId)}
                  type="button"
                >
                  <span className="block truncate font-semibold text-slate-100">{group.name}</span>
                  <span className="text-xs text-slate-400">{group.people.length} รายชื่อ</span>
                </button>
                <button
                  aria-label={`แก้ไขกลุ่ม ${group.name}`}
                  className={iconButtonTone("edit")}
                  onClick={() => startEditGroup(group)}
                  title="แก้ไขชื่อกลุ่ม"
                  type="button"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  aria-label={`ลบกลุ่ม ${group.name}`}
                  className={iconButtonTone("delete")}
                  onClick={() => deleteGroup(group)}
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
              value={personForm.fname}
              onChange={(event) => setPersonForm({ ...personForm, fname: event.target.value })}
            />
            <input
              className={inputBase}
              disabled={!selectedGroup}
              placeholder="นามสกุล *"
              value={personForm.lname}
              onChange={(event) => setPersonForm({ ...personForm, lname: event.target.value })}
            />
            <input
              className={inputBase}
              disabled={!selectedGroup}
              placeholder="ตำแหน่ง *"
              value={personForm.position}
              onChange={(event) => setPersonForm({ ...personForm, position: event.target.value })}
            />
            <input
              className={inputBase}
              disabled={!selectedGroup}
              placeholder="E-mail"
              type="email"
              value={personForm.email}
              onChange={(event) => setPersonForm({ ...personForm, email: event.target.value })}
            />
            <input
              className={inputBase}
              disabled={!selectedGroup}
              inputMode="tel"
              placeholder="โทรศัพท์"
              type="tel"
              value={personForm.phone}
              onChange={(event) => setPersonForm({ ...personForm, phone: event.target.value })}
            />
            <div className="flex gap-2 md:col-span-2 xl:col-span-5">
              <button
                className={`${buttonTone("save")} flex-1`}
                disabled={!selectedGroup}
                onClick={savePerson}
                type="button"
              >
                {editingPersonId ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {editingPersonId ? "บันทึกการแก้ไขรายชื่อ" : "เพิ่มรายชื่อผู้ร่วมประชุม"}
              </button>
              {editingPersonId && (
                <button
                  className={buttonTone("muted")}
                  onClick={resetPersonForm}
                  type="button"
                >
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
                    <td className="px-4 py-3 font-semibold text-amber-300">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">{person.fname} {person.lname}</td>
                    <td className="px-4 py-3">{person.position}</td>
                    <td className="px-4 py-3">{person.email || "-"}</td>
                    <td className="px-4 py-3">{person.phone || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          aria-label={`แก้ไข ${person.fname}`}
                          className={iconButtonTone("edit")}
                          onClick={() => startEditPerson(person)}
                          title="แก้ไขรายชื่อ"
                          type="button"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          aria-label={`ลบ ${person.fname}`}
                          className={iconButtonTone("delete")}
                          onClick={() => deletePerson(person)}
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
      </div>
    </div>
  );
}
