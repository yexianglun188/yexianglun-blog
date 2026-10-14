<script setup lang="ts">
import { ref, onMounted } from "vue";
import { message } from "@/utils/message";
import {
  getAdminDogDiaries,
  createDogDiary,
  updateDogDiary,
  deleteDogDiary
} from "@/api/dogDiary";
import type { DogDiaryItem } from "@/api/dogDiary";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({ name: "DogDiaryIndex" });

const loading = ref(false);
const dataList = ref<DogDiaryItem[]>([]);
const keyword = ref("");
const dialogVisible = ref(false);
const dialogTitle = ref("新增日记");
const formRef = ref();
const form = ref({
  id: 0,
  content: "",
  author: "",
  sort: 0,
  is_approved: true
});

const rules = {
  content: [{ required: true, message: "请输入日记内容", trigger: "blur" }]
};

const columns: TableColumnList = [
  { label: "ID", prop: "id", width: 70 },
  {
    label: "日记内容",
    prop: "content",
    minWidth: 320,
    showOverflowTooltip: true
  },
  { label: "作者", prop: "author", width: 120 },
  { label: "排序", prop: "sort", width: 80 },
  {
    label: "前台展示",
    prop: "is_approved",
    width: 100,
    slot: "status"
  },
  {
    label: "创建时间",
    prop: "created_at",
    minWidth: 170,
    formatter: ({ created_at }) => created_at?.replace("T", " ").slice(0, 19) ?? ""
  },
  {
    label: "修改时间",
    prop: "updated_at",
    minWidth: 170,
    formatter: ({ updated_at }) => updated_at?.replace("T", " ").slice(0, 19) ?? ""
  },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

async function onSearch() {
  loading.value = true;
  try {
    dataList.value = await getAdminDogDiaries(keyword.value);
  } finally {
    loading.value = false;
  }
}

function openDialog(title: string, row?: DogDiaryItem) {
  dialogTitle.value = title;
  if (row) {
    form.value = {
      id: row.id,
      content: row.content,
      author: row.author || "",
      sort: row.sort ?? 0,
      is_approved: row.is_approved
    };
  } else {
    form.value = { id: 0, content: "", author: "", sort: 0, is_approved: true };
  }
  dialogVisible.value = true;
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  try {
    if (form.value.id) {
      await updateDogDiary(form.value.id, {
        content: form.value.content,
        author: form.value.author,
        sort: form.value.sort,
        is_approved: form.value.is_approved
      });
      message("日记更新成功", { type: "success" });
    } else {
      await createDogDiary({
        content: form.value.content,
        author: form.value.author,
        sort: form.value.sort,
        is_approved: form.value.is_approved
      });
      message("日记创建成功", { type: "success" });
    }
    dialogVisible.value = false;
    onSearch();
  } catch (e: any) {
    message(e?.message ?? "操作失败", { type: "error" });
  }
}

async function handleDelete(row: DogDiaryItem) {
  try {
    await deleteDogDiary(row.id);
    message("删除成功", { type: "success" });
    onSearch();
  } catch (e: any) {
    message(e?.message ?? "删除失败", { type: "error" });
  }
}

/** 开关：控制是否在前台展示 */
async function handleToggle(row: DogDiaryItem, value: boolean) {
  try {
    await updateDogDiary(row.id, { is_approved: value });
    row.is_approved = value;
    message(value ? "已开启前台展示" : "已关闭前台展示", { type: "success" });
  } catch (e: any) {
    row.is_approved = !value;
    message(e?.message ?? "操作失败", { type: "error" });
  }
}

onMounted(() => onSearch());
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="font-medium">舔狗日记管理</span>
          <div class="flex items-center gap-2">
            <el-input
              v-model="keyword"
              placeholder="搜索日记内容"
              clearable
              style="width: 220px"
              @keyup.enter="onSearch"
              @clear="onSearch"
            />
            <el-button
              type="primary"
              :icon="useRenderIcon('ri:add-circle-line')"
              @click="openDialog('新增日记')"
            >
              新增日记
            </el-button>
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
          <el-switch
            v-model="row.is_approved"
            @change="(val: boolean) => handleToggle(row, val)"
          />
        </template>
        <template #operation="{ row }">
          <el-button
            link
            type="primary"
            :icon="useRenderIcon('ri:edit-line')"
            @click="openDialog('修改日记', row)"
          >
            修改
          </el-button>
          <el-popconfirm
            :title="`确认删除这条日记？`"
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

      <template v-if="!loading && dataList.length === 0">
        <el-empty description="还没有日记，点右上角新增一条吧" />
      </template>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="560px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="日记内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="5"
            maxlength="2000"
            show-word-limit
            placeholder="写下今天的舔狗日记..."
          />
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="form.author" placeholder="署名（可选）" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="前台展示">
          <el-switch v-model="form.is_approved" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
