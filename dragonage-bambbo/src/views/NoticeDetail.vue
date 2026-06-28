<template>
  <div class="notice-detail-container max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
    <div v-if="loading" class="text-center text-gray-500">
      <p>공지사항을 불러오는 중...</p>
    </div>
    <div v-else-if="error" class="text-center text-red-500">
      <p>오류가 발생했습니다: {{ error.message }}</p>
    </div>
    <div v-else-if="notice" class="bg-white p-8 rounded-lg shadow">
      <div class="border-b pb-4 mb-6">
        <h1 class="text-3xl font-bold text-gray-900">{{ notice.title }}</h1>
        <div
          class="flex justify-between items-center mt-3 text-sm text-gray-500"
        >
          <div class="flex items-center gap-2">
            <img
              :src="getProfileImage(notice.author_name)"
              alt="Profile"
              class="w-8 h-8 rounded-full object-cover"
            />
            <span
              >작성자:
              {{ formatTitle(notice.author_name) || "알 수 없음" }}</span
            >
          </div>
          <span>{{ new Date(notice.created_at).toLocaleString() }}</span>
        </div>
      </div>

      <div class="prose max-w-none" v-html="formattedContent"></div>

      <div v-if="isAdmin" class="mt-8 pt-6 border-t flex justify-end space-x-4">
        <button
          @click="handleDelete"
          class="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700"
        >
          삭제
        </button>
      </div>
      <div class="mt-8 pt-6 border-t flex justify-end">
        <router-link :to="{ name: 'NoticeList' }">
          <button
            class="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300"
          >
            목록으로
          </button>
        </router-link>
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
