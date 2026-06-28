<template>
  <div class="bamboo-board-container">
    <p class="progress-info">
      현재 시나리오 : {{ formatScenarioTitle(currentStepInfo.title) }}
      <span v-if="isAdmin" class="admin-location">
        <!-- 마스터 전용 정보: -->
        / {{ currentStepInfo.location }}
      </span>
    </p>

    <!-- 팀 진행 단계 추적기 -->
    <div class="team-progress-tracker">
      <!-- 프로그레스 바 -->
      <div class="progress-bar-container">
        <div
          class="progress-bar"
          :style="{ width: progressPercentage + '%' }"
        ></div>
      </div>

      <!-- 관리자용 컨트롤 버튼 -->
      <div v-if="isAdmin" class="admin-controls">
        <button :disabled="teamStore.isLoading" @click="updateStep(-1)">
          {{ teamStore.isLoading ? "로딩중..." : "이전 단계" }}
        </button>
        <button :disabled="teamStore.isLoading" @click="updateStep(1)">
          {{ teamStore.isLoading ? "로딩중..." : "다음 단계" }}
        </button>
      </div>
    </div>
    <!-- 새 게시글 작성 -->
    <div class="new-post-card">
      <textarea
        class="post-textarea"
        v-model="newPostContent"
        rows="3"
        placeholder="팀원들과 나누고 싶은 이야기를 적어보세요..."
      ></textarea>
      <div class="image-uploads-wrapper">
        <div v-for="i in 3" :key="i" class="image-upload-box">
          <label
            :for="'image-upload-' + i"
            :style="
              imagePreviews[i - 1]
                ? {
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    backgroundImage: `url(${imagePreviews[i - 1]})`,
                  }
                : {}
            "
          >
            <span v-if="!imagePreviews[i - 1]">이미지 추가</span>
            <input
              :id="'image-upload-' + i"
              type="file"
              @change="onFileSelected($event, i - 1)"
              accept="image/*"
            />
          </label>
        </div>
      </div>
    </div>
    <button
      class="isUploading-btn"
      @click="handleCreatePost"
      :disabled="isUploading || !newPostContent.trim()"
    >
      {{ isUploading ? "업로드 중..." : "게시하기" }}
    </button>
    <!-- 게시글 목록 -->
    <div v-if="loading">
      <p>게시글을 불러오는 중...</p>
    </div>
    <div v-if="error">
      <p>오류가 발생했습니다: {{ error.message }}</p>
    </div>

    <div v-if="posts.length > 0">
      <div v-for="post in posts" :key="post.id" class="post-card">
        <!-- 게시글 내용 -->
        <div class="post-header">
          <div class="profile-area">
            <img
              :src="getProfileImage(post.nickname)"
              alt="Profile"
              class="profile-image"
            />
          </div>
          <div class="post-meta">
            <p class="nickname">{{ formatTitle(post.nickname) }}</p>
          </div>
        </div>
        <SpoilerBlock>
          <p class="post-content-text">
            {{ post.content }}
          </p>
        </SpoilerBlock>
        <!-- 관리자용 삭제 버튼 -->
        <div v-if="isAdmin" class="admin-delete-post">
          <button @click="deletePost(post.id)">삭제</button>
        </div>

        <!-- 게시글 이미지 -->
        <SpoilerBlock v-if="post.image_url">
          <div v-if="post.image_url" class="image-container">
            <img
              v-for="(url, index) in parseImages(post.image_url)"
              :key="index"
              :src="url"
              alt="Post image"
              class="post-image"
            />
          </div>
        </SpoilerBlock>

        <!-- 댓글 섹션 -->
        <div class="comments-section">
          <h4>댓글</h4>
          <!-- 댓글 목록 -->
          <div class="comment-list">
            <div
              v-for="comment in post.comments"
              :key="comment.id"
              class="comment-item"
            >
              <div class="profile-area">
                <img
                  :src="getProfileImage(comment.nickname)"
                  alt="Profile"
                  class="profile-image"
                />
              </div>
              <div class="comment-meta">
                <p class="nickname">{{ formatTitle(comment.nickname) }}</p>
                <SpoilerBlock>
                  <p class="comment-content-text">{{ comment.content }}</p>
                </SpoilerBlock>
              </div>
              <!-- 관리자용 삭제 버튼 -->
              <div v-if="isAdmin" class="admin-delete-comment">
                <button @click="deleteComment(comment.id)">삭제</button>
              </div>
            </div>
            <p
              v-if="!post.comments || post.comments.length === 0"
              class="no-comments"
            >
              아직 댓글이 없습니다.
            </p>
          </div>

          <!-- 새 댓글 작성 -->
          <div class="new-comment-input-area">
            <input
              type="text"
              v-model="newCommentText[post.id]"
              @keyup.enter="handleAddComment(post.id)"
              placeholder="공개 댓글을 작성하세요..."
            />
            <button @click="handleAddComment(post.id)">게시</button>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="!loading && posts.length === 0" class="no-posts-message">
      <p>팀에 게시된 글이 없습니다. 첫 번째 글을 작성해보세요!</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/stores/auth";
import { useTeamStore } from "@/stores/team";
import { v4 as uuidv4 } from "uuid";
import SpoilerBlock from "@/components/SpoilerBlock.vue";

const props = defineProps({
  teamId: {
    type: String,
    required: true,
  },
});

const route = useRoute();

const posts = ref([]);
const loading = ref(false);
const error = ref(null);
const isUploading = ref(false);

const newPostContent = ref("");
const newPostImageFiles = ref([]);
const imagePreviews = ref([]);
const newCommentText = ref({});

const authStore = useAuthStore();
const teamStore = useTeamStore();
const currentUser = computed(() => authStore.userProfile);
const isAdmin = computed(() => authStore.isAdmin);

const currentStepInfo = computed(() => {
  return {
    title: teamStore.currentTeam?.progress_stages?.title || "로딩 중...",
    location:
      teamStore.currentTeam?.progress_stages?.description || "확인 불가",
  };
});

const parseImages = (images) => {
  try {
    // 만약 문자열로 된 JSON 배열이라면 객체로 변환
    if (typeof images === "string") {
      return JSON.parse(images);
    }
    // 이미 배열이라면 그대로 반환
    return Array.isArray(images) ? images : [images];
  } catch (e) {
    console.error("이미지 데이터 파싱 실패:", e);
    return [];
  }
};

// 시나리오 제목 포맷팅 (기존 함수 유지)
const formatScenarioTitle = (fullTitle) => {
  if (!fullTitle) return "로딩 중...";
  return fullTitle.replace(/\s*\(.*\)/g, "").trim();
};

// 이름 정제 함수 (요청된 정규식으로 업데이트)
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

const progressPercentage = computed(() => {
  const currentStep = teamStore.currentTeam?.progress_step ?? 0;
  const totalSteps = 25;
  if (totalSteps === 0) return 0;
  return (currentStep / totalSteps) * 100;
});

const updateStep = async (delta) => {
  if (!teamStore.currentTeam) {
    console.warn("데이터가 아직 로드되지 않았습니다.");
    return;
  }

  const newStep = teamStore.currentTeam.progress_step + delta;

  if (newStep >= 0 && newStep <= teamStore.currentTeam.total_steps) {
    await teamStore.updateProgress(teamStore.currentTeam.id, newStep);
  }
};

async function fetchPosts(teamId) {
  if (!teamId) return;
  loading.value = true;
  error.value = null;
  try {
    const { data, error: fetchError } = await supabase
      .from("posts")
      .select("*, comments(*)")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (fetchError) throw new Error(fetchError.message);
    posts.value = data;
  } catch (e) {
    error.value = e;
    console.error("게시글을 불러오는 데 실패했습니다:", e);
  } finally {
    loading.value = false;
  }
}

function onFileSelected(event, index) {
  const file = event.target.files[0];
  if (imagePreviews.value[index]) {
    URL.revokeObjectURL(imagePreviews.value[index]);
  }

  if (file) {
    newPostImageFiles.value[index] = file;
    imagePreviews.value[index] = URL.createObjectURL(file);
  } else {
    newPostImageFiles.value[index] = null;
    imagePreviews.value[index] = null;
  }
}

// async function handleCreatePost() {
//   const user = currentUser.value;
//   const canWrite = isAdmin.value || (user && user.team_id === props.teamId);

//   if (!canWrite) {
//     alert("본인 팀 게시판에만 글을 쓸 수 있습니다.");
//     return;
//   }

//   if (!newPostContent.value.trim() || !user) return;

//   isUploading.value = true;
//   const imageUrls = [];

//   try {
//     for (const file of newPostImageFiles.value) {
//       if (file) {
//         const fileName = `${currentUser.value.id}/${uuidv4()}`;
//         const { data: uploadData, error: uploadError } = await supabase.storage
//           .from("post-images")
//           .upload(fileName, file);
//         if (uploadError) throw new Error(uploadError.message);

//         const { data: urlData } = supabase.storage
//           .from("post-images")
//           .getPublicUrl(uploadData.path);
//         imageUrls.push(urlData.publicUrl);
//       }
//     }
//     console.log("--- 디버깅 시작 ---");
//     console.log("보내는 user_id:", currentUser.value.id);
//     console.log(
//       "Supabase 세션 UID (비교용):",
//       supabase.auth
//         .getSession()
//         ?.then((res) => console.log(res.data.session?.user.id))
//     );
//     console.log("--- 디버깅 끝 ---");
//     const { data: postData, error: insertError } = await supabase
//       .from("posts")
//       .insert({
//         user_id: currentUser.value.id,
//         nickname: currentUser.value.username,
//         content: newPostContent.value,
//         image_url: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
//         team_id: props.teamId,
//       })
//       .select("*, comments(*)")
//       .single();

//     if (insertError) throw new Error(insertError.message);

//     posts.value.unshift(postData);
//     newPostContent.value = "";
//     newPostImageFiles.value = [];
//     imagePreviews.value.forEach((url) => URL.revokeObjectURL(url));
//     imagePreviews.value = [];
//   } catch (e) {
//     console.error("게시글 작성에 실패했습니다:", e);
//     alert(`게시글 작성 오류: ${e.message}`);
//   } finally {
//     isUploading.value = false;
//     document
//       .querySelectorAll('input[type="file"]')
//       .forEach((input) => (input.value = ""));
//   }
// }
async function handleCreatePost() {
  const user = currentUser.value;

  // 로그인 시스템이 없으므로, 현재는 기본적인 팀 체크만 진행합니다.
  const canWrite = isAdmin.value || (user && user.team_id === props.teamId);

  if (!canWrite) {
    alert("본인 팀 게시판에만 글을 쓸 수 있습니다.");
    return;
  }

  if (!newPostContent.value.trim() || !user) return;

  isUploading.value = true;
  const imageUrls = [];

  try {
    // 1. 이미지 업로드
    for (const file of newPostImageFiles.value) {
      if (file) {
        const fileName = `${currentUser.value.id}/${uuidv4()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, file);

        if (uploadError) throw new Error(uploadError.message);

        const { data: urlData } = supabase.storage
          .from("post-images")
          .getPublicUrl(uploadData.path);
        imageUrls.push(urlData.publicUrl);
      }
    }

    // 2. 게시글 데이터 저장 (RLS 정책을 위에서 풀었으므로 이제 통과됩니다)
    const { data: postData, error: insertError } = await supabase
      .from("posts")
      .insert({
        user_id: currentUser.value.id,
        nickname: currentUser.value.username,
        content: newPostContent.value,
        image_url: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
        team_id: props.teamId,
      })
      .select("*, comments(*)")
      .single();

    if (insertError) throw new Error(insertError.message);

    // 3. UI 업데이트
    posts.value.unshift(postData);
    newPostContent.value = "";
    newPostImageFiles.value = [];
    imagePreviews.value.forEach((url) => URL.revokeObjectURL(url));
    imagePreviews.value = [];

    alert("게시글이 작성되었습니다.");
  } catch (e) {
    console.error("게시글 작성에 실패했습니다:", e);
    alert(`게시글 작성 오류: ${e.message}`);
  } finally {
    isUploading.value = false;
    document
      .querySelectorAll('input[type="file"]')
      .forEach((input) => (input.value = ""));
  }
}
async function handleAddComment(postId) {
  const content = newCommentText.value[postId];
  if (!content || !content.trim() || !currentUser.value) return;

  try {
    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: currentUser.value.id,
        nickname: currentUser.value.username,
        content: content,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    const postIndex = posts.value.findIndex((p) => p.id === postId);
    if (postIndex !== -1) {
      posts.value[postIndex].comments.push(data);
    }
    newCommentText.value[postId] = "";
  } catch (e) {
    console.error("댓글 작성에 실패했습니다:", e);
    alert(`댓글 작성 오류: ${e.message}`);
  }
}

async function deletePost(postId) {
  if (confirm("정말로 이 게시물을 삭제하시겠습니까?")) {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw new Error(error.message);
      posts.value = posts.value.filter((p) => p.id !== postId);
      alert("게시물이 삭제되었습니다.");
    } catch (e) {
      console.error("게시물 삭제에 실패했습니다:", e);
      alert(`게시물 삭제 오류: ${e.message}`);
    }
  }
}

async function deleteComment(commentId) {
  if (confirm("정말로 이 댓글을 삭제하시겠습니까?")) {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);
      if (error) throw new Error(error.message);

      for (const post of posts.value) {
        const commentIndex = post.comments.findIndex((c) => c.id === commentId);
        if (commentIndex > -1) {
          post.comments.splice(commentIndex, 1);
          break;
        }
      }
      alert("댓글이 삭제되었습니다.");
    } catch (e) {
      console.error("댓글 삭제에 실패했습니다:", e);
      alert(`댓글 삭제 오류: ${e.message}`);
    }
  }
}

onMounted(() => {
  const id = route.params.teamId || props.teamId;

  if (!id) {
    console.error("❌ 팀 ID를 URL에서도, Props에서도 찾을 수 없습니다!");
    return;
  }

  console.log("✅ 팀 ID 로드 성공:", id);
  fetchPosts(id);
  teamStore.setCurrentTeam(id);
});

onUnmounted(() => {
  imagePreviews.value.forEach((url) => URL.revokeObjectURL(url));
});

watch(
  () => route.params.teamId,
  (newTeamId) => {
    if (newTeamId) {
      console.log("🔄 teamId 변경 감지:", newTeamId);
      fetchPosts(newTeamId);
      teamStore.setCurrentTeam(newTeamId);
    }
  }
);
</script>

<style scoped>
.profile-image {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.post-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.post-meta .nickname {
  font-weight: bold;
  color: #333;
}

.post-content-text {
  margin-top: 5px;
  line-height: 1.5;
  color: #555;
}

.post-image {
  max-width: 100%;
  height: auto;
  border-radius: 5px;
  margin-top: 10px;
}

.admin-delete-post,
.admin-delete-comment {
  margin-top: 10px;
  text-align: right;
}

.admin-delete-post button,
.admin-delete-comment button {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.admin-delete-post button:hover,
.admin-delete-comment button:hover {
  background-color: #d32f2f;
}

.comments-section {
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 15px;
}

.comments-section h4 {
  font-size: 1.1em;
  margin-bottom: 15px;
  color: #333;
}

.comment-list {
  margin-bottom: 15px;
}

.comment-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #f0f0f0;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-meta .nickname {
  font-weight: bold;
  color: #444;
}

.comment-content-text {
  color: #666;
}

.no-comments,
.no-posts-message {
  text-align: center;
  color: #777;
  padding: 20px 0;
}

.new-comment-input-area {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.new-comment-input-area input {
  flex-grow: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.new-comment-input-area button {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.new-comment-input-area button:hover {
  background-color: #43a047;
}
</style>
