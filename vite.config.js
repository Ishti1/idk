import { defineConfig } from "vite";
import { sites } from "./scripts/vite/sites-vite-plugin.js";

// Bundle the static files and the two API routes into one self-contained Worker.
export default defineConfig({
  publicDir: false,
  plugins: [sites({ mockAuth: false })],
  build: {
    outDir: "dist",
    minify: false,
    lib: { entry: "worker/index.js", formats: ["es"], fileName: () => "server/index.js" }
  }
});
