<template>
  <v-footer class="app-footer">
    <v-container class="footer-content footer-container">
      <div class="footer-main text-caption">
        &copy; {{ new Date().getUTCFullYear() }} News Pipeline by
        <a
          class="footer-link"
          href="https://www.elecmonkey.com"
          target="_blank"
          rel="noopener noreferrer"
        >Elecmonkey</a>.
      </div>
      <div class="footer-meta">
        <v-btn
          class="footer-github"
          icon
          variant="text"
          density="compact"
          size="small"
          href="https://github.com/elecmonkey/news-pipeline"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub repository"
        >
          <v-icon
            icon="mdi-github"
            size="20"
          />
        </v-btn>
      </div>
    </v-container>
  </v-footer>
</template>

<style scoped>
.app-footer {
  border-top: 1px solid rgba(var(--v-theme-on-background), 0.08);
  background: color-mix(in srgb, var(--app-surface) 85%, transparent);
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  flex-wrap: nowrap;
}

.footer-container {
  max-width: 1440px;
  margin: 0 auto;
}

.footer-main {
  line-height: 1.4;
}

.footer-meta {
  display: flex;
  align-items: center;
  opacity: 0.7;
}

.footer-github {
  margin-inline-start: 0;
  padding: 0;
}

.footer-link {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid rgba(var(--v-theme-on-background), 0.35);
}

.footer-link:hover {
  opacity: 0.85;
}

@media (max-width: 600px) {
  .footer-content {
    flex-direction: row;
    align-items: center;
  }

  .footer-meta {
    width: auto;
    justify-content: flex-end;
  }
}
</style>
