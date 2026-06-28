<template>
  <div class="dashboard-container">
    <!-- 팀 선택 탭 -->
    <nav class="team-tabs">
      <button
        v-for="team in teamStore.teams"
        :key="team.id"
        :class="{ active: team.id === teamStore.currentTeamId }"
        @click="selectTeam(team.id)"
      >
        {{ team.name }}
      </button>
    </nav>

    <div v-if="teamStore.currentTeam" class="team-content">
      <!-- 진척도 표시 -->
      <div v-if="teamStore.currentProgress" class="progress-info">
        <h2>{{ teamStore.currentProgress.title }}</h2>
        <p>{{ teamStore.currentProgress.description }}</p>
      </div>

      <!-- 게시판 -->
      <BambooBoard :key="teamStore.currentTeamId" />
    </div>
    <div v-else class="no-team-selected">
      <p>팀을 선택해주세요.</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useTeamStore } from "@/stores/team";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";
import BambooBoard from "@/views/BambooBoard.vue";

const teamStore = useTeamStore();
const authStore = useAuthStore();
const router = useRouter();

onMounted(async () => {
  await teamStore.fetchTeams();
  // 사용자가 속한 팀을 기본으로 선택하거나, 첫 번째 팀을 선택합니다.
  if (authStore.userProfile?.team_id) {
    selectTeam(authStore.userProfile.team_id);
  } else if (teamStore.teams.length > 0) {
    selectTeam(teamStore.teams[0].id);
  }
});

const selectTeam = (teamId) => {
  teamStore.setCurrentTeam(teamId);
  router.push({ name: "TeamBoard", params: { teamId } });
};
</script>
