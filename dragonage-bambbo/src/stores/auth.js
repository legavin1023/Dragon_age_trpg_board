import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { supabase } from "@/lib/supabaseClient";

export const useAuthStore = defineStore(
  "auth",
  () => {
    const userProfile = ref(null);

    const loggedIn = computed(() => !!userProfile.value);
    const isAdmin = computed(() => userProfile.value?.role === "admin");

    // Set user manually
    function setUser(selectedUser) {
      userProfile.value = selectedUser;
    }

    async function fetchAndSetUser(userId) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId);

      if (error) {
        console.error("Error fetching user profile:", error);
        userProfile.value = null;
      } else if (data && data.length > 0) {
        userProfile.value = data[0];
      } else {
        console.warn("User data not found in public.users for userId:", userId);
        userProfile.value = null;
      }
    }

    // Logout
    async function logout() {
      userProfile.value = null;
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error logging out:", error.message);
      }
    }

    return { userProfile, loggedIn, isAdmin, setUser, logout, fetchAndSetUser };
  },
  { persist: true }
);
