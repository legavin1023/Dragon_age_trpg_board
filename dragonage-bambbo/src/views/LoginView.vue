<template>
  <div class="login-view-container">
    <div>
      <!-- 1. 관리자 로그인 화면 -->
      <div v-if="showAdminLogin" class="admin-login-form">
        <h1>관리자 로그인</h1>
        <form @submit.prevent="handleAdminLogin" class="login-form">
          <div class="form-group">
            <label for="admin-email">이메일</label>
            <input type="email" id="admin-email" v-model="email" required />
          </div>
          <div class="form-group">
            <label for="admin-password">비밀번호</label>
            <input
              type="password"
              id="admin-password"
              v-model="password"
              required
            />
          </div>
          <button type="submit" class="btn-login">로그인</button>
        </form>
        <button @click="showAdminLogin = false" class="btn-back">
          캐릭터 선택으로 돌아가기
        </button>
      </div>

      <!-- 2. 캐릭터 비밀번호 입력 / 최초 설정 화면 -->
      <div v-else-if="showUserLoginPrompt" class="admin-login-form">
        <h1>{{ pendingUser?.username }}</h1>
        <p class="sub-text">
          {{
            isSettingNewPin
              ? "사용하실 4자리 비밀번호를 입력해주세요."
              : "비밀번호 4자리를 입력해주세요."
          }}
        </p>
        <form @submit.prevent="verifyOrSetUserPin" class="login-form">
          <div class="form-group">
            <label for="user-pin">{{
              isSettingNewPin ? "비밀번호 설정" : "비밀번호 확인"
            }}</label>
            <input
              type="password"
              id="user-pin"
              v-model="enteredPin"
              maxlength="4"
              placeholder="****"
              required
            />
          </div>
          <button type="submit" class="btn-login">
            {{ isSettingNewPin ? "등록하고 입장하기" : "확인" }}
          </button>
        </form>
        <button @click="showUserLoginPrompt = false" class="btn-back">
          캐릭터 선택으로 돌아가기
        </button>
      </div>

      <!-- 3. 기본 팀/캐릭터 선택 화면 -->
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
                  @click="handleUserClick(user)"
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

// 캐릭터 비밀번호 및 최초 설정 관련 상태
const showUserLoginPrompt = ref(false);
const pendingUser = ref(null);
const enteredPin = ref("");
const isSettingNewPin = ref(false);

// 팀 이름에서 알파벳과 띄어쓰기를 제거하는 함수
const getDisplayName = (fullName) => {
  if (!fullName) return "";
  let processedName = fullName.replace(/(\[.*?)\s+.*(\])/g, "$1$2");
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
      await authStore.logout();
    }
  }
};

// 캐릭터를 클릭했을 때 (DB에서 최신 정보를 다시 조회하여 비번 유무를 정확히 판단)
const handleUserClick = async (user) => {
  loading.value = true;

  // 데이터베이스에서 이 유저의 최신 정보를 가져옴
  const { data, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  loading.value = false;

  if (fetchError || !data) {
    alert("캐릭터 정보를 불러오지 못했습니다.");
    return;
  }

  pendingUser.value = data;
  enteredPin.value = "";
  showUserLoginPrompt.value = true;

  // pin이 없거나, 비어있거나, 실수로 "null" 글자로 적힌 경우에만 최초 설정 모드
  if (!data.pin || data.pin === "null" || data.pin.trim() === "") {
    isSettingNewPin.value = true;
  } else {
    isSettingNewPin.value = false; // 이미 비번이 있다면 입력 및 확인 모드!
  }
};

// 비밀번호 등록 또는 확인 함수
// 비밀번호 등록 또는 확인 함수 수정
const verifyOrSetUserPin = async () => {
  if (!pendingUser.value) return;

  if (enteredPin.value.length !== 4) {
    alert("4자리 숫자로 입력해주세요!");
    return;
  }

  if (isSettingNewPin.value) {
    // 1. 최초 설정인 경우: 데이터베이스 함수(RPC)를 호출하여 암호화 저장
    const { error: updateError } = await supabase.rpc("update_user_pin", {
      target_user_id: pendingUser.value.id,
      raw_pin: enteredPin.value,
    });

    if (updateError) {
      alert("비밀번호 설정 실패: " + updateError.message);
      return;
    }

    alert("비밀번호가 성공적으로 설정되었습니다!");
    proceedLogin();
  } else {
    // 2. 이미 비밀번호가 있는 경우 로그인 검증
    // (로그인 검증 시에도 DB에서 암호화된 값과 비교하는 로직이 필요합니다)
    if (enteredPin.value === pendingUser.value.pin) {
      proceedLogin();
    } else {
      alert("비밀번호가 틀렸습니다!");
      enteredPin.value = "";
    }
  }
};

// 공통 로그인 성공 처리 함수
const proceedLogin = () => {
  authStore.setUser(pendingUser.value);
  teamStore.setCurrentTeam(pendingUser.value.team_id);
  router.push({
    name: "TeamBoard",
    params: { teamId: pendingUser.value.team_id },
  });
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
  const wasOpen = openTeams.value.has(teamId);
  openTeams.value.clear(); // 모든 드롭다운을 닫습니다.

  if (!wasOpen) {
    // 클릭된 드롭다운이 닫혀 있었다면, 새로 엽니다.
    openTeams.value.add(teamId);
    const team = teams.value.find((t) => t.id === teamId);
    if (team && team.users.length === 0) {
      await fetchUsersForTeam(teamId);
    }
  }
  // 만약 이미 열려 있었다면, clear()에 의해 닫히기만 하고 다시 열리지 않습니다.
};

onMounted(() => {
  if (!authStore.loggedIn) {
    fetchTeams();
  }
});
</script>
