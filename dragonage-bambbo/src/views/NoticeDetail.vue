<template>
  <div class="notice-detail-container">
    <div v-if="loading">
      <p>공지사항을 불러오는 중...</p>
    </div>
    <div v-else-if="error">
      <p>오류가 발생했습니다: {{ error.message }}</p>
    </div>
    <div v-else-if="notice">
      <div class="notice-header">
        <h1 class="notice-title">{{ notice.title }}</h1>
        <div class="notice-meta">
          <div class="notice-author">
            <img
              :src="getProfileImage(notice.author_name)"
              alt="Profile"
              class="profile-img"
            />
            <span
              >작성자:
              {{ formatTitle(notice.author_name) || "알 수 없음" }}</span
            >
          </div>
          <span class="notice-date">{{
            new Date(notice.created_at).toLocaleString()
          }}</span>
        </div>
      </div>

      <div class="notice-content" v-html="formattedContent"></div>

      <div class="actions">
        <router-link :to="{ name: 'NoticeList' }">
          <button>목록으로</button>
        </router-link>
        <button v-if="isAdmin" @click="handleDelete" class="btn-delete">
          삭제
        </button>
      </div>
    </div>
    <div v-else class="text-center text-gray-500 py-10">
      <p>해당 공지사항을 찾을 수 없습니다.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const notice = ref(null);
const loading = ref(true);
const error = ref(null);

const isAdmin = computed(() => authStore.isAdmin);

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

const formattedContent = computed(() => {
  if (notice.value && notice.value.content) {
    return notice.value.content.replace(/\n/g, "<br />");
  }
  return "";
});

const fetchNotice = async () => {
  try {
    const { data, error: fetchError } = await supabase
      .from("notices")
      .select(
        `
        *,
        author:user_id ( username )
      `
      )
      .eq("id", route.params.noticeId)
      .single();

    if (fetchError) throw fetchError;

    notice.value = {
      ...data,
      author_name: data.author?.username,
    };
  } catch (e) {
    error.value = e;
    console.error("공지사항을 불러오는 데 실패했습니다:", e);
  } finally {
    loading.value = false;
  }
};

const handleDelete = async () => {
  if (!confirm("정말로 이 공지사항을 삭제하시겠습니까?")) return;

  try {
    const { error: deleteError } = await supabase
      .from("notices")
      .delete()
      .eq("id", route.params.noticeId);

    if (deleteError) throw deleteError;

    alert("공지사항이 삭제되었습니다.");
    router.push({ name: "NoticeList" });
  } catch (e) {
    console.error("공지사항 삭제에 실패했습니다:", e);
    alert(`삭제 중 오류가 발생했습니다: ${e.message}`);
  }
};

onMounted(fetchNotice);
</script>
