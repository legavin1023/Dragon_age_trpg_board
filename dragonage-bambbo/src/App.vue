<template>
  <div id="app-container">
    <header class="app-header" v-if="authStore.loggedIn">
      <!-- <button @click="handleLogout" class="logout-button">로그아웃</button> -->
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";
// import { useRouter } from "vue-router";

const authStore = useAuthStore();
// const router = useRouter();

// const handleLogout = () => {
//   authStore.logout();
//   router.push({ name: "LoginView" });
// };
</script>
