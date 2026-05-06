<script setup lang="ts">
import { ref, onMounted } from "vue";
import { message as msg } from "@/utils/message";
import {
  getAdminMessages,
  updateMessageStatus,
  deleteMessage
} from "@/api/message";
import type { MessageItem } from "@/api/message";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({ name: "MessageIndex" });

const loading = ref(false);
const dataList = ref<MessageItem[]>([]);
const statusFilter = ref("");

const columns: TableColumnList = [
  { label: "ID", prop: "id", width: 60 },
  { label: "昵称", prop: "nickname", width: 120 },
  { label: "内容", prop: "content", minWidth: 300 },
  { label: "IP", prop: "ip", width: 130 },
  { label: "点赞", prop: "likes", width: 60 },
  {
    label: "状态",
    prop: "status",
    width: 90,
    slot: "status"
  },
  {
    label: "时间",
    prop: "created_at",
    minWidth: 160,
    formatter: ({ created_at }) =>
      created_at ? created_at.replace("T", " ").slice(0, 19) : ""
  },
  {
    label: "操作",
    fixed: "right",
    width: 200,
    slot: "operation"
  }
];

async function onSearch() {
  loading.value = true;
  try {
    const params: any = { size: 100 };
    if (statusFilter.value) params.status = statusFilter.value;
    dataList.value = await getAdminMessages(params);
  } finally {
    loading.value = false;
  }
}

async function handleStatus(row: MessageItem, status: string) {
  try {
    await updateMessageStatus(row.id, status);
    msg("操作成功", { type: "success" });
    onSearch();
  } catch (e: any) {
    msg(e?.message ?? "操作失败", { type: "error" });
  }
}

async function handleDelete(row: MessageItem) {
  try {
    await deleteMessage(row.id);
    msg("删除成功", { type: "success" });
    onSearch();
  } catch (e: any) {
    msg(e?.message ?? "删除失败", { type: "error" });
  }
}

onMounted(() => onSearch());
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <span class="font-medium">留言管理</span>
            <el-select
              v-model="statusFilter"
              placeholder="全部状态"
              clearable
              class="w-28"
              @change="onSearch"
            >
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已拒绝" value="rejected" />
            </el-select>
          </div>
        </div>
      </template>

      <pure-table
        :data="dataList"
        :columns="columns"
        :loading="loading"
        align-whole="center"
        row-key="id"
        table-layout="auto"
      >
        <template #status="{ row }">
          <el-tag
            :type="
              row.status === 'approved'
                ? 'success'
                : row.status === 'pending'
                  ? 'warning'
                  : 'danger'
            "
            size="small"
          >
            {{
              row.status === "approved"
                ? "已通过"
                : row.status === "pending"
                  ? "待审核"
                  : "已拒绝"
            }}
          </el-tag>
        </template>

        <template #operation="{ row }">
          <el-button
            v-if="row.status !== 'approved'"
            link
            type="success"
            size="small"
            @click="handleStatus(row, 'approved')"
          >
            通过
          </el-button>
          <el-button
            v-if="row.status !== 'rejected'"
            link
            type="warning"
            size="small"
            @click="handleStatus(row, 'rejected')"
          >
            拒绝
          </el-button>
          <el-popconfirm
            title="确认删除这条留言？"
            @confirm="handleDelete(row)"
          >
            <template #reference>
              <el-button link type="danger" size="small">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </pure-table>
    </el-card>
  </div>
</template>
