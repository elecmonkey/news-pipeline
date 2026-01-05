<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useTheme } from "vuetify";

const theme = useTheme();
const isDark = computed(() => theme.global.current.value.dark);

function setTheme(name: "light" | "dark") {
  theme.global.name.value = name;
  if (import.meta.client) {
    localStorage.setItem("news-theme", name);
  }
}

onMounted(() => {
  const stored = localStorage.getItem("news-theme");
  if (stored === "light" || stored === "dark") {
    setTheme(stored);
  }
});
</script>

<template>
  <v-app class="app-root">
    <v-main class="main">
      <slot />
    </v-main>

    <AppFooter />
  </v-app>
</template>

<style scoped>
.app-root {
  background: var(--app-gradient);
  color: rgb(var(--v-theme-on-background));
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main {
  padding-top: 24px;
  padding-bottom: 48px;
  flex: 1;
}
</style>
