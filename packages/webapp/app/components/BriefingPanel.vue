<script setup lang="ts">
import type { EventReference, RunDetail } from "../types/news";

type Props = {
  runDetail: RunDetail | null;
  runPending: boolean;
};

const props = defineProps<Props>();
const { public: publicConfig } = useRuntimeConfig();
const displayTz = publicConfig.displayTz || "UTC";
const displayTzLabel = publicConfig.displayTzLabel || "UTC";
const isReferenceOpen = ref(false);
const selectedReference = ref<EventReference | null>(null);

function formatUtc(value: string) {
  const date = new Date(value);
  const formatted = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: displayTz,
  }).format(date);
  return `${formatted} (${displayTzLabel})`;
}

function formatReferenceSubtitle(reference: EventReference) {
  if (!reference.publishedAt) return reference.source;
  return `${reference.source} · ${formatUtc(reference.publishedAt)}`;
}

function openReference(reference: EventReference) {
  selectedReference.value = reference;
  isReferenceOpen.value = true;
}

function closeReference() {
  isReferenceOpen.value = false;
  selectedReference.value = null;
}
</script>

<template>
  <v-card
    class="panel-card"
    elevation="1"
  >
    <v-card-title class="headline-font panel-header">
      <div class="briefing-title">
        Briefing
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
                @click="openReference(reference)"
              >
                <v-list-item-title class="headline-font">
                  {{ reference.title }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ formatReferenceSubtitle(reference) }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
      <v-dialog
        v-model="isReferenceOpen"
        width="800"
        @click:outside="closeReference"
      >
        <v-card class="reference-modal">
          <v-card-title class="headline-font">
            {{ selectedReference?.title || "Source" }}
          </v-card-title>
          <v-card-subtitle>
            {{ selectedReference ? formatReferenceSubtitle(selectedReference) : "" }}
          </v-card-subtitle>
          <v-card-text class="reference-body">
            <div v-if="selectedReference?.content">
              {{ selectedReference.content }}
            </div>
            <div
              v-else
              class="text-medium-emphasis"
            >
              No content captured for this source.
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn
              v-if="selectedReference?.link"
              :href="selectedReference.link"
              target="_blank"
              rel="noopener noreferrer"
              variant="tonal"
            >
              Open original
              <v-icon
                icon="mdi-open-in-new"
                size="16"
                class="ml-2"
              />
            </v-btn>
            <v-spacer />
            <v-btn
              variant="text"
              @click="closeReference"
            >
              Close
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
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

.reference-body {
  font-size: 0.95rem;
  line-height: 1.7;
  white-space: pre-wrap;
}

.reference-modal :deep(.v-card-title),
.reference-modal :deep(.v-card-subtitle),
.reference-modal :deep(.v-card-text),
.reference-modal :deep(.v-card-actions) {
  padding-left: 24px;
  padding-right: 24px;
}

.reference-modal :deep(.v-card-title) {
  padding-top: 20px;
}

.reference-modal :deep(.v-card-text) {
  padding-top: 16px;
  padding-bottom: 16px;
}

.reference-modal :deep(.v-card-actions) {
  padding-bottom: 20px;
}

@media (max-width: 960px) {
  .event-summary {
    font-size: 0.98rem;
  }
}
</style>
