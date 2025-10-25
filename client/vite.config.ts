import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"), // <-- changed from "../shared"
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000", // backend
        target: "http://31.97.63.245:8080/", // VPS backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
