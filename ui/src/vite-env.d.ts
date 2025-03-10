/// <reference types="vite/client" />

// custom env variables here
interface ImportMetaEnv {
  readonly VITE_LLMSVC_API_ROOT: string;
  readonly VITE_LLMSVC_STAGE: string;
  readonly VITE_LLMSVC_DEV_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
