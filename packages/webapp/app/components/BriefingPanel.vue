<script setup lang="ts">
import type { RunDetail } from "../types/news";

type Props = {
  runDetail: RunDetail | null;
  runPending: boolean;
};

const props = defineProps<Props>();
const { public: publicConfig } = useRuntimeConfig();
const displayTz = publicConfig.displayTz || "UTC";
const displayTzLabel = publicConfig.displayTzLabel || "UTC";

function formatUtc(value: string) {
  const date = new Date(value);
  const formatted = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: displayTz,
  }).format(date);
  return `${formatted} (${displayTzLabel})`;
}
</script>

<template>
  <v-card
    class="panel-card"
    elevation="1"
  >
    <v-card-title class="headline-font panel-header">
      <div class="briefing-title">
        Latest briefing
      </div>
    </v-card-title>
    <v-divider />
    <v-card-text>
      <div
        v-if="props.runDetail"
        class="briefing-meta"
        style="padding-bottom: 10px;"
      >
        <div>Generated at {{ formatUtc(props.runDetail.createdAt) }}</div>
        <div>
          Window: {{ formatUtc(props.runDetail.windowStart) }} →
          {{ formatUtc(props.runDetail.windowEnd) }}
        </div>
      </div>
      <div
        v-if="props.runPending"
        class="py-8 text-medium-emphasis"
      >
        Loading events…
      </div>
      <div
        v-else-if="!props.runDetail?.events.length"
        class="py-8"
      >
        No events in this run.
      </div>
      <v-expansion-panels
        v-else
        variant="accordion"
        class="event-panels"
      >
        <v-expansion-panel
          v-for="event in props.runDetail.events"
          :key="event.id"
        >
          <v-expansion-panel-title ripple>
            <div class="event-title">
              <div class="headline-font">
                {{ event.title }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ formatUtc(event.createdAt) }} ·
                {{ event.references.length }} sources
              </div>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="event-summary">
              {{ event.summary }}
            </div>
            <v-divider class="my-4" />
            <div class="text-caption text-medium-emphasis mb-2">
              Sources
            </div>
            <v-list density="compact">
              <v-list-item
                v-for="reference in event.references"
                :key="reference.link"
                :href="reference.link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <v-list-item-title class="headline-font">
                  {{ reference.title }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ reference.source }}
                </v-list-item-subtitle>
                <template #append>
                  <v-icon
                    icon="mdi-open-in-new"
                    size="16"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.panel-card {
  background: color-mix(in srgb, var(--app-surface) 92%, transparent);
  border: 1px solid rgba(var(--v-theme-on-background), 0.08);
}

.event-panels :deep(.v-expansion-panel-title) {
  padding: 16px 20px;
}

.event-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.event-summary {
  font-size: 1.02rem;
  line-height: 1.7;
}

.panel-header {
  min-height: 56px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.briefing-title {
  line-height: 1.2;
}

.briefing-meta {
  font-size: 0.78rem;
  line-height: 1.2;
  color: rgba(var(--v-theme-on-background), 0.65);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

@media (max-width: 960px) {
  .event-summary {
    font-size: 0.98rem;
  }
}
</style>
