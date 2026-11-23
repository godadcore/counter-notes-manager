import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { attachApi } from "./server/attach.js";

export default defineConfig({
  server: {
    host: "::",
    port: 5174,
    strictPort: true
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.PORT || 4174),
    strictPort: true,
    allowedHosts: true
  },
  plugins: [
    react(),
    {
      name: "counter-notes-api",
      configureServer(server) {
        attachApi(server.middlewares);
      },
      configurePreviewServer(server) {
        attachApi(server.middlewares);
      }
    },
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["Logo.png", "Character.png", "Thumbnail.png", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Counter Notes Manager",
        short_name: "Counter Notes",
        description: "Private manager for the Counter Notes YouTube channel.",
        theme_color: "#0F0F0F",
        background_color: "#0F0F0F",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"]
      }
    })
  ]
});
