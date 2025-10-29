/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL_EU: string
  readonly VITE_API_URL_USA: string
  readonly VITE_ENVIRONMENT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
