<template>
  <div class="notice-create-container max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">새 공지 작성</h1>
    <form
      @submit.prevent="handleSubmit"
      class="space-y-6 bg-white p-8 rounded-lg shadow"
    >
      <div>
        <label for="title" class="block text-sm font-medium text-gray-700"
          >제목</label
        >
        <input
          type="text"
          id="title"
          v-model="title"
          required
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label for="content" class="block text-sm font-medium text-gray-700"
          >내용</label
        >
        <textarea
          id="content"
          v-model="content"
          required
          rows="10"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>
      <div class="flex justify-end space-x-4">
        <router-link :to="{ name: 'NoticeList' }">
          <button
            type="button"
            class="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300"
          >
            취소
          </button>
        </router-link>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {{ isSubmitting ? "등록 중..." : "등록하기" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();

const title = ref("");
const content = ref("");
const isSubmitting = ref(false);

const handleSubmit = async () => {
  // 1. 기존 유효성 검사
  if (!title.value.trim() || !content.value.trim()) {
    alert("제목과 내용을 모두 입력해주세요.");
    return;
  }

  // 2. 안전하게 사용자 정보 확인 (한번 더 체크)
  const user = authStore.userProfile;
  if (!user) {
    alert("사용자 정보를 불러오는 중입니다. 잠시만 기다려주세요.");
    return;
  }

  isSubmitting.value = true;
  try {
    const user = authStore.userProfile;
    if (!user)
      throw new Error("사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.");

    const { error } = await supabase.from("notices").insert({
      title: title.value,
      content: content.value,
      user_id: user.id,
    });

    if (error) throw error;

    alert("공지사항이 성공적으로 등록되었습니다.");
    router.push({ name: "NoticeList" });
  } catch (e) {
    console.error("공지사항 등록에 실패했습니다:", e);
    alert(`오류가 발생했습니다: ${e.message}`);
  } finally {
    isSubmitting.value = false;
  }
};
</script>
