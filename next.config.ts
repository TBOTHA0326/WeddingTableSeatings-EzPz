import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Paper.js carries Node-only fallbacks that never run here (it only runs on a click in the browser),
  // and they name jsdom modules we don't install.
  turbopack: {
    resolveAlias: {
      "jsdom/lib/generated/idl/utils": "paper/dist/node/browser.js",
      "jsdom/lib/jsdom/living/generated/utils": "paper/dist/node/browser.js",
    },
  },
};
export default nextConfig;
