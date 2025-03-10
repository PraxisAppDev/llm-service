export default {
  stage: process.env.LLMSVC_STAGE || "unknown",
  devMode: (process.env.LLMSVC_DEV_MODE || "false") === "true",
  domain: process.env.LLMSVC_DOMAIN || "example.com",
};
