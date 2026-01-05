<script setup lang="ts">
import { useRuntimeConfig } from "#imports";
import type { RunListItem } from "../types/news";

type Props = {
  runs: RunListItem[];
  activeRunId: string | null;
  runsPending: boolean;
  page: number;
  totalPages: number;
  isDark: boolean;
};

const props = defineProps<Props>();
const { public: publicConfig } = useRuntimeConfig();
const displayTz = publicConfig.displayTz || "UTC";
const displayTzLabel = String(publicConfig.displayTzLabel ?? "").trim();
const emit = defineEmits<{
  (event: "select", id: string): void;
  (event: "update:page", value: number): void;
  (event: "toggle-theme"): void;
}>();

function formatUtc(value: string) {
  const date = new Date(value);
  const formatted = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: displayTz,
  }).format(date);
  return displayTzLabel ? `${formatted} (${displayTzLabel})` : formatted;
}

function selectRun(id: string) {
  emit("select", id);
}
</script>

<template>
  <v-card
    class="panel-card"
    elevation="1"
  >
    <v-card-title class="headline-font panel-header d-flex align-center">
      Reports
      <v-spacer />
      <v-btn
        icon
        variant="text"
        density="compact"
        size="small"
        class="theme-toggle"
        :aria-label="props.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="emit('toggle-theme')"
      >
        <v-icon :icon="props.isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'" />
      </v-btn>
    </v-card-title>
    <v-divider />
    <v-card-text class="report-card-text">
      <div
        v-if="props.runsPending"
        class="pa-6 text-medium-emphasis"
      >
        Loading report list…
      </div>
      <div
        v-else-if="!props.runs.length"
        class="pa-6"
      >
        No reports yet.
      </div>
      <v-list
        v-else
        density="compact"
        class="report-list"
      >
        <v-list-item
          v-for="(run, idx) in props.runs"
          :key="run.id"
          :value="run.id"
          :active="run.id === props.activeRunId"
          @click="selectRun(run.id)"
        >
          <template #prepend>
            <v-icon icon="mdi-clock-outline" />
          </template>
          <v-list-item-title class="headline-font">
            {{ formatUtc(run.createdAt) }}
          </v-list-item-title>
          <v-list-item-subtitle class="run-meta">
            <div>{{ run.eventCount }} events</div>
          </v-list-item-subtitle>
          <template #append>
            <v-chip
              v-if="props.page === 1 && idx === 0"
              size="x-small"
              color="primary"
              variant="flat"
              class="latest-chip"
            >
              Latest
            </v-chip>
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>
    <v-divider />
    <v-card-actions class="justify-center">
      <v-pagination
        v-if="props.totalPages > 1"
        :model-value="props.page"
        :length="props.totalPages"
        :total-visible="10"
        density="compact"
        @update:model-value="emit('update:page', $event)"
      />
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.panel-card {
  background: color-mix(in srgb, var(--app-surface) 92%, transparent);
  border: 1px solid rgba(var(--v-theme-on-background), 0.08);
}

.panel-header {
  min-height: 56px;
  padding: 8px 16px;
}

.theme-toggle {
  height: 32px;
  width: 32px;
}

.report-card-text {
  padding: 0;
}

.run-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.report-list :deep(.v-list-item__spacer) {
  width: 4px;
}

.report-list :deep(.v-list-item__prepend) {
  margin-inline-end: 4px;
}
</style>
