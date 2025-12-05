import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { TanStackRouterVite } from "@tanstack/router-vite-plugin"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"
import { nodePolyfills } from "vite-plugin-node-polyfills"

// Resolve the polyfill shims to absolute paths so Rollup can bundle them reliably
const polyfillAliases = Object.fromEntries(
  ["buffer", "global", "process"].map((shim) => [
    `vite-plugin-node-polyfills/shims/${shim}`,
    fileURLToPath(
      new URL(
        `./node_modules/vite-plugin-node-polyfills/shims/${shim}/dist/index.js`,
        import.meta.url,
      ),
    ),
  ]),
) as Record<string, string>

const rootDir = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(rootDir, "src"),
      ...polyfillAliases,
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
})