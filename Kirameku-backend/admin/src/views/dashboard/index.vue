<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getPostCount } from "@/api/post";
import { getCategories } from "@/api/category";
import { getTags } from "@/api/tag";
import { getAdminComments } from "@/api/comment";
import { getAdminMessages } from "@/api/message";

defineOptions({ name: "Dashboard" });

const stats = ref([
  { title: "文章", value: 0, icon: "ep/document", color: "#409eff" },
  { title: "分类", value: 0, icon: "ep/files", color: "#67c23a" },
  { title: "标签", value: 0, icon: "ep/discount", color: "#e6a23c" },
  { title: "评论", value: 0, icon: "ep/comment", color: "#f56c6c" },
  { title: "留言", value: 0, icon: "ep/message-box", color: "#909399" }
]);
const loading = ref(true);

onMounted(async () => {
  try {
    const [postRes, catRes, tagRes, commentRes, msgRes] = await Promise.all([
      getPostCount().catch(() => ({ count: 0 })),
      getCategories().catch(() => []),
      getTags().catch(() => []),
      getAdminComments({ size: 1 }).catch(() => []),
      getAdminMessages({ size: 1 }).catch(() => [])
    ]);
    stats.value[0].value = postRes.count ?? 0;
    stats.value[1].value = Array.isArray(catRes) ? catRes.length : 0;
    stats.value[2].value = Array.isArray(tagRes) ? tagRes.length : 0;
    stats.value[3].value = Array.isArray(commentRes) ? commentRes.length : 0;
    stats.value[4].value = Array.isArray(msgRes) ? msgRes.length : 0;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="p-4">
    <el-row :gutter="20">
      <el-col
        v-for="(item, index) in stats"
        :key="index"
        :xs="12"
        :sm="8"
        :md="4"
        class="mb-4"
      >
        <el-card shadow="hover" v-loading="loading">
          <div class="flex items-center gap-3">
            <div
              class="size-12 rounded-lg flex items-center justify-center"
              :style="{ backgroundColor: item.color + '20' }"
            >
              <IconifyIconOffline
                :icon="item.icon"
                :color="item.color"
                width="24"
                height="24"
              />
            </div>
            <div>
              <p class="text-sm text-gray-500">{{ item.title }}</p>
              <p class="text-2xl font-bold">{{ item.value }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="mt-4">
      <template #header>
        <span class="font-medium">欢迎使用 Kirameku 后台管理</span>
      </template>
      <p class="text-gray-500">
        在左侧菜单选择功能模块开始管理你的博客内容。
      </p>
    </el-card>
  </div>
</template>
