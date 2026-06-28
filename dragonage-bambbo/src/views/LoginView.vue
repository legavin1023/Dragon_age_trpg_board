<template>
  <div class="login-view-container">
    <div>
      <div v-if="showAdminLogin">
        <h1>관리자 로그인</h1>
        <form @submit.prevent="handleAdminLogin">
          <div>
            <label for="email">이메일</label>
            <input type="email" id="email" v-model="email" required />
          </div>
          <div>
            <label for="password">비밀번호</label>
            <input type="password" id="password" v-model="password" required />
          </div>
          <button type="submit">로그인</button>
        </form>
        <button @click="showAdminLogin = false">
          캐릭터 선택으로 돌아가기
        </button>
      </div>
      <div v-else>
        <div class="login-box">
          <img
            src="@/assets/images/358-3589454_dragon-age-origins-dragon-age-origins-logo-png.png"
            alt="Logo"
            class="logo"
          />

          <button @click="showAdminLogin = true">관리자 로그인</button>
        </div>
        <div v-if="loading" class="loading"></div>
        <div v-else-if="error" class="error-message">{{ error.message }}</div>
        <div v-else class="team-group-box">
          <div v-for="team in teams" :key="team.id" class="team-group">
            <button @click="toggleTeam(team.id)" class="team-toggle-button">
              <span v-html="getDisplayName(team.name)"></span>
              <span>{{ openTeams.has(team.id) ? " ▲" : " ▼" }}</span>
            </button>
            <transition name="dropdown">
              <div v-if="openTeams.has(team.id)" class="user-dropdown">
                <button
                  v-for="user in team.users"
                  :key="user.id"
                  @click="handleLogin(user)"
                  class="user-button"
                >
                  <span v-html="getDisplayName(user.username)"></span>
                </button>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/stores/auth";
import { useTeamStore } from "@/stores/team";

const teams = ref([]);
const openTeams = ref(new Set());
const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const error = ref(null);
const teamStore = useTeamStore();

const showAdminLogin = ref(false);
const email = ref("");
const password = ref("");

// 팀 이름에서 알파벳과 띄어쓰기를 제거하는 함수
const getDisplayName = (fullName) => {
  if (!fullName) return "";

  // 1. 괄호 안의 내용에서 첫 단어만 남깁니다. (예: "공공 [대장장이 수습]" -> "공공 [대장장이]")
  let processedName = fullName.replace(/(\[.*?)\s+.*(\])/g, "$1$2");

  // 2. 괄호와 그 안의 내용을 span으로 감싸고 클래스를 추가하며, 앞에 줄바꿈을 추가합니다.
  // 예: "공공 [대장장이]" -> "공공<br><span class='small-text'>[대장장이]</span>"
  return processedName.replace(
    /\s*(\[.*?\])/g,
    "<br><span class='small-text'>$1</span>"
  );
};

const handleAdminLogin = async () => {
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });

  if (signInError) {
    alert("로그인 실패: " + signInError.message);
  } else if (data.user) {
    await authStore.fetchAndSetUser(data.user.id);
    if (authStore.userProfile) {
      router.push({ name: "NoticeList" });
    } else {
      alert("로그인 후 프로필 정보를 가져오는데 실패했습니다.");
      await authStore.logout(); // Clean up partial login
    }
  }
};

const fetchTeams = async () => {
  loading.value = true;
  error.value = null;
  const { data, error: fetchError } = await supabase.from("teams").select("*");

  if (fetchError) {
    console.error("에러 발생:", fetchError);
    error.value = fetchError;
  } else {
    teams.value = data.map((team) => ({ ...team, users: [] }));
  }
  loading.value = false;
};

const fetchUsersForTeam = async (teamId) => {
  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("*")
    .eq("team_id", teamId);

  if (usersError) {
    console.error(`캐릭터 불러오기 실패 (팀 ID: ${teamId}):`, usersError);
  } else {
    const teamIndex = teams.value.findIndex((t) => t.id === teamId);
    if (teamIndex !== -1) {
      teams.value[teamIndex].users = usersData;
    }
  }
};

const toggleTeam = async (teamId) => {
  if (openTeams.value.has(teamId)) {
    openTeams.value.delete(teamId);
  } else {
    openTeams.value.add(teamId);
    const team = teams.value.find((t) => t.id === teamId);
    if (team && team.users.length === 0) {
      await fetchUsersForTeam(teamId);
    }
  }
};

function handleLogin(selectedUser) {
  authStore.setUser(selectedUser);
  teamStore.setCurrentTeam(selectedUser.team_id);
  router.push({ name: "TeamBoard", params: { teamId: selectedUser.team_id } });
}

onMounted(() => {
  if (!authStore.loggedIn) {
    fetchTeams();
  }
});
</script>
