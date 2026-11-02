import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

// QUIRK: plugin order is load-bearing — see canonical.md.
// vinext() registers @vitejs/plugin-rsc itself since vinext 1.x (as its
// Cloudflare template does); don't add a second rsc() plugin. The cloudflare
// plugin must be told `rsc` is parent and `ssr` is its child environment,
// otherwise the Workers runtime cannot resolve the SSR bundle.
export default defineConfig({
  plugins: [
    vinext(),
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
