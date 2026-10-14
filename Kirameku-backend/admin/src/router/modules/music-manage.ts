import { musicManage } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/music-manage",
  name: "MusicManage",
  component: Layout,
  redirect: "/music-manage/index",
  meta: {
    icon: "ri:music-2-line",
    title: "音乐管理",
    rank: musicManage
  },
  children: [
    {
      path: "/music-manage/index",
      name: "MusicManageIndex",
      component: () => import("@/views/music-manage/index.vue"),
      meta: {
        title: "音乐管理"
      }
    }
  ]
} satisfies RouteConfigsTable;
