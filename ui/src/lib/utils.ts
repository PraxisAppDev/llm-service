import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { version } from "../../package.json";

export const env = {
  version,
  stage: import.meta.env.VITE_LLMSVC_STAGE || "unknown",
  devMode: (import.meta.env.VITE_LLMSVC_DEV_MODE || "false") === "true",
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function appVersion() {
  return env.devMode ? `v${env.version}-dev` : `v${version}`;
}
