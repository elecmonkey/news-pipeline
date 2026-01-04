<script lang="ts" setup>
import { computed, ref, watch, watchEffect } from "vue";
import { useTheme } from "vuetify";
import type { RunDetail, RunListResponse } from "../types/news";

const page = ref(1);
const pageSize = 10;
const activeRunId = ref<string | null>(null);
const theme = useTheme();
const isDark = computed(() => theme.global.current.value.dark);

function setTheme(name: "light" | "dark") {
  theme.global.name.value = name;
  if (import.meta.client) {
    localStorage.setItem("news-theme", name);
  }
}

function toggleTheme() {
  setTheme(isDark.value ? "light" : "dark");
}

const { data: runsData, pending: runsPending } = await useFetch<RunListResponse>(
  "/api/runs",
  {
    query: computed(() => ({ page: page.value, pageSize })),
    watch: [page],
  }
);

watchEffect(() => {
  const runs = runsData.value?.runs ?? [];
  if (!runs.length) return;
  if (!activeRunId.value || !runs.find((run) => run.id === activeRunId.value)) {
    if (runs[0]) {
      activeRunId.value = runs[0].id;
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

  runPending.value = true;
  try {
    runDetail.value = await $fetch<RunDetail>(`/api/runs/${activeRunId.value}`);
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
  activeRunId.value = id;
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
