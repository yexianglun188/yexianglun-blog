<script setup lang="ts">
import { ref, onMounted } from "vue";
import { message as msg } from "@/utils/message";
import {
  searchMusic,
  getSelectedMusic,
  addMusic,
  removeMusic,
  clearMusic,
  PLATFORM_OPTIONS,
  type MusicSearchItem,
  type MusicSelectedItem,
  type MusicPlatform
} from "@/api/musicManage";

defineOptions({ name: "MusicManageIndex" });

// 默认酷我：网易云的搜索索引会过滤掉周杰伦等高版权歌曲的原唱（搜「晴天」只出翻唱），
// 酷我索引完整，能直接搜到原唱。
const keyword = ref("");
const platform = ref<MusicPlatform>("kuwo");
const searching = ref(false);
const searchResults = ref<MusicSearchItem[]>([]);
const selected = ref<MusicSelectedItem[]>([]);
const loading = ref(false);

const selectedColumns: TableColumnList = [
  { label: "歌曲", prop: "name", minWidth: 180 },
  { label: "歌手", prop: "artist", minWidth: 140 },
  { label: "平台", prop: "platform", width: 100, slot: "platform" },
  { label: "歌曲ID", prop: "id", width: 160 },
  { label: "操作", fixed: "right", width: 100, slot: "operation" }
];

const resultColumns: TableColumnList = [
  { label: "歌曲", prop: "name", minWidth: 170 },
  { label: "歌手", prop: "artist", minWidth: 130 },
  { label: "专辑", prop: "album", minWidth: 150 },
  { label: "时长", prop: "duration", width: 80 },
  { label: "操作", fixed: "right", width: 100, slot: "operation" }
];

const platformLabel = (p: string) =>
  PLATFORM_OPTIONS.find((o) => o.value === p)?.label ?? p;

/** 加载已选歌曲 */
async function loadSelected() {
  loading.value = true;
  try {
    selected.value = (await getSelectedMusic()) ?? [];
  } catch {
    selected.value = [];
  } finally {
    loading.value = false;
  }
}

/** 搜索：按当前选择的平台请求后端 */
async function onSearch() {
  const kw = keyword.value.trim();
  if (!kw) {
    msg("请输入歌曲名", { type: "warning" });
    return;
  }
  searching.value = true;
  try {
    const res = await searchMusic(kw, platform.value);
    searchResults.value = res ?? [];
    if (!searchResults.value.length) {
      msg(`在${platformLabel(platform.value)}没有找到相关歌曲`, { type: "warning" });
    }
  } catch (e: any) {
    msg(e?.message || "搜索失败，请检查网络或本地 QQ 音乐服务是否启动", { type: "error" });
    searchResults.value = [];
  } finally {
    searching.value = false;
  }
}

/** 添加：把 platform 一起传给后端落库 */
async function onAdd(row: MusicSearchItem) {
  try {
    const res = await addMusic({
      id: row.id,
      name: row.name,
      artist: row.artist,
      platform: platform.value,
      album: row.album,
      cover: row.cover,
      duration: row.duration
    });
    if (res?.duplicated) {
      msg("这首歌已经在列表里了", { type: "warning" });
    } else {
      msg("已添加，刷新前台页面即可听到", { type: "success" });
    }
    row.added = true;
    await loadSelected();
  } catch (e: any) {
    msg(e?.message || "添加失败", { type: "error" });
  }
}

/** 移除 */
async function onRemove(row: MusicSelectedItem) {
  try {
    await removeMusic(row.id, row.platform);
    msg("已移除", { type: "success" });
    await loadSelected();
    searchResults.value.forEach((r) => {
      if (r.id === row.id && r.platform === row.platform) r.added = false;
    });
  } catch (e: any) {
    msg(e?.message || "移除失败", { type: "error" });
  }
}

/** 清空 */
async function onClear() {
  if (!selected.value.length) {
    msg("列表已经是空的", { type: "warning" });
    return;
  }
  try {
    await clearMusic();
    msg("已清空，将恢复为播放歌单", { type: "success" });
    await loadSelected();
    searchResults.value.forEach((r) => (r.added = false));
  } catch (e: any) {
    msg(e?.message || "清空失败", { type: "error" });
  }
}

onMounted(() => {
  loadSelected();
});
</script>

<template>
  <div>
    <el-card shadow="never" class="mb-4">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">已选歌曲（{{ selected.length }} 首）</span>
          <el-button size="small" type="danger" plain @click="onClear">
            清空
          </el-button>
        </div>
      </template>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="mb-3"
        title="这里的歌曲会排在歌单前面优先播放。播放链接都带时效，所以前台每次播放都会实时取链。改完后刷新前台页面即可生效，无需重启服务。"
      />
      <pure-table
        :data="selected"
        :columns="selectedColumns"
        :loading="loading"
        row-key="id"
        align-whole="center"
      >
        <template #empty>
          <span>还没有添加歌曲，在下面搜索试试</span>
        </template>
        <template #platform="{ row }">
          <el-tag :type="row.platform === 'qq' ? 'warning' : 'success'" size="small">
            {{ platformLabel(row.platform) }}
          </el-tag>
        </template>
        <template #operation="{ row }">
          <el-button link type="danger" size="small" @click="onRemove(row)">
            移除
          </el-button>
        </template>
      </pure-table>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <span class="font-medium">搜索音乐</span>
      </template>
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <el-select v-model="platform" style="width: 140px" placeholder="选择平台">
          <el-option
            v-for="opt in PLATFORM_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-input
          v-model="keyword"
          :placeholder="platform === 'qq' ? '输入歌曲名，QQ 音乐库，例如：晴天' : '输入歌曲名，例如：晴天、起风了'"
          clearable
          style="max-width: 360px"
          @keyup.enter="onSearch"
        />
        <el-button type="primary" :loading="searching" @click="onSearch">
          搜索
        </el-button>
      </div>
      <el-alert
        v-if="platform === 'qq'"
        type="warning"
        :closable="false"
        show-icon
        class="mb-3"
        title="QQ 音乐搜索依赖本地部署的 QQMusicApi 服务（http://localhost:3300）。若搜索报错，请先确认该服务已启动。"
      />
      <pure-table
        :data="searchResults"
        :columns="resultColumns"
        :loading="searching"
        row-key="id"
        align-whole="center"
      >
        <template #empty>
          <span>选择平台、输入歌曲名后点击搜索</span>
        </template>
        <template #operation="{ row }">
          <el-button
            link
            :type="row.added ? 'info' : 'primary'"
            size="small"
            :disabled="row.added"
            @click="onAdd(row)"
          >
            {{ row.added ? "已添加" : "添加" }}
          </el-button>
        </template>
      </pure-table>
    </el-card>
  </div>
</template>
