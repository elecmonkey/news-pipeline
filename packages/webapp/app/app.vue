<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500&display=swap");

:root {
  --app-surface: #ffffff;
  --app-gradient: radial-gradient(
      1200px 500px at 15% 0%,
      rgba(250, 222, 182, 0.35),
      transparent 60%
    ),
    radial-gradient(
      900px 500px at 85% 10%,
      rgba(176, 216, 255, 0.25),
      transparent 65%
    ),
    #f5f3ee;
}

.v-theme--dark {
  --app-surface: #121111;
  --app-gradient: radial-gradient(
      1200px 520px at 15% 0%,
      rgba(20, 60, 90, 0.55),
      transparent 60%
    ),
    radial-gradient(
      900px 500px at 85% 10%,
      rgba(115, 57, 21, 0.35),
      transparent 65%
    ),
    #0b0b0c;
}

body {
  font-family: "Source Serif 4", "Times New Roman", serif;
  background: var(--app-gradient);
}

.headline-font {
  font-family: "Space Grotesk", "Segoe UI", system-ui, sans-serif;
}
</style>
