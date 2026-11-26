/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL pública do site, usada nas metatags Open Graph. Ver src/routes/__root.tsx. */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
