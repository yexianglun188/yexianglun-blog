import { dogDiary } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/dog-diary",
  name: "DogDiary",
  component: Layout,
  redirect: "/dog-diary/index",
  meta: {
    icon: "ri:heart-line",
    title: "舔狗日记",
    rank: dogDiary
  },
  children: [
    {
      path: "/dog-diary/index",
      name: "DogDiaryIndex",
      component: () => import("@/views/dog-diary/index.vue"),
      meta: {
        title: "舔狗日记"
      }
    }
  ]
} satisfies RouteConfigsTable;
