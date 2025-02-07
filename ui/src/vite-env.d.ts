/// <reference types="vite/client" />

// custom env variables here
interface ImportMetaEnv {
  readonly VITE_LLMSVC_API_ROOT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
