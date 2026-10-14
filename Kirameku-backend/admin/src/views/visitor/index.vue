<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { message } from "@/utils/message";
import {
  getVisitors,
  getVisitorCount,
  getVisitorStats,
  cleanVisitors,
  deleteVisitor,
  clearVisitors
} from "@/api/visitor";
import type { VisitorItem, VisitorStats } from "@/api/visitor";
import type { PaginationProps } from "@pureadmin/table";

defineOptions({ name: "VisitorIndex" });

const loading = ref(false);
const dataList = ref<VisitorItem[]>([]);
/** 数据过滤：all 全部 / human 只看真人 / bot 只看机器人 */
const filter = ref<"all" | "human" | "bot">("all");
const stats = ref<VisitorStats>({
  total: 0,
  bot: 0,
  local: 0,
  duplicate: 0,
  human: 0
});

const pagination = reactive<PaginationProps>({
  total: 0,
  pageSize: 20,
  currentPage: 1,
  background: true
});

const columns: TableColumnList = [
  { label: "ID", prop: "id", width: 60 },
  { label: "IP", prop: "ip", width: 80, slot: "ip" },
  { label: "位置", prop: "location", width: 180, slot: "location" },
  { label: "运营商", prop: "org", minWidth: 120, slot: "org" },
  { label: "ASN", prop: "asn", width: 120, slot: "asn" },
  { label: "网络", prop: "network", width: 80, slot: "network" },
  { label: "性质", prop: "kind", width: 100, slot: "kind" },
  { label: "浏览器", prop: "browser", width: 90 },
  { label: "系统", prop: "os", width: 90 },
  { label: "设备", prop: "device_type", width: 70 },
  { label: "访问页面", prop: "path", minWidth: 160 },
  {
    label: "访问时间",
    prop: "created_at",
    minWidth: 160,
    formatter: ({ created_at }) =>
      created_at ? created_at.replace("T", " ").slice(0, 19) : ""
  },
  {
    label: "操作",
    fixed: "right",
    width: 120,
    slot: "operation"
  }
];

async function onSearch() {
  loading.value = true;
  try {
    const only = filter.value === "all" ? "" : filter.value;
    const [res, countRes, statsRes] = await Promise.all([
      getVisitors({
        page: pagination.currentPage,
        size: pagination.pageSize,
        only
      }),
      getVisitorCount(only),
      getVisitorStats()
    ]);
    dataList.value = res.data ?? [];
    pagination.total = countRes.count;
    stats.value = statsRes.data;
  } finally {
    loading.value = false;
  }
}

function handleFilterChange() {
  pagination.currentPage = 1;
  onSearch();
}

function handleSizeChange(val: number) {
  pagination.pageSize = val;
  pagination.currentPage = 1;
  onSearch();
}

function handleCurrentChange(val: number) {
  pagination.currentPage = val;
  onSearch();
}

async function handleClean(scope: "duplicate" | "local" | "bot") {
  const nameMap = {
    duplicate: "重复数据",
    local: "本机/内网记录",
    bot: "机器人/爬虫记录"
  };
  try {
    const res = await cleanVisitors(scope);
    message(`已清理 ${res.deleted} 条${nameMap[scope]}`, { type: "success" });
    onSearch();
  } catch (e: any) {
    message(e?.message ?? "清理失败", { type: "error" });
  }
}

async function handleDelete(row: VisitorItem) {
  try {
    await deleteVisitor(row.id);
    message("删除成功", { type: "success" });
    onSearch();
  } catch (e: any) {
    message(e?.message ?? "删除失败", { type: "error" });
  }
}

async function handleClear() {
  try {
    await clearVisitors();
    message("已清空", { type: "success" });
    onSearch();
  } catch (e: any) {
    message(e?.message ?? "清空失败", { type: "error" });
  }
}

onMounted(() => onSearch());
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex justify-between items-center flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="font-medium">访客记录</span>
            <el-tag size="small" type="info">共 {{ stats.total }}</el-tag>
            <el-tag size="small" type="success">真人 {{ stats.human }}</el-tag>
            <el-tag v-if="stats.bot" size="small" type="warning">
              机器人 {{ stats.bot }}
            </el-tag>
            <el-tag v-if="stats.local" size="small" type="info">
              本机 {{ stats.local }}
            </el-tag>
            <el-tag v-if="stats.duplicate" size="small" type="danger">
              重复 {{ stats.duplicate }}
            </el-tag>
          </div>
          <el-popconfirm title="确认清空所有访客记录？" @confirm="handleClear">
            <template #reference>
              <el-button type="danger" size="small">清空全部</el-button>
            </template>
          </el-popconfirm>
        </div>
      </template>

      <div class="flex items-center gap-2 mb-3 flex-wrap">
        <el-radio-group v-model="filter" size="small" @change="handleFilterChange">
          <el-radio-button label="all">全部来源</el-radio-button>
          <el-radio-button label="human">只看真人</el-radio-button>
          <el-radio-button label="bot">只看机器人</el-radio-button>
        </el-radio-group>

        <div class="flex-1" />

        <el-popconfirm
          title="清理同一 IP 同一页面 5 分钟内的重复记录？"
          @confirm="handleClean('duplicate')"
        >
          <template #reference>
            <el-button size="small" :disabled="!stats.duplicate">
              清理重复{{ stats.duplicate ? `(${stats.duplicate})` : "" }}
            </el-button>
          </template>
        </el-popconfirm>
        <el-popconfirm
          title="清理本机 / 内网 IP 的访问记录？"
          @confirm="handleClean('local')"
        >
          <template #reference>
            <el-button size="small" :disabled="!stats.local">
              清理本机{{ stats.local ? `(${stats.local})` : "" }}
            </el-button>
          </template>
        </el-popconfirm>
        <el-popconfirm
          title="清理机器人 / 爬虫的访问记录？"
          @confirm="handleClean('bot')"
        >
          <template #reference>
            <el-button size="small" type="warning" :disabled="!stats.bot">
              清理机器人{{ stats.bot ? `(${stats.bot})` : "" }}
            </el-button>
          </template>
        </el-popconfirm>
      </div>

      <pure-table
        :data="dataList"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        align-whole="center"
        row-key="id"
        table-layout="auto"
        @page-size-change="handleSizeChange"
        @page-current-change="handleCurrentChange"
      >
        <template #ip="{ row }">
          <span :title="row.ip" class="ip-cell">{{ row.ip }}</span>
        </template>

        <template #location="{ row }">
          <span class="text-sm">
            {{
              [row.country, row.region, row.city, row.district]
                .filter(Boolean)
                .join(" · ") || "未知"
            }}
          </span>
        </template>

        <template #asn="{ row }">
          <el-tooltip placement="top">
            <template #content>
              <div class="text-xs">{{ row.asn }}</div>
              <div v-if="row.org_cn" class="text-xs mt-1">{{ row.org_cn }}</div>
            </template>
            <span class="asn-cell">{{ row.asn }}</span>
          </el-tooltip>
        </template>

        <template #org="{ row }">
          <el-tooltip placement="top">
            <template #content>
              <div class="text-xs">{{ row.org }}</div>
              <div v-if="row.org_cn" class="text-xs mt-1">{{ row.org_cn }}</div>
              <div class="text-xs mt-1 text-gray-300 break-all">
                {{ row.user_agent }}
              </div>
            </template>
            <span>{{ row.org }}</span>
          </el-tooltip>
        </template>

        <template #network="{ row }">
          <div class="flex gap-1 justify-center">
            <el-tag v-if="row.is_hosting" size="small" type="warning">机房</el-tag>
            <el-tag v-else-if="row.is_mobile" size="small" type="success">移动</el-tag>
            <el-tag v-else size="small">宽带</el-tag>
            <el-tag v-if="row.is_proxy" size="small" type="danger">代理</el-tag>
          </div>
        </template>

        <template #kind="{ row }">
          <div class="flex gap-1 justify-center">
            <el-tag v-if="row.is_bot" size="small" type="warning">机器人</el-tag>
            <el-tag v-else-if="row.is_local" size="small" type="info">本机</el-tag>
            <el-tag v-else size="small" type="success">真人</el-tag>
          </div>
        </template>

        <template #operation="{ row }">
          <el-popconfirm
            title="确认删除这条记录？"
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

<style scoped>
.ip-cell {
  display: inline-block;
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.asn-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
</style>
