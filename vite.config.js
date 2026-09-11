import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// If you deploy to GitHub Pages under a repo (not a custom domain / user page),
// set `base` to "/<your-repo-name>/" so built asset paths resolve correctly.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
