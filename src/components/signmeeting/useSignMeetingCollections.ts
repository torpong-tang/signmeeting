"use client";

import { useCallback, useState } from "react";
import type {
  ConfigValues,
  InternalPerson,
  Meeting,
  ParticipantGroup,
} from "@/components/signmeeting/types";
import { requestJson } from "@/components/signmeeting/api-client";

type Options = {
  selectedId: string;
  setSelectedId: (meetingId: string) => void;
  setLoading: (loading: boolean) => void;
};

export function useSignMeetingCollections({
  selectedId,
  setSelectedId,
  setLoading,
}: Options) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [config, setConfig] = useState<ConfigValues>({});
  const [people, setPeople] = useState<InternalPerson[]>([]);
  const [participantGroups, setParticipantGroups] = useState<ParticipantGroup[]>([]);

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestJson<Meeting[]>(
        "/api/meetings",
        undefined,
        "ไม่สามารถโหลดรายการประชุมได้",
      );
      setMeetings(data);
      if (!selectedId && data[0]) setSelectedId(data[0].meetingId);
    } finally {
      setLoading(false);
    }
  }, [selectedId, setLoading, setSelectedId]);

  const loadSettings = useCallback(async () => {
    const [nextConfig, nextPeople, nextParticipantGroups] = await Promise.all([
      requestJson<ConfigValues>(
        "/api/config",
        undefined,
        "ไม่สามารถโหลดการตั้งค่าได้",
      ),
      requestJson<InternalPerson[]>(
        "/api/internal-people",
        undefined,
        "ไม่สามารถโหลดรายชื่อผู้ปฏิบัติงานได้",
      ),
      requestJson<ParticipantGroup[]>(
        "/api/participant-groups",
        undefined,
        "ไม่สามารถโหลดกลุ่มผู้ร่วมประชุมได้",
      ),
    ]);
    setConfig(nextConfig);
    setPeople(nextPeople);
    setParticipantGroups(nextParticipantGroups);
  }, []);

  return {
    config,
    loadMeetings,
    loadSettings,
    meetings,
    participantGroups,
    people,
    setConfig,
  };
}
