<template>
  <div class="app-layout">
    <button @click="handleLogout" class="logout-button">로그아웃</button>

    <img
      src="@/assets/images/358-3589454_dragon-age-origins-dragon-age-origins-logo-png.png"
      alt="Logo"
      class="logo"
    />
    <div v-if="authStore.userProfile" class="user-actions">
      <img
        :src="getProfileImage(authStore.userProfile.username)"
        alt="Profile"
        class="profile-image"
      />
      <span class="username">
        환영합니다, {{ formatTitle(authStore.userProfile.username) }}!
      </span>
    </div>
    <header class="top-nav-bar">
      <nav v-if="authStore.loggedIn" class="team-tabs">
        <router-link
          :to="{ name: 'NoticeList' }"
          class="team-tab-link team-box"
          active-class="active"
        >
          공지사항
        </router-link>
        <router-link
          v-for="team in teamStore.teams"
          :key="team.id"
          :to="{ name: 'TeamBoard', params: { teamId: team.id } }"
          class="team-tab-link team-box"
          :class="{
            'my-team':
              authStore.userProfile &&
              team.id === authStore.userProfile.team_id,
          }"
          active-class="active"
        >
          {{ team.name }}
        </router-link>
      </nav>
    </header>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useTeamStore } from "@/stores/team";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";

const teamStore = useTeamStore();
const authStore = useAuthStore();
const router = useRouter();

// 이름 정제 함수
const formatTitle = (fullName) => {
  if (!fullName) return "";
  return fullName.replace(/^[A-Za-z]\s+|\s*\[.*\]/g, "").trim();
};

// 프로필 이미지 경로를 가져오는 함수
const getProfileImage = (fullName) => {
  const cleanedName = formatTitle(fullName);
  try {
    return require(`@/assets/profiles/${cleanedName}.webp`);
  } catch (e) {
    return require(`@/assets/profiles/default.webp`);
  }
};

onMounted(() => {
  teamStore.fetchTeams();
});

const handleLogout = () => {
  authStore.logout();
  router.push({ name: "Login" });
};
</script>
