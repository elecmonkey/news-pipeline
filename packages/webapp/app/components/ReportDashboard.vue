<script lang="ts" setup>
import { computed, ref, watch, watchEffect } from "vue";
import { useRoute, useRouter } from "#imports";
import { useTheme } from "vuetify";
import type { RunDetail, RunListResponse } from "../types/news";
import { useRunsCache } from "../composables/useRunsCache";

const router = useRouter();
const route = useRoute();
const { getList, setList, getDetail, setDetail } = useRunsCache();

const page = ref(1);
const pageSize = 10;
const activeRunId = ref<string | null>(null);
const theme = useTheme();
const isDark = computed(() => theme.global.current.value.dark);

const routeRunId = computed(() => {
  const value = route.params.id;
  if (Array.isArray(value)) {
    return value[0] || null;
  }
  return value ? String(value) : null;
});

function setTheme(name: "light" | "dark") {
  theme.global.name.value = name;
  if (import.meta.client) {
    localStorage.setItem("news-theme", name);
  }
}

function toggleTheme() {
  setTheme(isDark.value ? "light" : "dark");
}

const runsData = ref<RunListResponse | null>(null);
const runsPending = ref(false);

async function loadRuns(force = false) {
  const cached = getList(page.value, pageSize);
  if (cached && !force) {
    runsData.value = cached;
    return;
  }

  runsPending.value = true;
  try {
    const data = await $fetch<RunListResponse>("/api/runs", {
      query: { page: page.value, pageSize },
    });
    runsData.value = data;
    setList(page.value, pageSize, data);
  } finally {
    runsPending.value = false;
  }
}

await loadRuns();
watch(page, () => {
  void loadRuns();
});

function refreshRuns() {
  void loadRuns(true);
}

watchEffect(() => {
  const runs = runsData.value?.runs ?? [];
  if (routeRunId.value) {
    activeRunId.value = routeRunId.value;
    return;
  }
  if (!runs.length) return;
  if (!activeRunId.value || !runs.find((run) => run.id === activeRunId.value)) {
    const firstRun = runs[0];
    if (firstRun) {
      activeRunId.value = firstRun.id;
    }
  }
});

const runDetail = ref<RunDetail | null>(null);
const runPending = ref(false);

async function loadRunDetail() {
  if (!activeRunId.value) {
    runDetail.value = null;
    return;
  }

  const cached = getDetail(activeRunId.value);
  if (cached) {
    runDetail.value = cached;
    return;
  }

  runPending.value = true;
  try {
    const detail = await $fetch<RunDetail>(`/api/runs/${activeRunId.value}`);
    runDetail.value = detail;
    setDetail(activeRunId.value, detail);
  } finally {
    runPending.value = false;
  }
}

watch(
  activeRunId,
  () => {
    void loadRunDetail();
  },
  { immediate: true }
);

watchEffect(() => {
  const stored = import.meta.client ? localStorage.getItem("news-theme") : null;
  if (stored === "light" || stored === "dark") {
    setTheme(stored);
  }
});

const totalPages = computed(() => runsData.value?.totalPages ?? 1);

function selectRun(id: string) {
  if (routeRunId.value === id) return;
  router.push({ path: `/reports/${id}` });
}
</script>

<template>
  <v-container class="page-grid">
    <v-row>
      <v-col
        cols="12"
        md="5"
        lg="4"
      >
        <ReportsPanel
          :runs="runsData?.runs ?? []"
          :active-run-id="activeRunId"
          :runs-pending="runsPending"
          :page="page"
          :total-pages="totalPages"
          :is-dark="isDark"
          @select="selectRun"
          @refresh="refreshRuns"
          @update:page="page = $event"
          @toggle-theme="toggleTheme"
        />
      </v-col>

      <v-col
        cols="12"
        md="7"
        lg="8"
      >
        <BriefingPanel
          :run-detail="runDetail"
          :run-pending="runPending"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.page-grid {
  max-width: 1440px;
}

@media (max-width: 960px) {
}
</style>
