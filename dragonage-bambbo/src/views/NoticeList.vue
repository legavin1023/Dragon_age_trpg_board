<template>
  <div class="notice-list-container">
    <div>
      <h1>공지사항</h1>
      <router-link v-if="isAdmin" :to="{ name: 'NoticeWrite' }">
        <button>공지 작성하기</button>
      </router-link>
    </div>

    <div v-if="loading">
      <p>공지사항을 불러오는 중...</p>
    </div>
    <div v-else-if="error">
      <p>오류가 발생했습니다: {{ error.message }}</p>
    </div>

    <div v-else-if="notices.length > 0">
      <div v-for="notice in notices" :key="notice.id" class="notice-item">
        <div class="notice-header">
          <h2>{{ notice.title }}</h2>
          <span>{{ new Date(notice.created_at).toLocaleDateString() }}</span>
        </div>
        <p class="notice-content">{{ notice.content }}</p>
      </div>
    </div>
    <div v-else>
      <p>작성된 공지사항이 없습니다.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const notices = ref([]);
const loading = ref(true);
const error = ref(null);
const subscription = ref(null);

const isAdmin = computed(() => authStore.isAdmin);

const fetchNotices = async () => {
  try {
    const { data, error: fetchError } = await supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;
    notices.value = data;
  } catch (e) {
    error.value = e;
  } finally {
    loading.value = false;
  }
};

const handleRealtimeChanges = (payload) => {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  if (eventType === "INSERT") {
    notices.value.unshift(newRecord);
  } else if (eventType === "UPDATE") {
    const index = notices.value.findIndex((n) => n.id === newRecord.id);
    if (index !== -1) notices.value[index] = newRecord;
  } else if (eventType === "DELETE") {
    notices.value = notices.value.filter((n) => n.id !== oldRecord.id);
  }
};

onMounted(async () => {
  await fetchNotices();
  subscription.value = supabase
    .channel("public:notices")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notices" },
      handleRealtimeChanges
    )
    .subscribe();
});

onUnmounted(() => {
  if (subscription.value) supabase.removeChannel(subscription.value);
});
</script>

<style scoped>
/* 각 공지사항을 구분하기 위한 스타일 */
.notice-item {
  border-bottom: 1px solid #eee;
  padding: 20px 0;
}

.notice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

/* 핵심: 줄바꿈을 그대로 표시해주는 스타일 */
.notice-content {
  white-space: pre-wrap;
  word-break: break-all;
  color: #333;
  line-height: 1.6;
}
</style>
