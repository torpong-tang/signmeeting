"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import type {
  ParticipantGroup,
  ParticipantPerson,
} from "@/components/signmeeting/types";
import {
  buttonTone,
} from "@/components/signmeeting/ui";
import {
  requestJson,
  requestOk,
} from "@/components/signmeeting/api-client";
import {
  ParticipantGroupPanel,
  ParticipantPeoplePanel,
  type ParticipantPersonForm,
} from "@/components/signmeeting/ParticipantDirectoryPanels";

const emptyPerson = {
  fname: "",
  lname: "",
  position: "",
  email: "",
  phone: "",
};

type Props = {
  onConfirm: (message: string, action: () => Promise<void>) => void;
  onLoading: (loading: boolean) => void;
  onNotify: (message: string) => void;
};

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
        const data = await requestJson<ParticipantGroup[]>(
          "/api/participant-groups",
          undefined,
          "ไม่สามารถโหลดกลุ่มผู้ร่วมประชุมได้",
        );
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
          const saved = await requestJson<ParticipantGroup>(
            editingGroupId
              ? `/api/participant-groups/${editingGroupId}`
              : "/api/participant-groups",
            {
              method: editingGroupId ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name }),
            },
            "ไม่สามารถบันทึกกลุ่มได้",
          );
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
          await requestOk(
            `/api/participant-groups/${group.groupId}`,
            { method: "DELETE" },
            "ไม่สามารถลบกลุ่มได้",
          );
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
          await requestOk(
            editingPersonId
              ? `/api/participant-groups/${currentGroupId}/people/${editingPersonId}`
              : `/api/participant-groups/${currentGroupId}/people`,
            {
              method: editingPersonId ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(personForm),
            },
            "ไม่สามารถบันทึกรายชื่อผู้ร่วมประชุมได้",
          );
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
          await requestOk(
            `/api/participant-groups/${currentGroupId}/people/${person.participantId}`,
            { method: "DELETE" },
            "ไม่สามารถลบรายชื่อผู้ร่วมประชุมได้",
          );
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
        <ParticipantGroupPanel
          editingGroupId={editingGroupId}
          groupName={groupName}
          groups={groups}
          selectedGroup={selectedGroup}
          onDelete={deleteGroup}
          onEdit={startEditGroup}
          onGroupNameChange={setGroupName}
          onReset={resetGroupForm}
          onSave={saveGroup}
          onSelect={selectGroup}
        />
        <ParticipantPeoplePanel
          editingPersonId={editingPersonId}
          form={personForm}
          selectedGroup={selectedGroup}
          onDelete={deletePerson}
          onEdit={startEditPerson}
          onFormChange={setPersonForm}
          onReset={resetPersonForm}
          onSave={savePerson}
        />
      </div>
    </div>
  );
}
