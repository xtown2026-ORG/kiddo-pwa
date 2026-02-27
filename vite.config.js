import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const localApiTarget = env.VITE_LOCAL_API_TARGET || "http://localhost:3002";

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "favicon.ico",
          "apple-touch-icon.png",
          "safari-pinned-tab.svg",
        ],
        manifest: {
          name: "Kiddo ERP",
          short_name: "Kiddo",
          description: "Kiddo ERP PWA",
          theme_color: "#1976d2",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/login",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
        },
      }),
    ],

    server: {
      host: "0.0.0.0",
      port: 5174,
      strictPort: true,
      proxy: {
        "/api": {
          target: localApiTarget,
          changeOrigin: true,
          secure: false,
        },
        "/socket.io": {
          target: localApiTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  };
});