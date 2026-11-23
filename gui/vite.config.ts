import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// One frontend, two targets. The default is the Tauri desktop app; with
// CLINCALC_TARGET=web (set by s/web-build and s/web-dev) the same frontend is
// built for the browser, with `clincalc-wasm` resolving to the engine compiled
// to WebAssembly instead of a stub the desktop never calls.
const web = process.env.CLINCALC_TARGET === "web";

const wasmModule = web
  ? "../clincalc-wasm/pkg/clincalc_wasm.js"
  : "./src/api/wasm-unavailable.ts";

export default defineConfig({
  plugins: [react()],

  // Relative asset URLs serve both targets: Tauri loads the bundle from app
  // resources rather than an origin root, and the web build is deployed under
  // a subpath of the Pages site (/clincalc/try/).
  base: "./",

  resolve: {
    alias: {
      "clincalc-wasm": fileURLToPath(new URL(wasmModule, import.meta.url)),
    },
  },

  // Prevent Vite from clearing the screen so we can see Rust compiler errors.
  clearScreen: false,

  server: {
    // Distinct ports so the desktop and web dev servers can run side by side.
    port: web ? 5174 : 5173,
    strictPort: true,
    host: "127.0.0.1",
    watch: {
      // Tell Vite to ignore watching the Rust source tree; tauri's own dev
      // watcher rebuilds the backend separately.
      ignored: ["**/src-tauri/**"],
    },
    // The WebAssembly package is built outside the gui/ root.
    fs: { allow: [".", "../clincalc-wasm/pkg"] },
  },

  build: {
    target: "es2022",
    minify: !process.env.TAURI_DEBUG ? "oxc" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
