import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/ws": { target: "ws://localhost:3000", ws: true },
    },
  },
  build: {
    // Generate source maps so production errors are debuggable and Lighthouse
    // stops complaining about missing maps.
    sourcemap: true,
    rollupOptions: {
      output: {
        // Force code splitting per page route so a user visiting /commands
        // doesn't download the casino/lootbox/overlay-editor bundles.
        // Without this Rollup inlines small lazy()-imported pages back into
        // the main bundle (~745 KiB, 69% unused per Lighthouse).
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Keep React in its own chunk so cache survives page-code updates.
            if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
            if (id.includes("socket.io")) return "vendor-socket";
            if (id.includes("lucide-react")) return "vendor-icons";
            return "vendor";
          }
          if (id.includes("/pages/")) {
            if (id.includes("/pages/viewer/")) return "viewer";
            if (id.includes("/pages/casino")) return "casino";
            // Vite has already transformed .tsx/.ts to .js by the time the id
            // hits this function, so match all four extensions.
            const m = id.match(/\/pages\/([^/]+?)(?:\.[jt]sx?|\/)/);
            if (m) return `page-${m[1].toLowerCase()}`;
          }
          if (id.includes("/components/overlay-editor/")) return "overlay-editor";
        },
      },
    },
  },
});
