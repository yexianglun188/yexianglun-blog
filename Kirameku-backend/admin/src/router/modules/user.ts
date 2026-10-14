import { userManage } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/user",
  name: "UserManage",
  component: Layout,
  redirect: "/user/index",
  meta: {
    icon: "ri:user-settings-line",
    title: "用户管理",
    rank: userManage
  },
  children: [
    {
      path: "/user/index",
      name: "UserManageIndex",
      component: () => import("@/views/user/index.vue"),
      meta: {
        title: "用户管理"
      }
    }
  ]
} satisfies RouteConfigsTable;
