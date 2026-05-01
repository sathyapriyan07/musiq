import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/deezer-api': {
        target: 'https://api.deezer.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/deezer-api/, ''),
      },
    },
  },
});

