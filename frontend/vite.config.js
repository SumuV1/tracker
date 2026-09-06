import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // podczas `npm run dev` przekierowuje /api na lokalny serwer
  server: { proxy: { "/api": "http://localhost:3000" } },
});
