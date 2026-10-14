<script setup lang="ts">
import { ref, onMounted } from "vue";
import { message } from "@/utils/message";
import {
  getUsers,
  updateUser,
  resetUserPassword,
  deleteUser
} from "@/api/userManage";
import type { UserItem } from "@/api/userManage";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({ name: "UserManageIndex" });

const loading = ref(false);
const dataList = ref<UserItem[]>([]);
const total = ref(0);
const page = ref(1);
const size = ref(20);
const keyword = ref("");

const editVisible = ref(false);
const editForm = ref({
  id: 0,
  username: "",
  nickname: "",
  email: "",
  bio: "",
  is_admin: false
});

const pwdVisible = ref(false);
const pwdForm = ref({ id: 0, username: "", password: "" });

const columns: TableColumnList = [
  { label: "ID", prop: "id", width: 70 },
  {
    label: "用户名",
    prop: "username",
    minWidth: 130,
    showOverflowTooltip: true
  },
  { label: "昵称", prop: "nickname", minWidth: 120 },
  { label: "邮箱", prop: "email", minWidth: 160, showOverflowTooltip: true },
  {
    label: "身份",
    prop: "is_admin",
    width: 90,
    slot: "role"
  },
  {
    label: "发言数",
    minWidth: 150,
    formatter: ({ comment_count, chatter_count, message_count }) =>
      `评论 ${comment_count} / 说说评论 ${chatter_count} / 留言 ${message_count}`
  },
  {
    label: "注册时间",
    prop: "created_at",
    minWidth: 170,
    formatter: ({ created_at }) => created_at?.replace("T", " ").slice(0, 19) ?? ""
  },
  { label: "操作", fixed: "right", width: 230, slot: "operation" }
];

async function onSearch() {
  loading.value = true;
  try {
    const res = await getUsers({
      keyword: keyword.value,
      page: page.value,
      size: size.value
    });
    dataList.value = res.data.items;
    total.value = res.data.total;
  } finally {
    loading.value = false;
  }
}

function openEdit(row: UserItem) {
  editForm.value = {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    email: row.email,
    bio: row.bio,
    is_admin: row.is_admin
  };
  editVisible.value = true;
}

async function handleEditSubmit() {
  try {
    await updateUser(editForm.value.id, {
      nickname: editForm.value.nickname,
      email: editForm.value.email,
      bio: editForm.value.bio,
      is_admin: editForm.value.is_admin
    });
    message("已保存", { type: "success" });
    editVisible.value = false;
    onSearch();
  } catch (e: any) {
    message(e?.message ?? "保存失败", { type: "error" });
  }
}

function openResetPwd(row: UserItem) {
  pwdForm.value = { id: row.id, username: row.username, password: "" };
  pwdVisible.value = true;
}

async function handleResetPwd() {
  if (pwdForm.value.password.length < 6) {
    message("密码至少 6 位", { type: "warning" });
    return;
  }
  try {
    await resetUserPassword(pwdForm.value.id, pwdForm.value.password);
    message("密码已重置", { type: "success" });
    pwdVisible.value = false;
  } catch (e: any) {
    message(e?.message ?? "重置失败", { type: "error" });
  }
}

async function handleDelete(row: UserItem) {
  try {
    await deleteUser(row.id);
    message("已删除", { type: "success" });
    onSearch();
  } catch (e: any) {
    message(e?.message ?? "删除失败", { type: "error" });
  }
}

onMounted(() => onSearch());
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="font-medium">
            用户管理
            <span class="text-xs text-slate-400 ml-2">
              共 {{ total }} 个账号（含访客历史数据）
            </span>
          </span>
          <el-input
            v-model="keyword"
            placeholder="搜索用户名 / 昵称 / 邮箱"
            clearable
            style="width: 240px"
            @keyup.enter="onSearch"
            @clear="onSearch"
          />
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
        <template #role="{ row }">
          <el-tag v-if="row.is_admin" type="danger" size="small">管理员</el-tag>
          <el-tag v-else-if="row.is_guest" type="info" size="small">访客</el-tag>
          <el-tag v-else type="success" size="small">用户</el-tag>
        </template>
        <template #operation="{ row }">
          <el-button
            link
            type="primary"
            :icon="useRenderIcon('ri:edit-line')"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            link
            type="warning"
            :icon="useRenderIcon('ri:key-2-line')"
            @click="openResetPwd(row)"
          >
            重置密码
          </el-button>
          <el-popconfirm
            title="删除后该用户的评论/留言将保留但不再关联账号，确认删除？"
            width="280"
            @confirm="handleDelete(row)"
          >
            <template #reference>
              <el-button link type="danger" :icon="useRenderIcon('ri:delete-bin-line')">
                删除
              </el-button>
            </template>
          </el-popconfirm>
        </template>
      </pure-table>

      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="size"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @current-change="onSearch"
          @size-change="() => { page = 1; onSearch(); }"
        />
      </div>
    </el-card>

    <!-- 编辑资料 -->
    <el-dialog v-model="editVisible" title="编辑用户" width="520px" destroy-on-close>
      <el-form label-width="90px">
        <el-form-item label="用户名">
          <el-input :model-value="editForm.username" disabled />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" maxlength="50" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="editForm.email" maxlength="100" />
        </el-form-item>
        <el-form-item label="个人简介">
          <el-input
            v-model="editForm.bio"
            type="textarea"
            :rows="3"
            maxlength="500"
          />
        </el-form-item>
        <el-form-item label="管理员">
          <el-switch v-model="editForm.is_admin" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEditSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码 -->
    <el-dialog v-model="pwdVisible" title="重置密码" width="440px" destroy-on-close>
      <el-form label-width="90px">
        <el-form-item label="用户名">
          <el-input :model-value="pwdForm.username" disabled />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input
            v-model="pwdForm.password"
            type="password"
            show-password
            placeholder="至少 6 位"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" @click="handleResetPwd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
