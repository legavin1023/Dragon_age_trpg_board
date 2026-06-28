import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { supabase } from "@/lib/supabaseClient";

export const useTeamStore = defineStore("team", () => {
  const teams = ref([]);
  const currentTeamId = ref(null);
  const isLoading = ref(false); // 1. 로딩 상태 관리 변수 추가

  const currentTeam = computed(() => {
    return teams.value.find((team) => team.id === currentTeamId.value);
  });

  async function fetchTeams() {
    const { data, error } = await supabase.from("teams").select(
      `
        *,
        progress_stages (
          title,
          description
        )
      `
    );
    if (error) {
      console.error("Error fetching teams:", error);
      return;
    }
    teams.value = data;
  }

  async function setCurrentTeam(teamId) {
    if (!teamId) {
      currentTeamId.value = null;
      return;
    }

    isLoading.value = true;

    // 1. 요청 직전 로그
    console.log("📥 Supabase 요청 시작. 팀 ID:", teamId);

    try {
      const { data, error } = await supabase
        .from("teams")
        .select(
          `
          *,
          progress_stages(title, description)
        `
        )
        .eq("id", teamId)
        .single();

      // 2. 응답 직후 로그
      console.log("📤 Supabase 응답 결과:", data);
      console.log("⚠️ 에러 확인:", error);

      if (error) throw error;

      if (data) {
        const index = teams.value.findIndex((t) => t.id === teamId);
        if (index !== -1) teams.value[index] = data; // 기존 데이터 업데이트
        else teams.value.push(data); // 새 데이터 추가
        currentTeamId.value = teamId; // currentTeamId 설정
        console.log("✅ 스토어에 데이터 저장 완료:", currentTeam.value);
      }
    } catch (err) {
      console.error("데이터 로드 중 에러 발생:", err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 팀의 진행 단계를 업데이트합니다. (관리자용)
   * @param {number} teamId - 업데이트할 팀의 ID
   * @param {number} newStep - 새로운 진행 단계
   */
  async function updateProgress(teamId, newStep) {
    const { error } = await supabase
      .from("teams")
      .update({ progress_step: newStep })
      .eq("id", teamId);

    if (error) {
      console.error("Error updating progress step:", error.message);
      // RLS 정책 등으로 인해 권한이 없는 경우 사용자에게 알림
      alert("권한이 없습니다.");
      return;
    }

    // 업데이트 성공 후, 최신 팀 정보를 다시 불러와 로컬 상태를 갱신합니다.
    const { data: updatedTeam, error: fetchError } = await supabase
      .from("teams")
      .select(
        `
        *,
        progress_stages (
          title,
          description
        )
      `
      )
      .eq("id", teamId)
      .single();

    if (fetchError) {
      console.error("Error re-fetching team data:", fetchError);
      return;
    }

    const teamIndex = teams.value.findIndex((t) => t.id === teamId);
    if (teamIndex !== -1) {
      teams.value[teamIndex] = updatedTeam;
    }
  }

  /**
   * 현재 팀의 진행 단계를 1 증가시킵니다.
   */
  async function increaseProgressStep() {
    if (!currentTeam.value) return;
    // 전체 단계 수를 초과하지 않도록 방어합니다.
    if (currentTeam.value.progress_step >= currentTeam.value.total_steps) {
      return; // 마지막 단계이면 더 이상 증가시키지 않습니다.
    }
    const newStep = currentTeam.value.progress_step + 1;
    await updateProgress(currentTeam.value.id, newStep);
  }

  /**
   * 현재 팀의 진행 단계를 1 감소시킵니다.
   */
  async function decreaseProgressStep() {
    if (!currentTeam.value) return;

    // 단계가 0보다 작아지지 않도록 방어합니다.
    const newStep = Math.max(0, currentTeam.value.progress_step - 1);
    if (newStep === currentTeam.value.progress_step) return; // 변경점이 없으면 함수 종료

    await updateProgress(currentTeam.value.id, newStep);
  }

  return {
    teams,
    currentTeamId,
    currentTeam,
    isLoading, // 외부에서 사용할 수 있도록 노출
    fetchTeams,
    setCurrentTeam,
    // 새로 추가된 함수들을 반환 객체에 포함합니다.
    increaseProgressStep,
    decreaseProgressStep,
    updateProgress,
  };
});
