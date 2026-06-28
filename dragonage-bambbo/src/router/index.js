import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import LoginView from "../views/LoginView.vue";
import AppLayout from "../views/AppLayout.vue";
import TeamBoard from "../views/TeamBoard.vue";
import NoticeList from "../views/NoticeList.vue";
import NoticeWrite from "../views/NoticeWrite.vue";
import NoticeDetail from "../views/NoticeDetail.vue";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: LoginView,
  },
  {
    path: "/",
    redirect: () => {
      const authStore = useAuthStore();
      if (authStore.userProfile) {
        return {
          name: "NoticeList",
        };
      }
      return { name: "Login" };
    },
  },
  {
    path: "/board",
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: "notices",
        name: "NoticeList",
        component: NoticeList,
      },
      {
        path: "notices/create",
        name: "NoticeWrite",
        component: NoticeWrite,
        meta: { requiresAdmin: true },
      },
      {
        path: "notices/:noticeId",
        name: "NoticeDetail",
        component: NoticeDetail,
        props: true,
      },
      {
        path: ":teamId?",
        name: "TeamBoard",
        component: TeamBoard,
        props: true,
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin);

  if (to.name === "Login" && authStore.userProfile) {
    return next({
      name: "NoticeList",
    });
  }

  if ((requiresAuth || requiresAdmin) && !authStore.userProfile) {
    return next({ name: "Login" });
  }

  if (requiresAdmin && authStore.userProfile && !authStore.isAdmin) {
    alert("관리자 권한이 필요합니다.");
    return next({
      name: "NoticeList",
    });
  }

  next();
});

export default router;
