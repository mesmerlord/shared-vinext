import vinext from "vinext";
import rsc from "@vitejs/plugin-rsc";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

// QUIRK: plugin order + virtual entry IDs are load-bearing — see canonical.md.
// vinext({ rsc: false }) paired with explicit @vitejs/plugin-rsc is required at
// vinext 0.0.34. The RSC plugin is wired with three magic virtual entry IDs
// (virtual:vinext-rsc-entry, virtual:vinext-app-ssr-entry,
// virtual:vinext-app-browser-entry). These are framework-internal contracts —
// copy verbatim. The cloudflare plugin must be told `rsc` is parent and `ssr`
// is its child environment, otherwise the Workers runtime cannot resolve the
// SSR bundle.
export default defineConfig({
  plugins: [
    vinext({ rsc: false }),
    rsc({
      entries: {
        rsc: "virtual:vinext-rsc-entry",
        ssr: "virtual:vinext-app-ssr-entry",
        client: "virtual:vinext-app-browser-entry",
      },
    }),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
  server: {
    port: 3010,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
